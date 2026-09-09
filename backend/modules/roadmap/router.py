from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.roadmap.schema import (
    RoadmapClone,
    RoadmapCreate,
    RoadmapUpdate,
)
from modules.roadmap.service import RoadmapService, get_roadmap_service
from modules.user.model import UserDetails

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.post("", status_code=201)
async def create_roadmap(
    data: RoadmapCreate,
    user: UserDetails = Depends(get_current_user),
    roadmap_service: RoadmapService = Depends(get_roadmap_service),
):
    roadmap = await roadmap_service.create(data=data, user_id=user.user_id)
    return {"message": "Roadmap created successfully", "id": roadmap.roadmap_id}


@router.post("/clone", status_code=201)
async def clone_roadmap(
    data: RoadmapClone,
    user: UserDetails = Depends(get_current_user),
    roadmap_service: RoadmapService = Depends(get_roadmap_service),
):
    roadmap = await roadmap_service.clone_roadmap(data=data, user_id=user.user_id)
    return {"message": "Roadmap cloned successfully", "id": roadmap.roadmap_id}


@router.get("/{roadmap_id}")
async def get_roadmap(
    roadmap_id: str,
    user: UserDetails = Depends(get_current_user),
    roadmap_service: RoadmapService = Depends(get_roadmap_service),
):
    roadmap = await roadmap_service.get_by_id(roadmap_id)

    response = await roadmap_service.get_roadmap_details(
        user_id=user.user_id, roadmap_id=roadmap_id
    )
    return response


@router.put("/{roadmap_id}")
async def update_roadmap(
    roadmap_id: str,
    data: RoadmapUpdate,
    user: UserDetails = Depends(get_current_user),
    roadmap_service: RoadmapService = Depends(get_roadmap_service),
):
    await roadmap_service.get_by_id(roadmap_id)

    roadmap = await roadmap_service.update(
        roadmap_id=roadmap_id, user_id=user.user_id, data=data
    )
    return {"message": "Roadmap updated successfully"}


@router.delete("/{roadmap_id}", status_code=204)
async def delete_roadmap(
    roadmap_id: str,
    user: UserDetails = Depends(get_current_user),
    roadmap_service: RoadmapService = Depends(get_roadmap_service),
):
    roadmap = await roadmap_service.get_by_id(roadmap_id)

    await roadmap_service.delete(roadmap_id=roadmap_id)

    return {"message": "Roadmap deleted successfully"}


# @router.post("/{roadmap_id}/assign/{team_id}", status_code=204)
# async def assign_roadmap_to_team(
#     roadmap_id: str,
#     team_id: str,
#     user: UserDetails = Depends(get_current_user),
#     roadmap_service: RoadmapService = Depends(get_roadmap_service),
#     team_service: TeamService = Depends(get_team_service),
#     roadmap_policy: RoadmapPolicy = Depends(get_roadmap_policy),
# ):
#     roadmap = await roadmap_service.get_by_id(roadmap_id)
#     team = await team_service.get_team_by_id(team_id=team_id, user_id=user.user_id)

#     if not await roadmap_policy.can_assign(
#         actor=user,
#         organization_id=roadmap.organization_id,
#         team=team,
#         roadmap=roadmap,
#     ):
#         raise PermissionDenied("Missing required permission: roadmap:assign")

#     await roadmap_service.update(
#         roadmap_id=roadmap_id,
#         data=RoadmapUpdate(team_id=team_id),
#     )
