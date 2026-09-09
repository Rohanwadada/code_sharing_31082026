from typing import Literal

from pydantic import BaseModel, Field


class UpdateProgressRequest(BaseModel):
    node_id: str = Field(alias="id")
    status: Literal["pending", "in-progress", "done"]
