from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class JobType(Enum):
    CONTENT_GENERATION_BATCH = "content_generation_batch"
    EXTERNAL_COURSE_RECOMMENDATION = "external_course_recommendation"


class JobUpdate(BaseModel):
    job_data: dict | None = None
    status: str | None = None
    metadata_: dict | None = None


class TaskNotificationAddRequest(BaseModel):
    job_id: str = Field(alias="j_id")
    channels: list[dict[str, Any]] = []
    content: dict[str, Any] = {}
    notification_type: str
