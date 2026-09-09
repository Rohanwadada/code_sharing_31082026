from datetime import datetime, timedelta
import logging

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exception import BadRequestException, NotFoundException
from modules.assessment.model import (
    AssessmentFormation,
    Competency,
    McqQuestion,
    ProjectAssessmentMap,
    Subcompetency,
)
from modules.assessment_attempt.encryption import decrypt_allocation_id
from modules.assessment_attempt.model import AllocatedExams, Submissions
from modules.assessment_attempt.schema import (
    AssessmentType,
    EvaluateExamPayload,
)
from modules.learning_progress.service import LearningProgressService, get_learning_progress_service
from modules.roadmap.model import Roadmap
from modules.roadmap_learning_assessment.model import (
    RoadmapLearningAssessment,
    RoadmapLearningAssessmentQuestions,
)
from modules.user.model import UserDetails
from shared.db.dependencies import get_db
from modules.project.model import Project

logger = logging.getLogger(__name__)


class ExamEvaluationSerice:
    def __init__(self, db: AsyncSession, learning_progress_service: LearningProgressService) -> None:
        self.db = db
        self.learning_progress_service = learning_progress_service

    async def evaluate_exam(self, user: UserDetails, payload: EvaluateExamPayload):
        total_marks = 0
        obtained_marks = 0
        attempted_questions = 0
        total_correct = 0
        total_partial_correct = 0
        incorrect = 0
        best_streak = 0
        current_streak = 0
        is_correct = False
        partial_correct = False
        exam_category = None
        detailed_result = {
            "total_correct": 0,
            "correct_percentage": 0,
            "total_partial_correct": 0,
            "partial_correct_percentage": 0,
            "total_incorrect": 0,
            "incorrect_percentage": 0,
            "total_skipped": 0,
            "skipped_percentage": 0,
            "per_question_time": [],
            "best_streak": 0,
            "capabilities": {},
        }

        data = payload.model_dump()
        allocation_id = decrypt_allocation_id(data["test_id"])

        existing_submission = await self.db.scalar(
            select(Submissions)
            .where(Submissions.allocation_id == allocation_id)
            .order_by(Submissions.submission_time.desc())
        )

        if existing_submission and existing_submission.is_final_submission:
            return {
                "status": "error",
                "message": "This exam has already been finally submitted.",
            }

        allocated_exam = await self.db.scalar(
            select(AllocatedExams).where(AllocatedExams.allocation_id == allocation_id)
        )

        if not allocated_exam:
            raise NotFoundException("Invalid test allocation")

        # if allocated_exam:
        #     exam_details = db.query(ExamDetails).filter_by(exam_id=allocated_exam.exam_id).first()
        #     if exam_details != None:
        #         exam_category = exam_details.exam_category

        for answer in data["answers"]:
            # question = db.query(Questions).filter_by(Question_ID=answer["id"]).first()
            question = None
            if allocated_exam.assessment_type == AssessmentType.SKILL_GAP_ASSESSMENT:
                question = await self.db.scalar(
                    select(McqQuestion).where(
                        McqQuestion.mcq_question_id == answer["id"]
                    )
                )
            elif (
                allocated_exam.assessment_type
                == AssessmentType.ROADMAP_LEARNING_ASSESSMENT
            ):
                question = await self.db.scalar(
                    select(RoadmapLearningAssessmentQuestions).where(
                        RoadmapLearningAssessmentQuestions.question_id == answer["id"]
                    )
                )
            if not question:
                continue

            total_marks += question.marks
            key_competency, sub_competency = None, None

            if (
                isinstance(question, McqQuestion)
                and allocated_exam.assessment_type
                == AssessmentType.SKILL_GAP_ASSESSMENT
            ):
                key_competency = await self.db.scalar(
                    select(Competency).where(
                        Competency.competency_id == question.competency_id
                    )
                )
                sub_competency = await self.db.scalar(
                    select(Subcompetency).where(
                        Subcompetency.subcompetency_id == question.subcompetency_id
                    )
                )

            if answer["attempted"]:
                attempted_questions += 1
                if question.question_type == "mcq":
                    if answer["selected_option"] == question.correct_option_text:
                        obtained_marks += question.marks
                        total_correct += 1
                        current_streak += 1
                        answer["is_correct"] = True
                        is_correct = True
                    else:
                        incorrect += 1
                        current_streak = 0
                        answer["is_correct"] = False
                        is_correct = False
                # else:
                #     if question.question_type == "moq":
                #         selected_options = set(answer["selected_option"].split(","))
                #         correct_options = set(filter(None, [question.correct_option_text, question.another_correct_option_text or None]))
                #         if selected_options == correct_options:
                #             obtained_marks += question.marks
                #             total_correct += 1
                #             current_streak += 1
                #             answer["is_correct"] = True
                #             is_correct = True
                #         elif selected_options & correct_options:
                #             obtained_marks += question.marks / 2
                #             total_partial_correct += 1
                #             partial_correct = True
                #             current_streak += 1
                #             answer["is_correct"] = False
                #             is_correct = False
                #         else:
                #             incorrect += 1
                #             current_streak = 0
                #             answer["is_correct"] = False
                #             is_correct = False
                detailed_result["per_question_time"].append(answer["time_taken"])
            else:
                detailed_result["total_skipped"] += 1
                current_streak = 0
                answer["is_correct"] = False
                is_correct = False

            best_streak = max(best_streak, current_streak)

            if key_competency is not None and sub_competency is not None:
                competency = detailed_result["capabilities"].setdefault(
                    key_competency.competency_name,
                    {
                        "Total-Number-of-Question": 0,
                        "Number-Of-Correct-Question": 0,
                        "Percentage-Of-Correct-Answer": 0,
                        "Status": "",
                        "Sub-Competencies": {},
                    },
                )
                competency["Total-Number-of-Question"] += 1
                if is_correct:
                    competency["Number-Of-Correct-Question"] += 1
                else:
                    if partial_correct:
                        competency["Number-Of-Correct-Question"] += 0.5

                sub_competency_data = competency["Sub-Competencies"].setdefault(
                    sub_competency.subcompetency_name,
                    {
                        "Total-Number-of-Question": 0,
                        "Number-Of-Correct-Question": 0,
                        "Percentage-Of-Correct-Answer": 0,
                        "Status": "",
                    },
                )

                sub_competency_data["Total-Number-of-Question"] += 1
                if is_correct:
                    sub_competency_data["Number-Of-Correct-Question"] += 1
                else:
                    if partial_correct:
                        sub_competency_data["Number-Of-Correct-Question"] += 0.5

            total_attempted = attempted_questions
            total_skipped = detailed_result["total_skipped"]
            detailed_result.update(
                {
                    "total_questions": allocated_exam.total_questions,
                    "total_correct": total_correct,
                    "total_partial_correct": total_partial_correct,
                    "total_incorrect": incorrect,
                    "total_skipped": total_skipped,
                    "correct_percentage": (total_correct / len(data["answers"])) * 100
                    if len(data["answers"])
                    else 0,
                    "partial_correct_percentage": (
                        total_partial_correct / len(data["answers"])
                    )
                    * 100
                    if len(data["answers"])
                    else 0,
                    "incorrect_percentage": (incorrect / len(data["answers"])) * 100
                    if len(data["answers"])
                    else 0,
                    "skipped_percentage": (total_skipped / len(data["answers"])) * 100
                    if len(data["answers"])
                    else 0,
                    "best_streak": best_streak,
                }
            )

            if allocated_exam.assessment_type == AssessmentType.SKILL_GAP_ASSESSMENT:
                for key_competency, comp_data in detailed_result[
                    "capabilities"
                ].items():
                    if comp_data["Total-Number-of-Question"] > 0:
                        comp_data["Percentage-Of-Correct-Answer"] = (
                            comp_data["Number-Of-Correct-Question"]
                            / comp_data["Total-Number-of-Question"]
                        ) * 100
                        if comp_data["Percentage-Of-Correct-Answer"] < 50:
                            comp_data["Status"] = "This is your blind spot"
                        elif 50 >= comp_data["Percentage-Of-Correct-Answer"] < 70:
                            comp_data["Status"] = "You can do better"
                        else:
                            comp_data["Status"] = "This is your strength"

                    for sub_competency, sub_data in comp_data[
                        "Sub-Competencies"
                    ].items():
                        if sub_data["Total-Number-of-Question"] > 0:
                            sub_data["Percentage-Of-Correct-Answer"] = (
                                sub_data["Number-Of-Correct-Question"]
                                / sub_data["Total-Number-of-Question"]
                            ) * 100
                            if sub_data["Percentage-Of-Correct-Answer"] < 50:
                                sub_data["Status"] = "This is your blind spot"
                            elif 50 >= sub_data["Percentage-Of-Correct-Answer"] < 70:
                                sub_data["Status"] = "You can do better"
                            else:
                                sub_data["Status"] = "This is your strength"

        obtained_percentage = (
            (obtained_marks / total_marks) * 100 if total_marks > 0 else 0
        )
        secured_level = ["Seeker", "Learner", "Proficient", "Achiever", "Champion"][
            min(int(obtained_percentage // 20), 4)
        ]

        time_taken, formatted_time = self.calculate_time_taken(
            data["examStartTime"], data["examEndTime"]
        )
        average_time = (
            time_taken / attempted_questions if attempted_questions > 0 else 0
        )

        if exam_category == "Project_Staggered":
            existing_submission = await self.db.scalar(
                select(Submissions).where(Submissions.allocation_id == allocation_id)
            )
            if existing_submission:
                if existing_submission.is_final_submission:
                    return {
                        "status": "error",
                        "message": "You have already submitted the exam.",
                    }
                else:
                    existing_submission.submission_details = data
                    existing_submission.total_marks = total_marks
                    existing_submission.obtained_marks = obtained_marks
                    existing_submission.obtained_percentage = obtained_percentage
                    existing_submission.secured_level = secured_level
                    existing_submission.submission_mode = data["submission_mode"]
                    existing_submission.total_time_taken = formatted_time
                    existing_submission.average_time_taken = str(
                        timedelta(seconds=average_time)
                    )
                    existing_submission.number_of_attempted_question = (
                        attempted_questions
                    )
                    existing_submission.total_number_of_correct_answer = total_correct
                    existing_submission.total_number_of_partial_correct_answer = (
                        total_partial_correct
                    )
                    existing_submission.best_streak = best_streak
                    existing_submission.detailed_result = detailed_result
                    existing_submission.is_final_submission = data["submitted"]
                    await self.db.commit()
                    return {
                        "status": "success",
                        "message": "Submission updated successfully",
                    }

        submission = Submissions(
            allocation_id=allocation_id,
            submission_details=data,
            total_marks=total_marks,
            obtained_marks=obtained_marks,
            obtained_percentage=obtained_percentage,
            secured_level=secured_level,
            submission_mode=data["submission_mode"],
            total_time_taken=formatted_time,
            average_time_taken=str(timedelta(seconds=average_time)),
            number_of_attempted_question=attempted_questions,
            total_number_of_correct_answer=total_correct,
            total_number_of_partial_correct_answer=total_partial_correct,
            best_streak=best_streak,
            detailed_result=detailed_result,
        )

        self.db.add(submission)
        await self.db.commit()

        # TODO: update node learning status there also store the allocation id as metadata
        if allocated_exam.assessment_type == AssessmentType.ROADMAP_LEARNING_ASSESSMENT and payload.roadmap_id and payload.node_id:
            assessment_data = {"assessment": {"allocation_id": data["test_id"], "status": "complete"}}
            await self.learning_progress_service.update_learning_progress(organization_id = payload.organization_id, team_id=payload.team_id, user_id=user.user_id, roadmap_id=payload.roadmap_id, node_id=payload.node_id, status='done', additional_data=assessment_data)

        return {"status": "success", "message": "Exam evaluated successfully"}

    async def get_submission_by_allocation_id(
        self, user: UserDetails, allocation_id: str
    ):
        try:
            decrypted_allocation_id = decrypt_allocation_id(allocation_id)
            logger.info(f"Original allocation id: {decrypted_allocation_id}")

            submission = await self.db.scalar(
                select(Submissions).where(
                    Submissions.allocation_id == decrypted_allocation_id
                )
            )
            if not submission:
                raise HTTPException(status_code=404, detail="Submission not found")

            allocated_exam = await self.db.scalar(
                select(AllocatedExams).where(
                    AllocatedExams.allocation_id == decrypted_allocation_id,
                    AllocatedExams.user_id == user.user_id
                )
            )
            if not allocated_exam:
                raise HTTPException(
                    status_code=404, detail="Allocated exam record not found"
                )

            assessment_name, assessment_type = None, allocated_exam.assessment_type
            if allocated_exam.assessment_type == AssessmentType.SKILL_GAP_ASSESSMENT:
                assessment = await self.db.scalar(
                    select(AssessmentFormation).where(
                        AssessmentFormation.assessment_formation_id
                        == allocated_exam.exam_id
                    )
                )
                if assessment:
                    assessment_name = assessment.assessment_formation_name
            elif (
                allocated_exam.assessment_type
                == AssessmentType.ROADMAP_LEARNING_ASSESSMENT
            ):
                assessment = await self.db.scalar(
                    select(RoadmapLearningAssessment).where(
                        RoadmapLearningAssessment.assessment_id
                        == allocated_exam.exam_id
                    )
                )
                if assessment:
                    assessment_name = assessment.title

            submission_data = {
                "total_marks": submission.total_marks,
                "obtained_marks": submission.obtained_marks,
                "obtained_percentage": f"{submission.obtained_percentage:.2f}",
                "secured_level": submission.secured_level,
                "submission_mode": submission.submission_mode,
                "submission_time": submission.submission_time.strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if submission.submission_time
                else None,
                "total_time_taken": self.format_time_with_units(
                    submission.total_time_taken
                ),
                "average_time_taken": self.format_time_with_units(
                    submission.average_time_taken
                ),
                "number_of_attempted_question": submission.number_of_attempted_question,
                "total_number_of_question": allocated_exam.total_questions,
                "total_number_of_correct_answer": submission.total_number_of_correct_answer,
                "total_number_of_partial_correct_answer": submission.total_number_of_partial_correct_answer,
                "best_streak": submission.best_streak,
            }

            detailed = submission.detailed_result.copy() if submission.detailed_result else {}
            detailed["total_marks"] = submission.total_marks
            detailed["obtained_marks"] = submission.obtained_marks
            detailed["assessment_type"] = allocated_exam.assessment_type
            detailed["total_time"] = submission.total_time_taken

            detailed = {**detailed, **submission_data}

            assessment_project = await self.get_assessment_project(assessment_id=allocated_exam.exam_id, assessment_type=allocated_exam.assessment_type)
            if not assessment_project:
                raise BadRequestException("Project of this assessment is invalid")

            return {
                "status": "success",
                "user_email": user.user_email,
                "user_name": user.user_name,
                "exam_name": assessment_name, 
                "assessment_type": allocated_exam.assessment_type,
                "submission": detailed,
                "project_id": assessment_project.project_id,
                "project_type": assessment_project.project_details.get("project_type", None)
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400, detail="Invalid encrypted allocation ID"
            )


    async def get_assessment_project(self, assessment_id: str, assessment_type: AssessmentType) -> Project | None:
        project_id = None
        project = None

        if assessment_type == AssessmentType.SKILL_GAP_ASSESSMENT:
            assessment_entry = await self.db.scalar(select(ProjectAssessmentMap).where(ProjectAssessmentMap.assessment_formation_id == assessment_id))
            if assessment_entry:
                project_id = assessment_entry.project_id
        elif assessment_type == AssessmentType.ROADMAP_LEARNING_ASSESSMENT:
            assessment_entry = await self.db.scalar(select(RoadmapLearningAssessment
            ).where(RoadmapLearningAssessment.assessment_id == assessment_id))
            if assessment_entry:
                roadmap = await self.db.scalar(select(Roadmap
                ).where(Roadmap.roadmap_id == assessment_entry.roadmap_id))
                if roadmap:
                    project_id = roadmap.project_id

        if project_id:
            project = await self.db.scalar(select(Project).where(Project.project_id == project_id))

        return project

    def calculate_time_taken(self, start_time, end_time):
        try:
            # Convert to lowercase and remove extra spaces to standardize input[cite: 7]
            start_time_clean = start_time.strip().lower()
            end_time_clean = end_time.strip().lower()

            # Check for AM/PM in a case-insensitive way[cite: 7]
            if "am" in start_time_clean or "pm" in start_time_clean:
                time_format = "%I:%M:%S %p"  # 12-hour format[cite: 7]
            else:
                time_format = "%H:%M:%S"  # 24-hour format[cite: 7]

            # Convert string time to datetime object[cite: 7]
            start_time_local = datetime.strptime(start_time_clean, time_format)
            end_time_local = datetime.strptime(end_time_clean, time_format)

            # Calculate time difference[cite: 7]
            time_difference = end_time_local - start_time_local

            # Convert to total seconds and formatted time[cite: 7]
            total_seconds = time_difference.total_seconds()
            formatted_time = str(timedelta(seconds=total_seconds))
            return total_seconds, formatted_time
        except ValueError as e:
            raise e

    def format_time_with_units(self, time_str):
        parts = time_str.split(":")
        if len(parts) != 3:
            return time_str
        try:
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
        except ValueError:
            return time_str

        seconds_str = f"{seconds:.2f}".rstrip("0").rstrip(".")
        formatted = ""
        if hours > 0:
            formatted += f"{hours} hours "
        if minutes > 0:
            formatted += f"{minutes} minutes "
        if seconds > 0 or (hours == 0 and minutes == 0):
            formatted += f"{seconds_str} seconds"

        return formatted.strip()


async def get_exam_evaluation_service(db: AsyncSession = Depends(get_db), learning_progress_service: LearningProgressService = Depends(get_learning_progress_service)):
    return ExamEvaluationSerice(db=db, learning_progress_service=learning_progress_service)
