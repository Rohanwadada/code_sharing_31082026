from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class TeamMembershipStatus(StrEnum):
    INVITED = "invited"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REMOVED = "removed"


class TeamCreate(BaseModel):
    name: str
    slug: str
    team_metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        slug = value.strip().lower()
        if not slug:
            raise ValueError("Slug is required")
        return slug


class TeamUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    team_metadata: dict[str, Any] | None = None

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        slug = value.strip().lower()
        if not slug:
            raise ValueError("Slug cannot be empty")
        return slug


class TeamResponse(BaseModel):
    team_id: str
    organization_id: str
    name: str
    slug: str
    team_metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AddTeamMemberRequest(BaseModel):
    user_id: str
    status: TeamMembershipStatus = TeamMembershipStatus.ACTIVE


class TeamMemberResponse(BaseModel):
    user_id: str
    team_id: str
    status: TeamMembershipStatus
    joined_at: datetime

    model_config = {"from_attributes": True}
