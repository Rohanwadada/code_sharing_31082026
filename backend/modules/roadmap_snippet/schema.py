from typing import Any

from pydantic import BaseModel


class BaseRequest(BaseModel):
    organization_id: str
    team_id: str | None = None


class SnippetSearch(BaseRequest):
    query: str
    roadmap_id: str


class SnippetAddToRoadmap(BaseRequest):
    snippet: dict
    ref_rid: str


class AddComponentToBag(BaseRequest):
    component: dict[str, Any]


class RemoveComponentFromBag(BaseRequest):
    component: dict[str, Any]
