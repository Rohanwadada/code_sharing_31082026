from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    organization_name: str
    # slug: str
    organization_details: dict[str, Any] = Field(default_factory=dict)
    access_key: str

    # @field_validator("slug")
    # @classmethod
    # def normalize_slug(cls, value: str) -> str:
    #     slug = value.strip().lower()
    #     if not slug:
    #         raise ValueError("Slug is required")
    #     return slug


class OrganizationUpdate(BaseModel):
    organization_name: str | None = None
    # slug: str | None = None
    organization_details: dict[str, Any] | None = None
    access_key: str

    # @field_validator("slug")
    # @classmethod
    # def normalize_slug(cls, value: str | None) -> str | None:
    #     if value is None:
    #         return None
    #     slug = value.strip().lower()
    #     if not slug:
    #         raise ValueError("Slug cannot be empty")
    #     return slug


class OrganizationResponse(BaseModel):
    organization_id: str
    organization_name: str
    # slug: str
    organization_details: dict[str, Any]
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationTeamResponse(BaseModel):
    team_id: str
    organization_id: str
    organization_name: str
    # slug: str
    team_metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AddMemberRequest(BaseModel):
    user_email: str
    status: str = "active"


class OrganizationMemberResponse(BaseModel):
    user_id: str
    organization_id: str
    status: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class OrganizationMembershipStatus(StrEnum):
    INVITED = "invited"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REMOVED = "removed"
