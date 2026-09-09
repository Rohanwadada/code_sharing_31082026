from typing import Any

from pydantic import BaseModel


class UpdateNodeContentRequest(BaseModel):
    new_content: dict[str, Any]


class RemoveNodeContent(BaseModel):
    nodes: list[str]


class RestoreNodeContent(BaseModel):
    nodes: list[str]


class PushContentUpdateRequest(BaseModel):
    organization_id: str
    team_id: str | None
    subject: str = "Roadmap Content Update"
    node_details: list[dict[str, Any]] = []
