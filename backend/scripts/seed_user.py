import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.database import AsyncSessionLocal
from modules.organization.exceptions import MemberAlreadyExists
from modules.organization.repository import OrganizationRepository
from modules.organization.schema import AddMemberRequest, OrganizationCreate
from modules.organization.service import OrganizationService
from modules.roadmap.model import UserRoadmap  # noqa: F401
from modules.user.repository import UserRepository
from modules.user.service import UserService
from core.config import settings


async def seed_user(user_email: str):
    async with AsyncSessionLocal() as db:
        user_service = UserService(repo=UserRepository(db=db))
        user = await user_service.get_or_create_user(email=user_email)
        print(f"User added with email '{user.user_email}' and id: {user.user_id}")
        return user


async def seed_organization(
    org_name: str,
    # org_slug: str,
    created_by: str,
    org_details: dict | None = None,
):
    async with AsyncSessionLocal() as db:
        user_service = UserService(repo=UserRepository(db=db))
        org_service = OrganizationService(
            repo=OrganizationRepository(db=db), user_service=user_service
        )

        organization = await org_service.create_organization(
            data=OrganizationCreate(
                organization_name=org_name,
                # slug=org_slug,
                organization_details=org_details or {},
                access_key=settings.platform_admin_access_key
            ),
            created_by=created_by,
        )
        print(
            f"Organization '{organization.organization_name}' created with id: "
            f"{organization.organization_id}"
        )
        return organization


async def seed_organization_members(
    user_emails: list[str],
    organization_id: str,
    user_id: str,
) -> None:
    async with AsyncSessionLocal() as db:
        user_service = UserService(repo=UserRepository(db=db))
        org_service = OrganizationService(
            repo=OrganizationRepository(db=db), user_service=user_service
        )

        for email in user_emails:
            try:
                membership = await org_service.add_member(
                    organization_id=organization_id,
                    data=AddMemberRequest(user_email=email),
                )
                print(
                    f"User {user_id} added '{email}' to organization "
                    f"{organization_id} (member id: {membership.user_id})"
                )
            except MemberAlreadyExists as exc:
                print(f"Skipping '{email}': {exc}")


if __name__ == "__main__":
    asyncio.run(
        # seed_user(user_email="palsurjendu104@gmail.com"),
        # 019fd4ef-e6ab-7fb3-8e6a-b09d8410c272
        # seed_organization(
        #     org_name="SETU",org_details={"allowed_email_domains": ["setuschool.com"]},  created_by="01a032f7-20df-7c43-8c39-cd00b8415342"
        # ),
        # 019fd4f0-7032-7d50-a819-f722fe2f395f
        seed_organization_members(
            user_emails=[
                # "joydip@setuschool.com",
                # "barun@setuschool.com",
                # "ujjyaini@setuschool.com",
                "surjendu@setuschool.com",
                "palsurjendu104@gmail.com",
            ],
            organization_id="01a032f8-7513-77d1-8b7c-f9358342247d",
            user_id="01a032f7-20df-7c43-8c39-cd00b8415342",
        ),
    )
