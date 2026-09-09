from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security.hashing import hash_entity
from modules.organization.model import Organization, OrganizationMembership
from modules.user.model import UserDetails
from modules.user.schema import UserCreate, UserUpdate


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(
        self,
        user_id: str,
    ) -> UserDetails | None:
        user = await self.db.get(UserDetails, user_id)
        if not user:
            return None
        return user

    async def get_by_email(self, email: str) -> UserDetails | None:
        hashed_email = hash_entity(email)
        result = await self.db.execute(
            select(UserDetails).where(UserDetails.email == hashed_email)
        )
        return result.scalar_one_or_none()

    async def create_user(self, data: UserCreate) -> UserDetails:
        user = UserDetails(
            user_email=data.email,
            user_name=data.user_name,
            profile_image=data.profile_image,
            institute_or_organization=data.institute_or_organization,
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def update_user(
        self,
        user_id: str,
        data: UserUpdate,
    ) -> UserDetails | None:
        user = await self.get_by_id(user_id)

        if not user:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def get_user_organization(self, user_id: str) -> list[dict[str, Any]]:
        user_organization = (
            await self.db.scalars(
                select(OrganizationMembership).where(
                    OrganizationMembership.user_id == user_id
                )
            )
        ).all()

        organizations = []
        for u_org in user_organization:
            org = await self.db.scalar(
                select(Organization).where(
                    Organization.organization_id == u_org.organization_id
                )
            )
            if org:
                organizations.append(
                    {
                        "id": org.organization_id,
                        "name": org.organization_name,
                        # "slug": org.slug
                    }
                )

        return organizations
