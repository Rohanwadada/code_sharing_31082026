from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.team.schema import (
    AddTeamMemberRequest,
    TeamCreate,
    TeamMemberResponse,
    TeamResponse,
    TeamUpdate,
)
from modules.team.service import TeamService, get_team_service
from modules.user.model import UserDetails

router = APIRouter(prefix="/organizations/{organization_id}/teams", tags=["team"])


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    organization_id: str,
    data: TeamCreate,
    user: UserDetails = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service),
):

    return await team_service.create_team(
        data=data, organization_id=organization_id, user_id=user.user_id
    )


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    organization_id: str,
    team_id: str,
    user: UserDetails = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service),
):

    return await team_service.get_team_by_id(
        organization_id=organization_id, team_id=team_id, user_id=user.user_id
    )


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    organization_id: str,
    team_id: str,
    data: TeamUpdate,
    user: UserDetails = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service),
):

    return await team_service.update_team(
        organization_id=organization_id,
        team_id=team_id,
        data=data,
        user_id=user.user_id,
    )


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    organization_id: str,
    team_id: str,
    user: UserDetails = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service),
):
    await team_service.delete_team(
        organization_id=organization_id, team_id=team_id, user_id=user.user_id
    )


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
async def add_member(
    organization_id: str,
    team_id: str,
    data: AddTeamMemberRequest,
    user: UserDetails = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service),
):
    return await team_service.add_member(
        organization_id=organization_id,
        team_id=team_id,
        data=data,
        user_id=user.user_id,
    )


@router.delete("/{team_id}/members/{member_user_id}", status_code=204)
async def remove_member(
    organization_id: str,
    team_id: str,
    member_user_id: str,
    user: UserDetails = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service),
):
    await team_service.remove_member(
        organization_id=organization_id,
        team_id=team_id,
        member_user_id=member_user_id,
        user_id=user.user_id,
    )


@router.get("/{team_id}/members", response_model=list[TeamMemberResponse])
async def get_members(
    organization_id: str,
    team_id: str,
    user: UserDetails = Depends(get_current_user),
    team_service: TeamService = Depends(get_team_service),
):
    return await team_service.get_members(
        organization_id=organization_id, team_id=team_id, user_id=user.user_id
    )
