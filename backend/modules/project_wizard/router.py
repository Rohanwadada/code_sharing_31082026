import logging
from typing import Optional, Union
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.security.dependencies import get_current_user
from modules.user.model import UserDetails
from modules.project_wizard.schema import (
    SaveWizardStepRequest,
    WizardSessionResponse,
    CompleteWizardRequest,
)
from modules.project_wizard.service import (
    ProjectWizardService,
    get_project_wizard_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/project-wizard", tags=["Project Wizard"])


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@router.post("/save", response_model=WizardSessionResponse, status_code=status.HTTP_200_OK)
async def save_wizard_step(
    request: SaveWizardStepRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserDetails = Depends(get_current_user),
    service: ProjectWizardService = Depends(get_project_wizard_service),
):
    try:
        # #changes 28-09-2026 - start: Safely get organization_id without AttributeError on UserDetails
        # session = await service.save_or_update_step_state(
        #     db=db,
        #     user_id=current_user.user_id,
        #     request=request,
        #     organization_id=current_user.organization_id,
        # )
        org_id = getattr(current_user, "organization_id", None)
        session = await service.save_or_update_step_state(
            db=db,
            user_id=current_user.user_id,
            request=request,
            organization_id=org_id,
        )
        # #changes 28-09-2026 - end
        return session
    except Exception as e:
        logger.error(f"Failed to save wizard state: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save wizard state: {str(e)}",
        )


@router.get("/{project_id}", response_model=Optional[WizardSessionResponse], status_code=status.HTTP_200_OK)
async def get_wizard_state(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserDetails = Depends(get_current_user),
    service: ProjectWizardService = Depends(get_project_wizard_service),
):
    session = await service.get_wizard_session(
        db=db, project_id=project_id, user_id=current_user.user_id
    )
    return session



@router.post("/complete", response_model=WizardSessionResponse, status_code=status.HTTP_200_OK)
async def complete_wizard(
    request: CompleteWizardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserDetails = Depends(get_current_user),
    service: ProjectWizardService = Depends(get_project_wizard_service),
):
    session = await service.complete_wizard_session(
        db=db, project_id=request.project_id, user_id=current_user.user_id
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wizard session not found",
        )
    return session


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_wizard_state(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserDetails = Depends(get_current_user),
    service: ProjectWizardService = Depends(get_project_wizard_service),
):
    success = await service.delete_wizard_session(
        db=db, project_id=project_id, user_id=current_user.user_id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wizard session not found",
        )
    return {"status": "success", "message": "Wizard session deleted successfully"}
