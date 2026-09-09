from datetime import datetime
from enum import StrEnum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class RoadmapLevel(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class RoadmapStatus(StrEnum):
    PUBLISHED = "published"
    PENDING = "pending"
    DRAFT = "draft"


class VisibilityScope(StrEnum):
    PUBLIC = "public"
    ORG = "org"
    TEAM = "team"
    PRIVATE = "private"


class RoadmapCreate(BaseModel):
    organization_id: str
    team_id: str | None = None
    project_id: str
    title: str
    description: str
    roadmap_graph: Optional[dict[str, Any]] = Field(default_factory=dict)
    roadmap_content: Optional[dict[str, Any]] = Field(default_factory=dict)
    level: RoadmapLevel = RoadmapLevel.BEGINNER
    price: Optional[float] = 0.0
    visibility_scope: VisibilityScope = VisibilityScope.PRIVATE


class RoadmapClone(RoadmapCreate):
    ref_rid: str
    cln_t: Literal["partial", "all"] = "all"


class RoadmapUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    roadmap_graph: dict[str, Any] | None = None
    roadmap_content: dict[str, Any] | None = None
    level: RoadmapLevel | None = None
    status: RoadmapStatus | None = None
    visibility_scope: VisibilityScope | None = None
    team_id: str | None = None
    source: str = "canvas"
    generation_status: Literal["complete", "in-complete"] | None = None
    mode: Literal["manual", "ai-generated"] = "manual"


class RoadmapResponse(BaseModel):
    roadmap_id: str
    organization_id: str
    team_id: str | None
    title: str
    description: str
    level: str
    roadmap_graph: dict
    roadmap_content: dict
    status: str
    visibility_scope: str
    roadmap_metadata: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GrantAccess(BaseModel):
    email: str
    level: Literal["viewer", "editor"] = "viewer"
    sharing_mode: Literal["access_shared_by_admin", "collaboration"] = (
        "access_shared_by_admin"
    )


class GrantAccessRequest(BaseModel):
    roadmap_id: str
    notify: bool = False
    access: list[GrantAccess] = []


class RevokeAccessRequest(BaseModel):
    roadmap_id: str
    target_emails: list[str]


class AllRoadmapRequest(BaseModel):
    organization_id: str
    team_id: str | None = None


class RoadmapSearchRequest(BaseModel):
    organization_id: str
    team_id: str | None = None
