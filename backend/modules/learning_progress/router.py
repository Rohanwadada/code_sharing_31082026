from fastapi import APIRouter, Depends, Query

from core.security.dependencies import get_current_user
from modules.learning_progress.schema import UpdateProgressRequest
from modules.learning_progress.service import (
    LearningProgressService,
    get_learning_progress_service,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="/learning-progress", tags=["learning-progress"])


@router.get("/{roadmap_id}")
async def get_learning_progress(
    roadmap_id: str,
    organization_id: str = Query(...),
    team_id: str | None = Query(None),
    user: UserDetails = Depends(get_current_user),
    learning_progress_service: LearningProgressService = Depends(
        get_learning_progress_service
    ),
):
    return await learning_progress_service.get_learning_progress(
        organization_id=organization_id,
        team_id=team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
    )


@router.put("/{roadmap_id}")
async def update_learning_progress(
    roadmap_id: str,
    data: UpdateProgressRequest,
    organization_id: str = Query(...),
    team_id: str | None = Query(None),
    user: UserDetails = Depends(get_current_user),
    learning_progress_service: LearningProgressService = Depends(
        get_learning_progress_service
    ),
):

    return await learning_progress_service.update_learning_progress(
        organization_id=organization_id,
        team_id=team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
        node_id=data.node_id,
        status=data.status,
    )
