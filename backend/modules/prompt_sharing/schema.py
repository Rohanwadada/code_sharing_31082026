from typing import Optional
from pydantic import BaseModel


class GenerateRoadmapPromptRequest(BaseModel):
    who_is_this_for: Optional[str] = "Organization"
    what_to_create: Optional[str] = "roadmap"
    role_description_text: Optional[str] = None


class GenerateRoadmapPromptResponse(BaseModel):
    prompt: str
