from typing import Literal

from pydantic import BaseModel


class CreateArtifactRequest(BaseModel):
    organization_id: str
    team_id: str | None
    project_id: str
    thread_id: str
    title: str
    description: str
    data: dict
    metadata: dict = {}


class ArtifactGetRequest(BaseModel):
    organization_id: str
    team_id: str | None = None
    thread_id: str


class ArtifactUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    graph: dict | None = None
    meta: dict | None = None


class ArtifactUpdateRequest(BaseModel):
    organization_id: str
    team_id: str | None = None
    thread_id: str
    data: ArtifactUpdate


class ArtifactSaveRequest(BaseModel):
    organization_id: str
    team_id: str | None = None
    thread_id: str
    source: Literal["chat", "artifact"]
    message_id: str | None = None


class SavedRoadmapArtifactRequest(BaseModel):
    organization_id: str
    team_id: str | None = None
