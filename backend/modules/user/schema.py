from typing import Any

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    user_name: str | None = None
    profile_image: str | None = None
    institute_or_organization: str | None = None


class UserUpdate(BaseModel):
    user_name: str | None = None
    profile_image: str | None = None
    institute_or_organization: str | None = None
    provided_role: str | None = None
    phone_no: str | None = None
    linkedin_profile: str | None = None


class UserResponse(BaseModel):
    name: str | None = None
    email: str | None = None
    profile_image: str | None = None
    registration_date: str | None = None
    institute_or_organization: str | None = None
    role: str | None = None
    linkedin_profile: str | None = None
    designation_specialization: str | None = None
    year_of_experience: float | None = None
    organizations: list[dict[str, Any]]

    model_config = {"from_attributes": True}
