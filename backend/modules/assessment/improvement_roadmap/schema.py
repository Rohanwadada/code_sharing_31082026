from pydantic.main import BaseModel


class GenerateImprovementRoadmap(BaseModel):
    organization_id: str
    team_id: str | None = None
    project_id: str
    allocation_id: str