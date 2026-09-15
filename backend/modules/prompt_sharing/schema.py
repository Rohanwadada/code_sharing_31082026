from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class SubCompetencyItem(BaseModel):
    name: str
    score: int = Field(default=70, ge=0, le=100)
    status: str = Field(default="Can Do Better")


class CompetencyItem(BaseModel):
    name: str
    score: int = Field(default=70, ge=0, le=100)
    status: str = Field(default="Can Do Better")
    sub_competencies: List[SubCompetencyItem] = []


class GenerateRoadmapPromptRequest(BaseModel):
    who_is_this_for: Optional[str] = "Organization"
    what_to_create: Optional[str] = "roadmap"
    role_description_text: Optional[str] = None
    role_title: Optional[str] = None


class GenerateRoadmapPromptResponse(BaseModel):
    prompt: str
    key_insight: str
    competencies: List[CompetencyItem]
    assessment_summary: Dict[str, Any]
    raw_output: str
