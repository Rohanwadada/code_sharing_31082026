import io
import logging
from typing import Any

import pandas as pd
from fastapi import Depends, UploadFile
from sqlalchemy import and_, inspect, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from core.exception import BadRequestException, ForbiddenException, NotFoundException
from core.time import get_current_epoch, get_current_timestamp
from modules.assessment.assessment_access.model import UserAssessmentAccess
from modules.assessment.model import (
    AssessmentFormation,
    Competency,
    McqQuestion,
    ProjectAssessmentMap,
    Subcompetency,
)
from modules.assessment.schema import (
    AssessmentAllocationMode,
    CreateAssessment,
    QuestionGroup,
    UpdateAssessment,
)
from modules.assessment_attempt.schema import ExamDetails
from modules.project.model import Project
from modules.user.model import UserDetails
from shared.db.dependencies import get_db
import uuid_utils as uuid
from core.config import settings
import secrets

logger = logging.getLogger(__name__)

EXPECTED_COLUMNS = [
    "ID",
    "question_text",
    "question_type",
    "option_1",
    "option_2",
    "option_3",
    "option_4",
    "correct_option_text",
    "another_correct_option_text",
    "complexity",
    "key_competency",
    "sub_competency",
    "topic",
    "subtopic",
    "code_snippets",
    "hints_text",
    "marks",
    "solution_explanation",
]


def _read_questions_file(filename: str, content: bytes) -> list[dict]:
    lowered = (filename or "").lower()

    try:
        if lowered.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif lowered.endswith((".xlsx", ".xlsm")):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        elif lowered.endswith(".xls"):
            raise BadRequestException(
                "Legacy .xls files are not supported. Please upload .xlsx or .csv"
            )
        else:
            raise BadRequestException(
                "Unsupported file type. Please upload a .csv or .xlsx file"
            )
    except BadRequestException:
        raise
    except Exception as exc:
        raise BadRequestException(f"Could not parse file: {exc}") from exc

    if df is None or df.empty:
        return []

    df.columns = [str(column).strip() for column in df.columns]
    return df.fillna("").to_dict(orient="records")


DURATION_BY_COMPLEXITY = {
    "easy": 1,
    "medium": 2,
    "hard": 3,
}
DEFAULT_DURATION_MINUTES = 2


def _group_questions(questions: list[dict]) -> list[dict]:
    groups: dict[tuple[str, str], list[dict]] = {}

    for question in questions:
        question["source"] = "self"
        competency = (question.get("key_competency") or "").strip()
        subcompetency = (question.get("sub_competency") or "").strip()
        groups.setdefault((competency, subcompetency), []).append(question)

    return [
        {
            "competency": competency,
            "sub_competency": subcompetency,
            "competency_definition": "",
            "sub_competency_definition": "",
            "priority": "must have",
            "questions_count": len(question_list),
            "questions": question_list,
            "add_to_test": True,
        }
        for (competency, subcompetency), question_list in groups.items()
    ]


def _estimate_total_duration_minutes(questions: list[dict]) -> int:
    total = 0
    for question in questions:
        complexity = (question.get("complexity") or "").strip().lower()
        total += DURATION_BY_COMPLEXITY.get(complexity, DEFAULT_DURATION_MINUTES)
    return total


def _format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    value = float(size_bytes)
    for unit in ("KB", "MB", "GB"):
        value /= 1024
        if value < 1024:
            return f"{value:.1f} {unit}"
    return f"{value:.1f} TB"


class AssessmentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def process_uploaded_questions_file(
        self, file: UploadFile, data: dict | None = None
    ) -> dict:
        content = await file.read()
        questions = _read_questions_file(file.filename, content)  # type: ignore
        grouped_questions = _group_questions(questions)

        competencies = {
            (question.get("key_competency") or "").strip() for question in questions
        }
        subcompetencies = {
            (
                (question.get("key_competency") or "").strip(),
                (question.get("sub_competency") or "").strip(),
            )
            for question in questions
        }

        return {
            "data": data,
            "file": {
                "filename": file.filename,
                "file_size_bytes": len(content),
                "file_size_display": _format_file_size(len(content)),
            },
            "items": grouped_questions,
            "summary": {
                "total_competencies": len(competencies),
                "total_sub_competencies": len(subcompetencies),
                "selected_sub_competencies": len(subcompetencies),
                "total_questions": len(questions),
                "total_estimated_duration_minutes": len(questions),
            },
        }

    async def create_assessment(self, user: UserDetails, data: CreateAssessment):
        # first create the questions in `mca_questions table`
        # While creating if the competency and subcompetency not present then create them first
        # Then add the question ids to the `grouped_questions.questions` list

        user_id = user.user_id
        user_name = user.user_name
        user_email = user.user_email
        # #changes 28-09-2026 - start: Sanitize organization_id to prevent UUID DataError with empty strings
        # organization_id = data.organization_id
        project_id = data.project_id

        project = await self.db.scalar(select(Project).where(Project.project_id == project_id))
        if not project:
            raise BadRequestException("Invalid project")

        raw_org = data.organization_id
        organization_id = (
            str(raw_org).strip()
            if raw_org and str(raw_org).strip()
            else (str(project.organization_id) if project and project.organization_id else None)
        )
        # #changes 28-09-2026 - end

        # competency_subcompetency_priority = defaultdict(dict)

        # for group in data.question_groups:
        #     competency_subcompetency_priority[group.competency][group.sub_competency] = (
        #         group.priority
        #     )

        assessment_id = str(uuid.uuid4())
        assessment_details = {
            "allocation_type": {"mode": "static", "shuffle": False},
            "items": [],
            "source": data.source,
            "exam_status": "active",
            "exam_url": f"{settings.site_base_url}/assessment/skill-gap-assessment/{assessment_id}?p={data.project_id}"
        }

        updated_items, active_question_count = await self.process_question_groups(
            question_groups=data.items,
            user_id=user_id,
            organization_id=organization_id,
            assessment_details=assessment_details,
        )

        assessment_details["items"] = updated_items

        # create the assessment row in db

        new_assessment = AssessmentFormation(
            assessment_formation_id=assessment_id,
            assessment_formation_name=f"{project.project_name}_Skill gap assessment_{secrets.token_urlsafe(5)}",
            assessment_duration=active_question_count,
            assessment_details=assessment_details,
            curate_flow_node_id=None,
            designation_id=None,
            function_id=None,
            organization_id=organization_id,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(new_assessment)
        await self.db.commit()
        await self.db.refresh(new_assessment)

        # Add assessment formation to project
        await self.add_assessment_to_project(
            new_assessment.assessment_formation_id,
            project_id=data.project_id,
            user_id=user_id,
        )

        # give the user assessment access also
        new_access_id = str(uuid.uuid4())
        record = UserAssessmentAccess(
            access_id=new_access_id,
            assessment_id=assessment_id,
            user_email=user_email,
            user_name=user_name or "Candidate",
            organization_id=organization_id,
            access_status="GRANTED",
            granted_by=user_id,
            granted_at=get_current_timestamp(),
            access_details={},
        )
        self.db.add(record)
        await self.db.commit()
        
        return {
            "id": new_assessment.assessment_formation_id,
            "details": new_assessment.assessment_details,
        }

    async def create_competency(
        self,
        competency_name: str,
        organization_id: str,
        user_id: str,
        source_of_competency: str,
        competency_description: str = "",
    ) -> Competency:
        # existing_competency = await self.db.scalar(
        #     select(Competency).where(
        #         Competency.competency_name == competency_name,
        #         Competency.organization_id == organization_id,
        #     )
        # )
        # if existing_competency:
        #     logger.info(
        #         f"Found existing competency with id: {existing_competency.competency_id}"
        #     )
        #     return existing_competency

        logger.info("Creating new competency...")
        new_competency = Competency(
            competency_name=competency_name,
            competency_description=competency_description,
            source_of_competency=source_of_competency,
            organization_id=organization_id,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(new_competency)
        await self.db.commit()
        await self.db.refresh(new_competency)

        return new_competency

    async def create_sub_competency(
        self,
        competency_id: str,
        sub_competency_name: str,
        organization_id: str,
        user_id: str,
        source_of_subcompetency: str,
        sub_competency_description: str = "",
    ) -> Subcompetency:
        # existing_sub_competency = await self.db.scalar(
        #     select(Subcompetency).where(
        #         Subcompetency.subcompetency_name == sub_competency_name,
        #         Subcompetency.competency_id == competency_id,
        #         Subcompetency.organization_id == organization_id,
        #     )
        # )
        # if existing_sub_competency:
        #     logger.info(
        #         f"Found existing competency with id: {existing_sub_competency.subcompetency_id}"
        #     )
        #     return existing_sub_competency

        logger.info("Creating new sub-competency...")
        new_competency = Subcompetency(
            competency_id=competency_id,
            subcompetency_name=sub_competency_name,
            subcompetency_description=sub_competency_description,
            source_of_subcompetency=source_of_subcompetency,
            organization_id=organization_id,
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(new_competency)
        await self.db.commit()
        await self.db.refresh(new_competency)

        return new_competency

    async def create_question(
        self,
        user_id: str,
        organization_id: str,
        competency_id: str,
        sub_competency_id: str,
        data: dict[str, Any],
    ):
        # #changes 28-09-2026 - start: Safe dictionary access for uploaded question fields
        # new_question = McqQuestion(
        #     question_text=data["question_text"],
        #     option_1=data["option_1"],
        #     option_2=data["option_2"],
        #     option_3=data["option_3"],
        #     option_4=data["option_4"],
        #     correct_option_text=data["correct_option_text"],
        #     competency_id=competency_id,
        #     subcompetency_id=sub_competency_id,
        #     organization_id=organization_id,
        #     hints_text=data["hints_text"],
        #     code_snippets=data["code_snippets"],
        #     marks=data["marks"],
        #     source_of_question=data["source"],
        #     question_status="active",
        #     question_details=data.get("question_details", {}),
        #     created_by=user_id,
        #     updated_by=user_id,
        # )
        raw_marks = data.get("marks") if isinstance(data, dict) else getattr(data, "marks", 1)
        try:
            marks = int(float(raw_marks)) if raw_marks is not None and str(raw_marks).strip() else 1
        except (ValueError, TypeError):
            marks = 1

        def clean_uuid(val):
            if val is None:
                return None
            s = str(val).strip()
            return s if s and s.lower() not in {"null", "none", "undefined", ""} else None

        q_text = data.get("question_text") or data.get("question") or ""

        new_question = McqQuestion(
            question_text=q_text,
            option_1=data.get("option_1", "") or "",
            option_2=data.get("option_2", "") or "",
            option_3=data.get("option_3", "") or "",
            option_4=data.get("option_4", "") or "",
            correct_option_text=data.get("correct_option_text", "") or "",
            competency_id=clean_uuid(competency_id),
            subcompetency_id=clean_uuid(sub_competency_id),
            organization_id=clean_uuid(organization_id),
            hints_text=data.get("hints_text") or "",
            code_snippets=data.get("code_snippets") or "",
            marks=marks,
            source_of_question=data.get("source") or "self",
            question_status="active",
            question_details=data.get("question_details", {}) or {},
            created_by=clean_uuid(user_id),
            updated_by=clean_uuid(user_id),
        )

        self.db.add(new_question)
        await self.db.commit()
        await self.db.refresh(new_question)

        logger.info(
            f"Created new question: {new_question.mcq_question_id} :: Text: {q_text[:50]}"
        )

        return new_question

    async def process_question_groups(
        self,
        question_groups: list[QuestionGroup],
        user_id: str,
        organization_id: str,
        assessment_details: dict[str, Any],
    ):
        competency_map = {}
        sub_competency_map = {}
        items = []
        active_question_count = 0

        for question_group in question_groups:
            competency_name = question_group.competency
            sub_competency_name = question_group.sub_competency
            competency_description = question_group.competency_definition
            sub_competency_description = question_group.sub_competency_definition
            questions = question_group.questions

            # if not question_group.add_to_test:
            #     logger.info(
            #         f"Skipping: {competency_name} :: {sub_competency_name} as not active"
            #     )

            #     group_dict = question_group.model_dump()
            #     assessment_details["question_groups"].append(group_dict)

            #     continue

            question_ids = []

            competency_id = competency_map.get(competency_name)
            sub_competency_key = (competency_name, sub_competency_name)

            if competency_id is None and question_group.competency_id:
                competency_id = question_group.competency_id
                competency_map[competency_name] = competency_id

            if competency_id is None:
                competency = await self.create_competency(
                    competency_name=competency_name,
                    competency_description=competency_description,
                    organization_id=organization_id,
                    user_id=user_id,
                    source_of_competency=assessment_details["source"],
                )
                competency_id = competency.competency_id
                competency_map[competency_name] = competency_id

            cached_sub_competency = sub_competency_map.get(sub_competency_key)

            if cached_sub_competency:
                sub_competency_id = cached_sub_competency["subcompetency_id"]
            elif question_group.sub_competency_id:
                sub_competency_id = question_group.sub_competency_id
                sub_competency_map[sub_competency_key] = {
                    "competency_id": competency_id,
                    "subcompetency_id": sub_competency_id,
                }
            else:
                sub_competency = await self.create_sub_competency(
                    sub_competency_name=sub_competency_name,
                    sub_competency_description=sub_competency_description,
                    competency_id=competency_id,
                    organization_id=organization_id,
                    user_id=user_id,
                    source_of_subcompetency=assessment_details["source"],
                )

                sub_competency_id = sub_competency.subcompetency_id
                sub_competency_map[sub_competency_key] = {
                    "competency_id": competency_id,
                    "subcompetency_id": sub_competency_id,
                }

            for question in questions:
                new_question = await self.create_question(
                    user_id=user_id,
                    organization_id=organization_id,
                    competency_id=competency_id,
                    sub_competency_id=sub_competency_id,
                    data=question,
                )

                question_ids.append(new_question.mcq_question_id)

                if question_group.add_to_test:
                    active_question_count += 1

            group_dict = question_group.model_dump()
            group_dict["question_ids"] = question_ids
            group_dict["competency_id"] = competency_id
            group_dict["sub_competency_id"] = sub_competency_id
            group_dict.pop("questions")

            items.append(group_dict)

        logger.info("Question groups processed")
        return items, active_question_count

    async def update_assessment(
        self, assessment_id: str, user_id: str, data: UpdateAssessment
    ) -> dict:
        assessment = await self.db.scalar(
            select(AssessmentFormation).where(
                AssessmentFormation.assessment_formation_id == assessment_id
            )
        )
        if not assessment:
            raise BadRequestException("Assessment not found")

        details = assessment.assessment_details or {}

        if data.allocation_mode == AssessmentAllocationMode.RANDOMIZED:
            logger.info("Randomized mode provided")
            details["allocation_type"] = {"mode": "randomized"}
        elif data.allocation_mode == AssessmentAllocationMode.STATIC:
            details["allocation_type"] = {"mode": "static"}
            if data.shuffle:
                details["allocation_type"]["shuffle"] = data.shuffle

        updated_items, active_question_count = [], 0
        if data.items:
            updated_items, active_question_count = await self.process_question_groups(
                question_groups=data.items,
                user_id=user_id,
                organization_id=data.organization_id,
                assessment_details=details,
            )

            details["items"] = updated_items
            assessment.assessment_duration = active_question_count

        print(f"Updated details: {details}")

        assessment.assessment_details = details
        assessment.updated_by = user_id

        flag_modified(assessment, "assessment_details")

        print(inspect(assessment).attrs.assessment_details.history)
        print(inspect(assessment).modified)

        await self.db.commit()
        await self.db.refresh(assessment)

        return {
            "id": assessment.assessment_formation_id,
            "details": assessment.assessment_details,
        }

    async def add_assessment_to_project(
        self,
        assessment_formation_id: str,
        project_id: str,
        user_id: str,
    ):
        existing_project_assessment = await self.db.scalar(
            select(ProjectAssessmentMap).where(
                ProjectAssessmentMap.project_id == project_id,
                ProjectAssessmentMap.assessment_formation_id == assessment_formation_id,
            )
        )

        if existing_project_assessment:
            raise BadRequestException("Project assessment map already present")

        new_pa_map = ProjectAssessmentMap(
            project_id=project_id,
            assessment_formation_id=assessment_formation_id,
            created_by=user_id,
        )

        self.db.add(new_pa_map)
        await self.db.commit()

        logger.info(
            f"Assessment formation: {assessment_formation_id} mapped to Project: {project_id} but User: {user_id}"
        )

    async def get_assessment_details(
        self, user_email: str, organization_id: str, assessment_id: str, project_id: str
    ):
        logger.info(f"Email: {user_email}")
        # check for project assessment association and existance
        assessment = await self.db.scalar(
            select(AssessmentFormation)
            .join(
                ProjectAssessmentMap,
                and_(
                    ProjectAssessmentMap.assessment_formation_id
                    == AssessmentFormation.assessment_formation_id,
                    ProjectAssessmentMap.project_id == project_id,
                ),
            )
            .where(
                AssessmentFormation.assessment_formation_id == assessment_id,
                AssessmentFormation.organization_id == organization_id,
            )
        )

        logger.info(f"Assessment: {assessment}")

        if not assessment:
            raise NotFoundException("Invalid assessment")

        #  check user assessment access
        assessment_access = await self.db.scalar(
            select(UserAssessmentAccess).where(
                UserAssessmentAccess.assessment_id == assessment_id,
                UserAssessmentAccess.user_email == user_email,
                UserAssessmentAccess.access_status == "GRANTED",
            )
        )

        logger.info(f"Access: {assessment_access}")
        

        if not assessment_access:
            raise ForbiddenException("Access denied!!")

        assessment_details = assessment.assessment_details
        assessment_allocation_mode = assessment_details["allocation_type"]["mode"]

        items = assessment_details.get("items", [])
        active_items = list(filter(lambda x: x["add_to_test"], items))

        unique_competencies = set(item["competency_id"] for item in active_items)
        number_of_total_question = sum(
            len(item["question_ids"]) for item in active_items
        )
        total_questions_for_randomized = sum(
            min(len(item["question_ids"]), 3) for item in active_items
        )
        final_total_questions = (
            number_of_total_question
            if assessment_allocation_mode == AssessmentAllocationMode.STATIC
            else total_questions_for_randomized
        )
        exam_duration = (
            assessment.assessment_duration
            if assessment_allocation_mode == AssessmentAllocationMode.STATIC
            else total_questions_for_randomized
        )

        assessment_info = {
            "exam_name": assessment.assessment_formation_name,
            "exam_type": assessment_details.get("exam_type", "MCQ"),
            "exam_status": assessment_details.get("exam_status", "active"),
            "exam_description": assessment_details.get("exam_description", "active"),
            "exam_instruction": [
                f"You have {final_total_questions} questions to complete in {exam_duration} minutes.",
                f"Complete the test in one attempt—start only when you can dedicate {exam_duration} minutes without interruptions.",
                f"The test evaluates {len(unique_competencies)} major competencies and {len(active_items)} sub-competencies relevant to your role.",
                " Think through the scenarios and choose the best options.",
                "Remember, it’s just a test—relax and enjoy the process!",
            ],
            "exam_duration": exam_duration,
            "appearence_limit": assessment_details.get("appearance_limit", 1),
            "number_of_competencies": len(unique_competencies),
            "number_of_total_question": final_total_questions,
            "allocation_type": assessment_details["allocation_type"],
            "items": active_items,
        }

        return assessment_info


async def get_assessment_service(
    db: AsyncSession = Depends(get_db),
) -> AssessmentService:
    return AssessmentService(db=db)


# TODO: confirm do we have to store inactive sub_competencies details as well in assessment formation to re-generate the competency-subcompetency table when using question bank
# TODO: Create the shuffelling algo both `static` and `randomized`.check with bhaskar first
# TODO: Confirm the usage of `Save Competency` and `Bookmark` button in the Question qutration page
# TODO: take access table structure form joydip
# TODO : inter-shuffle in between must_have, good_to_have... when shuffle enabled
