from fastapi import APIRouter, Depends, Query

from core.security.dependencies import get_current_user
from modules.artifact.schema import (
    ArtifactGetRequest,
    ArtifactSaveRequest,
    ArtifactUpdateRequest,
    CreateArtifactRequest,
    SavedRoadmapArtifactRequest,
)
from modules.artifact.service import ArtifactService, get_artifact_service
from modules.user.model import UserDetails

router = APIRouter(prefix="/artifact", tags=["artifact"])


@router.post("", status_code=201)
async def create_artifact(
    data: CreateArtifactRequest,
    user: UserDetails = Depends(get_current_user),
    artifact_service: ArtifactService = Depends(get_artifact_service),
):
    return await artifact_service.create_artifact(
        organization_id=data.organization_id,
        team_id=data.team_id,
        project_id=data.project_id,
        thread_id=data.thread_id,
        user_id=user.user_id,
        artifact_title=data.title,
        artifact_description=data.description,
        artifact_data=data.data,
        artifact_metadata=data.metadata,
    )


@router.post("/saved")
async def get_all_saved_roadmap_artifact(
    data: SavedRoadmapArtifactRequest,
    user: UserDetails = Depends(get_current_user),
    artifact_service: ArtifactService = Depends(get_artifact_service),
):
    return await artifact_service.get_all_saved_roadmap_artifact(
        user_id=user.user_id,
        organization_id=data.organization_id,
        team_id=data.team_id,
    )


@router.post("/{artifact_id}")
async def get_artifact_by_id(
    artifact_id: str,
    data: ArtifactGetRequest,
    user: UserDetails = Depends(get_current_user),
    artifact_service: ArtifactService = Depends(get_artifact_service),
):
    return await artifact_service.get_artifact_by_id(
        organization_id=data.organization_id,
        team_id=data.team_id,
        thread_id=data.thread_id,
        user_id=user.user_id,
        artifact_id=artifact_id,
    )


@router.put("/{artifact_id}")
async def update_artifact(
    artifact_id: str,
    data: ArtifactUpdateRequest,
    user: UserDetails = Depends(get_current_user),
    artifact_service: ArtifactService = Depends(get_artifact_service),
):
    return await artifact_service.update_artifact(
        organization_id=data.organization_id,
        team_id=data.team_id,
        thread_id=data.thread_id,
        user_id=user.user_id,
        artifact_id=artifact_id,
        data=data.data,
    )


@router.post("/{artifact_id}/save", status_code=201)
async def save_roadmap_artifact(
    artifact_id: str,
    data: ArtifactSaveRequest,
    user: UserDetails = Depends(get_current_user),
    artifact_service: ArtifactService = Depends(get_artifact_service),
):
    return await artifact_service.save_roadmap_artifact(
        organization_id=data.organization_id,
        team_id=data.team_id,
        thread_id=data.thread_id,
        user_id=user.user_id,
        artifact_id=artifact_id,
        source=data.source,
        message_id=data.message_id,
    )
