from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exception import ForbiddenException
from modules.organization.exceptions import (
    MemberAlreadyExists,
    NotOrganizationMember,
    OrganizationNotFound,
)
from modules.organization.model import Organization, OrganizationMembership
from modules.organization.repository import OrganizationRepository
from modules.organization.schema import (
    AddMemberRequest,
    OrganizationCreate,
    OrganizationMembershipStatus,
    OrganizationUpdate,
)
from modules.team.model import Team
from modules.user.model import UserDetails
from modules.user.service import UserService, get_user_service
from shared.db.dependencies import get_db


class OrganizationService:
    def __init__(self, repo: OrganizationRepository, user_service: UserService) -> None:
        self.repo = repo
        self.user_service = user_service

    async def create_organization(
        self, data: OrganizationCreate, created_by: str
    ) -> Organization:
        # existing = await self.repo.get_organization_by_slug(slug=data.slug)
        # if existing:
        #     raise OrganizationSlugAlreadyExists("Organization slug already exists")

        organization = await self.repo.create_organization(
            data=data, created_by=created_by
        )
        await self.repo.add_member(
            user_id=created_by,
            organization_id=organization.organization_id,
            status=OrganizationMembershipStatus.ACTIVE,
        )
        return organization

    async def get_organization_by_id(self, organization_id: str) -> Organization:
        return await self._require_organization(organization_id)

    async def update_organization(
        self, organization_id: str, data: OrganizationUpdate
    ) -> Organization | None:
        organization = await self._require_organization(organization_id)

        # if data.slug and data.slug != organization.slug:
        #     existing = await self.repo.get_organization_by_slug(slug=data.slug)
        #     if existing and existing.organization_id != organization_id:
        #         raise OrganizationSlugAlreadyExists(
        #             "Organization slug already exists for this user"
        #         )

        updated = await self.repo.update_organization(organization_id, data)
        return updated

    async def delete_organization(self, organization_id: str) -> None:
        await self._require_organization(organization_id)
        deleted = await self.repo.delete_organization(organization_id)
        if not deleted:
            raise OrganizationNotFound("Organization not found")

    async def get_organization_teams(
        self, organization_id: str, user_id: str
    ) -> list[Team]:
        await self._require_organization(organization_id)
        return await self.repo.get_organization_teams(organization_id)

    async def add_member(
        self, organization_id: str, data: AddMemberRequest
    ) -> OrganizationMembership:
        await self._require_organization(organization_id)

        user = await self.user_service.get_or_create_user(email=data.user_email)

        existing = await self.repo.get_member(
            user_id=user.user_id, organization_id=organization_id
        )
        if existing:
            raise MemberAlreadyExists("User is already a member")
        return await self.repo.add_member(
            user_id=user.user_id,
            organization_id=organization_id,
            status=OrganizationMembershipStatus(data.status),
        )

    async def remove_member(self, organization_id: str, member_user_id: str) -> None:
        await self._require_organization(organization_id)

        removed = await self.repo.remove_member(
            user_id=member_user_id, organization_id=organization_id
        )
        if not removed:
            raise NotOrganizationMember("User is not a member")

    async def get_members(self, organization_id: str) -> list[OrganizationMembership]:
        await self._require_organization(organization_id)
        return await self.repo.get_members(organization_id)

    async def get_user_organizations(
        self, user_id: str
    ) -> list[OrganizationMembership]:
        return await self.repo.get_user_organizations(user_id)

    async def _require_organization(self, organization_id: str) -> Organization:
        organization = await self.repo.get_organization_by_id(organization_id)
        if not organization:
            raise OrganizationNotFound("Organization not found")
        return organization


    async def onboard_user_to_organization_by_email_domain(self, email: str):
        try:
            email_domain = email.split("@")[-1]
    
            organization = await self.repo.db.scalar(select(Organization).where(Organization.organization_details['allowed_email_domains'].contains([email_domain])))

            existing_user = await self.repo.db.scalar(select(UserDetails).where(UserDetails.user_email == email))

            existing_membrship = None
            
            if existing_user:
                existing_membrship = await self.repo.db.scalar(select(OrganizationMembership).where(OrganizationMembership.user_id == existing_user.user_id))
                
    
            if not organization and not existing_membrship:
                raise ForbiddenException("Access denied!! Please contact Administrator")


            if organization:
                membership = await self.add_member(
                    organization_id=organization.organization_id,
                    data=AddMemberRequest(user_email=email),
                )        
    
            return True
        except MemberAlreadyExists:
            return True
        except Exception as e:
            raise e
        


async def get_organization_service(
    db: AsyncSession = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
) -> OrganizationService:
    return OrganizationService(
        repo=OrganizationRepository(db=db), user_service=user_service
    )
