from datetime import datetime
from enum import Enum, StrEnum
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID


class ProjectStatusEnum(str, Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    closed = "closed"


class PauseTypeEnum(str, Enum):
    manually = "manually"
    indefinitely = "indefinitely"
    until_date = "until_date"


class ProjectType(StrEnum):
    SKILL_GAP_ASSESSMENT="skill_gap_assessment"
    ROADMAP="roadmap"
    SKILL_GAP_ASSESSMENT_AND_ROADMAP="skill_gap_assessment_and_roadmap"

class ProjectMandate(StrEnum):
    SELF="self"
    TEAM="team"
    ORGANIZATION="organization"


class ProjectStatus(BaseModel):
    status: ProjectStatusEnum = ProjectStatusEnum.draft
    pause_type: Optional[PauseTypeEnum] = None
    resume_date: Optional[datetime] = None


class ProjectCreate(BaseModel):
    project_name: str
    organization_name: str
    function_name: Optional[str] = None
    designation_name: Optional[str] = None

    hiring_goal: Optional[str] = None
    jd_url: Optional[str] = None
    created_by: Optional[UUID] = None
    project_status: ProjectStatus = Field(
        default_factory=lambda: ProjectStatus(status=ProjectStatusEnum.draft)
    )

    approval_managers: List[str] = Field(default_factory=list)
    hiring_sponsors: List[str] = Field(default_factory=list)
    hiring_managers: List[str] = Field(default_factory=list)

    jd_data: Optional[Any] = None

    project_type: ProjectType
    project_mandate: ProjectMandate


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    organization_name: Optional[str] = None
    function_name: Optional[str] = None
    designation_name: Optional[str] = None

    hiring_goal: Optional[str] = None
    jd_url: Optional[str] = None
    project_status: Optional[ProjectStatus] = None

    approval_managers: Optional[List[str]] = None
    hiring_sponsors: Optional[List[str]] = None
    hiring_managers: Optional[List[str]] = None
    jd_data: Optional[Any] = None


# Partha


# class ProjectResponse(BaseModel):
#     project_id: UUID
#     project_name: str
#     organization_name: Optional[str] = None
#     function_name: Optional[str] = None
#     designation_name: Optional[str] = None
#     hiring_goal: Optional[str] = None
#     jd_url: Optional[str] = None
#     project_status: Optional[Dict[str, Any]] = None
#     created_at: datetime
#     created_by: Optional[UUID] = None
#     project_details: Optional[Dict[str, Any]] = None

#     # Extra fields for UI cards (default to null)
#     profiles_count: Optional[int] = None
#     avg_score: Optional[float] = None
#     shortlisted_count: Optional[int] = None

#     class Config:
#         from_attributes = True

class ProjectResponse(BaseModel):
    project_id: UUID
    project_name: str
    organization_name: Optional[str] = None
    function_name: Optional[str] = None
    designation_name: Optional[str] = None
    hiring_goal: Optional[str] = None
    jd_url: Optional[str] = None
    project_status: Optional[Dict[str, Any]] = None
    created_at: datetime
    created_by: Optional[UUID] = None
    project_details: Optional[Dict[str, Any]] = None
    
    # Extra fields for UI cards (default to null)
    profiles_count: Optional[int] = None
    avg_score: Optional[float] = None
    shortlisted_count: Optional[int] = None

    class Config:
        from_attributes = True  


class ProjectDetailsRequest(BaseModel):
    project_id: UUID


class DeleteProjectRequest(BaseModel):
    project_id: UUID
    confirm: bool
