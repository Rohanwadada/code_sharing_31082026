from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.exception import AppException, BadRequestException
from modules.assessment.service import AssessmentService, get_assessment_service
from modules.assessment_attempt.schema import AssessmentType, ExamDetails
from modules.roadmap_learning_assessment.service import get_assessment_details
from modules.user.model import UserDetails
from shared.db.dependencies import get_db


class ExamService:
    def __init__(self, db: AsyncSession, assessment_service: AssessmentService) -> None:
        self.db = db
        self.assessment_service = assessment_service

    async def get_exam_details(
        self, user: UserDetails, organization_id: str, project_id: str,  assessment_id: str, assessment_type: AssessmentType, roadmap_id: str | None
    ) -> ExamDetails:
        assessment_info = None
        if assessment_type == AssessmentType.SKILL_GAP_ASSESSMENT:                
            assessment_info = await self.assessment_service.get_assessment_details(
                user_email=user.user_email,
                organization_id=organization_id,
                project_id=project_id,
                assessment_id=assessment_id
            )
        elif assessment_type == AssessmentType.ROADMAP_LEARNING_ASSESSMENT:
            if not roadmap_id:
                raise BadRequestException("Invalid roadmap")

            assessment_info = await get_assessment_details(user_id=user.user_id, organization_id=organization_id, roadmap_id=roadmap_id, assessment_id=assessment_id, db=self.db)

        if not assessment_info:
            raise AppException("Something went wrong")
            
        return ExamDetails(
            exam_name=assessment_info['exam_name'],
            exam_type=assessment_info['exam_type'],
            exam_status=assessment_info['exam_status'],
            exam_description=assessment_info['exam_description'],
            exam_instruction=assessment_info['exam_instruction'],
            exam_duration=assessment_info['exam_duration'],
            appearence_limit=assessment_info['appearence_limit'],
            number_of_competencies=assessment_info['number_of_competencies'],
            number_of_total_question=assessment_info['number_of_total_question']
        )

async def get_exam_service(db: AsyncSession = Depends(get_db), assessment_service: AssessmentService = Depends(get_assessment_service)):
    return ExamService(db=db, assessment_service=assessment_service)