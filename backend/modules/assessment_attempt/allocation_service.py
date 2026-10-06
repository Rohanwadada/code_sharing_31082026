import logging
import random
from typing import Any

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from user_agents import parse as ua_parse

from core.exception import AppException, BadRequestException, ForbiddenException
from modules.assessment.model import McqQuestion
from modules.assessment.schema import AssessmentAllocationMode
from modules.assessment.service import AssessmentService, get_assessment_service
from modules.assessment_attempt.encryption import (
    encrypt_allocation_id,
    generate_exam_allocation_id,
)
from modules.assessment_attempt.model import AllocatedExams, Submissions
from modules.assessment_attempt.schema import AllocateExam, AssessmentType
from modules.roadmap_learning_assessment.model import (
    RoadmapLearningAssessment,
    RoadmapLearningAssessmentQuestions,
)
from modules.roadmap_learning_assessment.service import get_assessment_details
from modules.user.model import UserDetails
from shared.db.dependencies import get_db

logger = logging.getLogger(__name__)


class ExamAllocationService:
    def __init__(self, db: AsyncSession, assessment_service: AssessmentService) -> None:
        self.db = db
        self.assessment_service = assessment_service

    async def allocate_exam(
        self, user: UserDetails, data: AllocateExam, user_agent_string: str
    ):
        assessment_info = None

        if data.assessment_type == AssessmentType.SKILL_GAP_ASSESSMENT:
            assessment_info = await self.assessment_service.get_assessment_details(
                user_email=user.user_email,
                organization_id=data.organization_id,
                assessment_id=data.assessment_id,
                project_id=data.project_id,
            )

        elif data.assessment_type == AssessmentType.ROADMAP_LEARNING_ASSESSMENT:
            if not data.roadmap_id:
                raise BadRequestException("Invalid roadmap")

            assessment_info = await get_assessment_details(
                user_id=user.user_id,
                organization_id=data.organization_id,
                roadmap_id=data.roadmap_id,
                assessment_id=data.assessment_id,
                db=self.db,
            )

        if not assessment_info:
            raise AppException("Something went wrong")

        await self.check_appearence_limit(
            user_id=user.user_id,
            assessment_id=data.assessment_id,
            appearence_limit=assessment_info["appearence_limit"],
        )

        # create allocation question set: different for different exam type
        question_set = []
        if data.assessment_type == AssessmentType.SKILL_GAP_ASSESSMENT:
            question_set = await self.get_skill_gap_assessment_question_set(
                assessment_info["items"], assessment_info["allocation_type"]
            )
            # logger.info(f"[QUESTION SET]: {question_set}")
        elif data.assessment_type == AssessmentType.ROADMAP_LEARNING_ASSESSMENT:
            question_set = await self.get_roadmap_assessment_question_set(
                assessment_id=data.assessment_id
            )

        allocated_questions = [question["question_id"] for question in question_set]

        #  save to db
        allocation_id = generate_exam_allocation_id(user.user_id, data.assessment_id)
        encrypted_allocation_id = encrypt_allocation_id(allocation_id)
        total_duration = len(allocated_questions) * 60
        exam_language = "en-US"

        allocated_exam = AllocatedExams(
            allocation_id=allocation_id,
            user_id=user.user_id,
            exam_id=data.assessment_id,
            allocated_questions=allocated_questions,
            total_questions=len(allocated_questions),
            complexity_distribution={},
            exam_duration=total_duration,
            test_language=exam_language,
            assessment_type=data.assessment_type
        )

        self.db.add(allocated_exam)
        await self.db.commit()

        device_info, browser_info, os_info = self.parse_user_agent(
            user_agent_string=user_agent_string
        )

        return {
            "status": "success",
            "exam_name": assessment_info['exam_name'],
            "allocation_id": encrypted_allocation_id,
            "allocated_questions": question_set,
            "total_questions": len(allocated_questions),
            "total_marks": len(allocated_questions),
            "exam_duration_in_seconds": total_duration,
            "allowed_tab_toggle_time": assessment_info.get(
                "allowed_tab_toggle_time", 0
            ),
            "device_info": device_info,
            "browser_info": browser_info,
            "os_info": os_info,
            "message": "Exam allocated successfully",
            "code": 200,
        }

    async def check_appearence_limit(
        self, user_id: str, assessment_id: str, appearence_limit: int = 999
    ):
        user_all_allocated_exams = (
            await self.db.scalars(
                select(AllocatedExams).where(
                    AllocatedExams.exam_id == assessment_id,
                    AllocatedExams.user_id == user_id,
                )
            )
        ).all()
        user_allocation_ids = [a.allocation_id for a in user_all_allocated_exams]

        submission_count = (
            await self.db.scalar(
                select(func.count())
                .select_from(Submissions)
                .where(Submissions.allocation_id.in_(user_allocation_ids))
            )
            or 0
        )

        if submission_count >= appearence_limit:
            raise ForbiddenException(
                "You have reached the appearance limit and cannot take this exam anymore."
            )

    async def get_skill_gap_assessment_question_set(
        self, items: list[dict[str, Any]], allocation_type: dict[str, Any]
    ):

        allocation_mode = allocation_type.get("mode", AssessmentAllocationMode.STATIC)
        to_shuffle = allocation_type.get("shuffle", True)

        question_id_set = []

        for item in items:
            sub_comptency_id = item["sub_competency_id"]
            competency_id = item["competency_id"]
            sub_competency_question_ids = item["question_ids"]
            sub_competency_priority = item.get("priority", 'must have')

            selected_question_ids = (
                sub_competency_question_ids
                if allocation_mode == AssessmentAllocationMode.STATIC
                else random.sample(sub_competency_question_ids, min(3, len(sub_competency_question_ids)))
            )

            question_id_set.extend(
                [
                    {
                        "competency_id": competency_id,
                        "sub_competency_id": sub_comptency_id,
                        "priority": sub_competency_priority,
                        "question_id": question_id,
                    }
                    for question_id in selected_question_ids
                ]
            )

        # hydrate the list to get all the select question details

        questions = []
        for q in question_id_set:
            question = await self.db.scalar(
                select(McqQuestion).where(
                    McqQuestion.competency_id == q["competency_id"],
                    McqQuestion.subcompetency_id == q["sub_competency_id"],
                    McqQuestion.mcq_question_id == q["question_id"],
                )
            )

            if not question:
                raise AppException("Something went wrong. Please try again later")

            raw_code = question.code_snippets
            clean_code = (
                str(raw_code).strip()
                if (raw_code and str(raw_code).strip().lower() not in ["null", "none", "nan", "undefined", ""])
                else None
            )
            raw_hint = question.hints_text
            clean_hint = (
                str(raw_hint).strip()
                if (raw_hint and str(raw_hint).strip().lower() not in ["null", "none", "nan", "undefined", ""])
                else None
            )

            question_details = {
                "question_id": question.mcq_question_id,
                "question_text": question.question_text,
                "question_type": question.question_type or "mcq",
                "question_marks": 1,
                "question_code": clean_code,
                "question_hints": clean_hint,
                "options": [
                    question.option_1,
                    question.option_2,
                    question.option_3,
                    question.option_4,
                ],
                "priority": q["priority"]
                if question.question_type in ["mcq", "moq"]
                else [],
            }

            questions.append(question_details)

        # if to_shuffle:
        #     random.shuffle(questions)

        final_questions = self.perform_priority_based_shuffling(questions=questions, shuffle=to_shuffle)

        return final_questions

    async def get_roadmap_assessment_question_set(self, assessment_id: str):
        all_questions = (
            await self.db.scalars(
                select(RoadmapLearningAssessmentQuestions).where(
                    RoadmapLearningAssessmentQuestions.assessment_id == assessment_id
                )
            )
        ).all()

        questions = []
        for q in all_questions:
            if not q:
                raise AppException("Something went wrong. Please try again later")

            raw_code = q.code_snippets
            clean_code = (
                str(raw_code).strip()
                if (raw_code and str(raw_code).strip().lower() not in ["null", "none", "nan", "undefined", ""])
                else None
            )
            raw_hint = q.hints_text
            clean_hint = (
                str(raw_hint).strip()
                if (raw_hint and str(raw_hint).strip().lower() not in ["null", "none", "nan", "undefined", ""])
                else None
            )

            questions.append(
                {
                    "question_id": q.question_id,
                    "question_text": q.question_text,
                    "question_type": q.question_type or "mcq",
                    "question_marks": 1,
                    "question_code": clean_code,
                    "question_hints": clean_hint,
                    "options": [q.option_1, q.option_2, q.option_3, q.option_4]
                    if q.question_type in ["mcq", "moq"]
                    else [],
                }
            )

        random.shuffle(questions)

        if len(questions) == 0:
            raise BadRequestException("Something went wrong. Please contact administrator")

        return questions


    def perform_priority_based_shuffling(self, questions: list[dict], shuffle: bool = False) -> list[dict]:
        from modules.assessment.schema import SubCompetencyPriority

        priority_order = {
            SubCompetencyPriority.MUST_HAVE: 0,
            SubCompetencyPriority.GOOD_TO_HAVE: 1,
            SubCompetencyPriority.ICING_ON_THE_CAKE: 2,
        }

        buckets: dict[int, list[dict]] = {0: [], 1: [], 2: []}
        for q in questions:
            key = priority_order.get(q.get("priority", "must have"), 2)
            buckets[key].append(q)

        result = []
        for key in (0, 1, 2):
            group = buckets[key]
            # logger.info(f"[GROUP]: {group}")
            if shuffle:
                random.shuffle(group)
            result.extend(group)

        
        # logger.info(f"[RESULT AFTER PS]: {result}")
        return result

    def parse_user_agent(self, user_agent_string: str):
        # Parse user-agent
        ua = ua_parse(user_agent_string)
        browser_info = ua.browser.family + " " + ua.browser.version_string
        os_info = ua.os.family + " " + ua.os.version_string
        device_info = ua.device.family if ua.device.family else "Unknown Device"

        return browser_info, os_info, device_info


async def get_exam_allocation_service(db: AsyncSession = Depends(get_db), assessment_service: AssessmentService = Depends(get_assessment_service)):
    return ExamAllocationService(db=db, assessment_service=assessment_service)