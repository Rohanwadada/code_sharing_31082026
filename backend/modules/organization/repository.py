from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.organization.model import Organization, OrganizationMembership
from modules.organization.schema import (
    OrganizationCreate,
    OrganizationMembershipStatus,
    OrganizationUpdate,
)
from modules.team.model import Team


class OrganizationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_organization(
        self, data: OrganizationCreate, created_by: str
    ) -> Organization:
        organization = Organization(
            organization_name=data.organization_name,
            # slug=data.slug,
            created_by=created_by,
            updated_by=created_by,
            organization_details=data.organization_details,
        )
        self.db.add(organization)
        await self.db.commit()
        await self.db.refresh(organization)
        return organization

    async def get_organization_by_id(self, organization_id: str) -> Organization | None:
        return await self.db.get(Organization, organization_id)

    """ async def get_organization_by_slug(self, slug: str) -> Organization | None:
        return await self.db.scalar(
            select(Organization).where(Organization.slug == slug)
        ) """

    async def update_organization(
        self, organization_id: str, data: OrganizationUpdate
    ) -> Organization | None:
        organization = await self.get_organization_by_id(organization_id)
        if not organization:
            return None
        update_data = data.model_dump(exclude_unset=True)

        # merge the metadata
        if "organization_details" in update_data:
            organization.organization_details = {
                **(organization.organization_details or {}),
                **(update_data.pop("organization_details") or {}),
            }

        for field, value in update_data.items():
            setattr(organization, field, value)

        await self.db.commit()
        await self.db.refresh(organization)
        return organization

    async def delete_organization(self, organization_id: str) -> bool:
        organization = await self.get_organization_by_id(organization_id)
        if not organization:
            return False
        await self.db.delete(organization)
        await self.db.commit()
        return True

    async def get_organization_teams(self, organization_id: str) -> list[Team]:
        result = await self.db.scalars(
            select(Team).where(Team.organization_id == organization_id)
        )
        return list(result.all())

    async def add_member(
        self,
        user_id: str,
        organization_id: str,
        status: OrganizationMembershipStatus = OrganizationMembershipStatus.ACTIVE,
    ) -> OrganizationMembership:
        membership = OrganizationMembership(
            user_id=user_id,
            organization_id=organization_id,
            status=status,
        )
        self.db.add(membership)
        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def remove_member(self, user_id: str, organization_id: str) -> bool:
        result = await self.db.execute(
            delete(OrganizationMembership).where(
                OrganizationMembership.user_id == user_id,
                OrganizationMembership.organization_id == organization_id,
            )
        )
        await self.db.commit()
        return result.rowcount > 0

    async def get_members(self, organization_id: str) -> list[OrganizationMembership]:
        result = await self.db.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization_id
            )
        )
        return list(result.all())

    async def get_member(
        self, user_id: str, organization_id: str
    ) -> OrganizationMembership | None:
        result = await self.db.scalar(
            select(OrganizationMembership).where(
                OrganizationMembership.user_id == user_id,
                OrganizationMembership.organization_id == organization_id,
            )
        )
        return result

    async def get_user_organizations(
        self, user_id: str
    ) -> list[OrganizationMembership]:
        result = await self.db.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.user_id == user_id
            )
        )
        return list(result.all())
