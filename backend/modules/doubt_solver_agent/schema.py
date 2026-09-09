from typing import List, Literal

from pydantic import BaseModel, Field


class IntentExtraction(BaseModel):
    intent: List[Literal["roadmap_or_chapter", "general"]] = Field(
        ..., description="User message intent(s) extracted from user message"
    )
    safety_index: Literal[0, 1] = Field(
        ..., description="0 if the query is safe otherwise 1"
    )
