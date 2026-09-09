from enum import Enum
from typing import Literal

from pydantic import BaseModel


class ThreadType(Enum):
    ROADMAP_GENERATION = "roadmap_generation"
    ROADMAP_DOUBT = "roadmap_doubt"


class ThreadCreate(BaseModel):
    organization_id: str
    team_id: str | None
    project_id: str
    title: str
    thread_type: ThreadType
    thread_metadata: dict = {}


class ThreadUpdate(BaseModel):
    organization_id: str
    team_id: str | None
    title: str | None = None
    content: list | None = []
    thread_metadata: dict | None = {}


class ThreadDelete(BaseModel):
    organization_id: str
    team_id: str | None
    thread_id: str


class RoadmapAgentChatRequest(BaseModel):
    organization_id: str
    team_id: str | None
    project_id: str
    thread_id: str | None = None
    message: str | None = None

    time_commitment: str | None = None
    prompt: dict | None = None
    m_id: str | None = None
    retry: bool | None = None
    generate_from_prompt: bool | None = None
    thread_title: str | None = None
    assessment_id: str | None = None


class DoubtSolverAgentChatRequest(BaseModel):
    organization_id: str
    team_id: str | None
    project_id: str
    thread_id: str | None = None
    message: str | None = None

    roadmap_id: str
    chapter_id: str | None = None
    m_id: str | None = None
    retry: bool | None = None


class ChatResponse(BaseModel):
    thread_id: str | None
    run_id: str
    status: str


class MessagesRequest(BaseModel):
    organization_id: str
    team_id: str | None = None


class MessageFeedbackRequest(BaseModel):
    thread_id: str
    message_id: str
    feedback: Literal["like", "dislike"]
