import json

from fastapi import APIRouter, Depends, File, Form, UploadFile

from core.exception import BadRequestException
from core.security.dependencies import get_current_user
from modules.assessment.competency_upload_service import parse_competency_upload
from modules.assessment.schema import (
    AssessmentUploadResponse,
    CreateAssessment,
    UpdateAssessment,
)
from modules.assessment.service import AssessmentService, get_assessment_service
from modules.user.model import UserDetails
from modules.assessment.assessment_access.router import router as assessment_access_router
from modules.assessment.improvement_roadmap.router import router as imr_router

router = APIRouter(prefix="/assessment", tags=["assessment"])


@router.put("/{assessment_id}")
async def update_assessment(
    assessment_id: str,
    data: UpdateAssessment,
    user: UserDetails = Depends(get_current_user),
    assessment_service: AssessmentService = Depends(get_assessment_service),
):
    return await assessment_service.update_assessment(
        assessment_id=assessment_id, user_id=user.user_id, data=data
    )


@router.post("", status_code=201)
async def create_assessment(
    data: CreateAssessment,
    user: UserDetails = Depends(get_current_user),
    assessment_service: AssessmentService = Depends(get_assessment_service),
):
    return await assessment_service.create_assessment(user=user, data=data)


@router.post("/process-questions-upload")
async def process_questions_upload(
    data: str = Form(...),
    file: UploadFile = File(...),
    user: UserDetails = Depends(get_current_user),
    assessment_service: AssessmentService = Depends(get_assessment_service),
):
    try:
        if file.filename == "":
            raise BadRequestException("Empty filename")

        parsed_data = json.loads(data)
    except json.JSONDecodeError as exc:
        raise BadRequestException("`data` must be valid JSON") from exc

    return await assessment_service.process_uploaded_questions_file(
        file=file, data=parsed_data
    )


# for competency upload
@router.post("/competency/upload", response_model=AssessmentUploadResponse)
async def upload_competency_file(
    file: UploadFile = File(...), user: UserDetails = Depends(get_current_user)
):
    """Reads the Excel file and returns the items. No sessions created."""
    items, file_info, summary = parse_competency_upload(file)

    return AssessmentUploadResponse(file=file_info, items=items, summary=summary)


router.include_router(assessment_access_router)
router.include_router(imr_router)