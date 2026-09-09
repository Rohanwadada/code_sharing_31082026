from fastapi import Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from modules.user.exception import UserNotFound
from modules.user.model import UserDetails
from modules.user.repository import UserRepository
from modules.user.schema import UserCreate, UserResponse, UserUpdate
from shared.db.dependencies import get_db


class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo

    async def find_user_by_id(self, user_id: str) -> UserDetails | None:
        return await self.repo.get_by_id(user_id)

    async def find_user_by_email(self, user_email: str) -> UserDetails | None:
        return await self.repo.get_by_email(email=user_email)

    async def get_user_by_id(self, user_id: str) -> UserDetails:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFound("User not found")
        return user

    async def create_user(self, data: UserCreate) -> UserDetails:
        return await self.repo.create_user(data)

    async def get_or_create_user(self, email: str) -> UserDetails:
        user = await self.repo.get_by_email(email)
        if user:
            return user
        return await self.repo.create_user(UserCreate(email=email))

    async def update_user(
        self,
        user_id: str,
        data: UserUpdate,
    ) -> UserDetails | None:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFound("User not found")

        return await self.repo.update_user(user_id, data)

    async def get_user_details(self, user: UserDetails) -> UserResponse:
        user_organizations = await self.repo.get_user_organization(user_id=user.user_id)

        response = UserResponse(
            name=user.user_name,
            email=user.user_email,
            profile_image=user.profile_image,
            registration_date=str(user.registration_date)
            if user.registration_date
            else None,
            institute_or_organization=user.institute_or_organization,
            role=user.provided_role.lower() if user.provided_role else None,
            linkedin_profile=user.linkedin_profile,
            designation_specialization=user.designation_specialization,
            year_of_experience=user.year_of_experience,
            organizations=user_organizations,
        )

        return response


async def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(repo=UserRepository(db=db))
