from fastapi import APIRouter, Depends, Query

from core.security.dependencies import get_current_user
from modules.roadmap_content.schema import (
    PushContentUpdateRequest,
    RemoveNodeContent,
    RestoreNodeContent,
    UpdateNodeContentRequest,
)
from modules.roadmap_content.service import (
    RoadmapContentService,
    get_roadmap_content_service,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="/roadmap", tags=["roadmap content"])


@router.get("/{roadmap_id}")
async def get_roadmap_content(
    roadmap_id: str,
    organization_id: str = Query(...),
    team_id: str | None = Query(None),
    user: UserDetails = Depends(get_current_user),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
):

    return await roadmap_content_service.get_roadmap_content(
        organization_id=organization_id,
        team_id=team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
    )


@router.get("/{roadmap_id}/content/{node_id}")
async def get_node_content(
    roadmap_id: str,
    node_id: str,
    organization_id: str = Query(...),
    team_id: str | None = Query(None),
    user: UserDetails = Depends(get_current_user),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
):

    return await roadmap_content_service.get_node_content(
        organization_id=organization_id,
        team_id=team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
        node_id=node_id,
    )


@router.put("/{roadmap_id}/content/{node_id}")
async def update_node_content(
    roadmap_id: str,
    node_id: str,
    data: UpdateNodeContentRequest,
    organization_id: str = Query(...),
    team_id: str | None = Query(None),
    user: UserDetails = Depends(get_current_user),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
):

    return await roadmap_content_service.update_node_content(
        organization_id=organization_id,
        team_id=team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
        node_id=node_id,
        new_content=data.new_content,
    )


@router.delete("/{roadmap_id}/content/remove")
async def remove_node_content(
    roadmap_id: str,
    data: RemoveNodeContent,
    organization_id: str = Query(...),
    team_id: str | None = Query(None),
    user: UserDetails = Depends(get_current_user),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
):

    return await roadmap_content_service.remove_node_content(
        organization_id=organization_id,
        team_id=team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
        data=data,
    )


@router.post("/{roadmap_id}/content/restore")
async def restore_node_content(
    roadmap_id: str,
    data: RestoreNodeContent,
    organization_id: str = Query(...),
    team_id: str | None = Query(None),
    user: UserDetails = Depends(get_current_user),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
):
    return await roadmap_content_service.restore_node_content(
        organization_id=organization_id,
        team_id=team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
        data=data,
    )


@router.post("/{roadmap_id}/content/notify")
async def push_roadmap_content_update(
    roadmap_id: str,
    data: PushContentUpdateRequest,
    user: UserDetails = Depends(get_current_user),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
):

    return await roadmap_content_service.push_roadmap_content_update(
        organization_id=data.organization_id,
        team_id=data.team_id,
        user_id=user.user_id,
        roadmap_id=roadmap_id,
        data=data,
    )
