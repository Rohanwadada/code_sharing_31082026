from fastapi import APIRouter, Depends, Query

from core.security.dependencies import get_current_user
from modules.roadmap.roadmap_access_service import (
    RoadmapAccessService,
    get_roadmap_access_service,
)
from modules.roadmap.schema import (
    AllRoadmapRequest,
    GrantAccessRequest,
    RevokeAccessRequest,
    RoadmapSearchRequest,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="", tags=["roadmap access"])


@router.post("/grant-access")
async def grant_users_roadmap_access_route(
    data: GrantAccessRequest,
    user: UserDetails = Depends(get_current_user),
    roadmap_access_service: RoadmapAccessService = Depends(get_roadmap_access_service),
):
    response = await roadmap_access_service.grant_users_roadmap_access(
        granting_user_id=user.user_id, granting_user_email=user.user_email,  data=data
    )
    return response


@router.post("/revoke-access")
async def revoke_user_roadmap_access_route(
    data: RevokeAccessRequest,
    user: UserDetails = Depends(get_current_user),
    roadmap_access_service: RoadmapAccessService = Depends(get_roadmap_access_service),
):
    response = await roadmap_access_service.revoke_user_roadmap_access(
        user_id=user.user_id,
        roadmap_id=data.roadmap_id,
        target_emails=data.target_emails,
    )
    return response


@router.get("/{roadmap_id}/access-data")
async def get_shared_roadmap_data_route(
    roadmap_id: str,
    user: UserDetails = Depends(get_current_user),
    roadmap_access_service: RoadmapAccessService = Depends(get_roadmap_access_service),
):
    response = await roadmap_access_service.get_shared_roadmap_data(
        roadmap_id=roadmap_id
    )
    return response


@router.post("/search")
async def search_roadmap_by_title_route(
    data: RoadmapSearchRequest,
    query: str = Query(alias="q"),
    user: UserDetails = Depends(get_current_user),
    roadmap_access_service: RoadmapAccessService = Depends(get_roadmap_access_service),
):
    response = await roadmap_access_service.search_roadmap_by_title(
        user_id=user.user_id,
        query=query,
        organization_id=data.organization_id,
        team_id=data.team_id,
    )
    return response


@router.post("/all-roadmap")
async def get_all_roadmap_route(
    data: AllRoadmapRequest,
    user: UserDetails = Depends(get_current_user),
    roadmap_access_service: RoadmapAccessService = Depends(get_roadmap_access_service),
):
    response = await roadmap_access_service.get_all_roadmap(
        user_id=user.user_id, organization_id=data.organization_id, team_id=data.team_id
    )
    return response
