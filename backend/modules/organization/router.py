from fastapi import APIRouter, Depends

from core.config import settings
from core.exception import ForbiddenException
from core.security.dependencies import get_current_user
from modules.organization.schema import (
    AddMemberRequest,
    OrganizationCreate,
    OrganizationMemberResponse,
    OrganizationResponse,
    OrganizationTeamResponse,
    OrganizationUpdate,
)
from modules.organization.service import OrganizationService, get_organization_service
from modules.user.model import UserDetails

router = APIRouter(prefix="/organizations", tags=["organization"])


ACCESS_KEY = settings.platform_admin_access_key

@router.post("", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    data: OrganizationCreate,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    if data.access_key != ACCESS_KEY or user.provided_role.lower() != 'admin':
        raise ForbiddenException("Access denied")
        
    organization = await organization_service.create_organization(
        data=data, created_by=user.user_id
    )
    return organization


@router.get("", response_model=list[OrganizationMemberResponse])
async def get_user_organizations(
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    memberships = await organization_service.get_user_organizations(
        user_id=user.user_id
    )
    return [
        OrganizationMemberResponse(
            user_id=m.user_id,
            organization_id=m.organization_id,
            status=m.status,
            joined_at=m.joined_at,
        )
        for m in memberships
    ]


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: str,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    return await organization_service.get_organization_by_id(
        organization_id=organization_id
    )


@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    organization_id: str,
    data: OrganizationUpdate,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    if data.access_key != ACCESS_KEY or user.provided_role.lower() != 'admin':
        raise ForbiddenException("Access denied")

    return await organization_service.update_organization(
        organization_id=organization_id, data=data
    )


@router.delete("/{organization_id}", status_code=204)
async def delete_organization(
    organization_id: str,
    data: dict,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    if data["access_key"] != ACCESS_KEY or user.provided_role.lower() != 'admin':
        raise ForbiddenException("Access denied")

    await organization_service.delete_organization(organization_id=organization_id)


@router.get("/{organization_id}/teams", response_model=list[OrganizationTeamResponse])
async def get_organization_teams(
    organization_id: str,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    return await organization_service.get_organization_teams(
        organization_id=organization_id,
        user_id=user.user_id,
    )


@router.post(
    "/{organization_id}/members",
    response_model=OrganizationMemberResponse,
    status_code=201,
)
async def add_member(
    organization_id: str,
    data: AddMemberRequest,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):

    membership = await organization_service.add_member(
        organization_id=organization_id, data=data
    )
    return membership


@router.delete(
    "/{organization_id}/members/{member_user_id}",
    status_code=204,
)
async def remove_member(
    organization_id: str,
    member_user_id: str,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    await organization_service.remove_member(
        organization_id=organization_id,
        member_user_id=member_user_id,
    )


@router.get(
    "/{organization_id}/members",
    response_model=list[OrganizationMemberResponse],
)
async def get_members(
    organization_id: str,
    user: UserDetails = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    members = await organization_service.get_members(organization_id=organization_id)

    return [
        OrganizationMemberResponse(
            user_id=m.user_id,
            organization_id=m.organization_id,
            status=m.status,
            joined_at=m.joined_at,
        )
        for m in members
    ]
