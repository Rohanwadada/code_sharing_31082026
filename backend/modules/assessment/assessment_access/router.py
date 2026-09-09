from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.security.dependencies import get_current_user
from modules.assessment.assessment_access.service import get_user_assessment, grant_assessment_access
from modules.user.model import UserDetails
from shared.db.dependencies import get_db

from modules.assessment.assessment_access.schema import AccessGrantRequest, AccessGrantResponse
from shared.email.dependencies import get_background_email_service
from shared.email.service import BackgroundEmailService

router = APIRouter(prefix="/access", tags=["assessment"])

@router.post(
    "/grant",
    response_model=AccessGrantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Grant Assessment Access to User(s)",
    description="Grants access to particular candidate(s) for a given assessment ID. Inserts entries into user_assessment_access table."
)
async def grant_access(
    request: AccessGrantRequest,
    user: UserDetails = Depends(get_current_user),
    email_service: BackgroundEmailService = Depends(get_background_email_service),
    db: AsyncSession = Depends(get_db)
):
    if not request.candidates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate list cannot be empty")
    
    return await grant_assessment_access(db, user, request, email_service)


@router.get("/get-all-assessments")
async def get_all_user_assessments_route(user: UserDetails = Depends(get_current_user),
db: AsyncSession = Depends(get_db)):
    return await get_user_assessment(db=db, user=user)