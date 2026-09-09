from pydantic import BaseModel


class CourseRecommendation(BaseModel):
    organization_id: str
    team_id: str | None
    roadmap_id: str
    retry: bool = False


class CourseRecommendationJobStatus(BaseModel):
    organization_id: str
    team_id: str | None
    roadmap_id: str
    job_id: str
