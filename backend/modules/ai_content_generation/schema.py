from typing import Optional

from pydantic import BaseModel, ConfigDict


class GenerateNodeContent(BaseModel):
    organization_id: str
    team_id: str | None
    roadmap: str
    topic_name: str
    module_name: str
    node_title: str
    r_id: str
    m_id: str
    n_id: str
    prompt: Optional[str] = None
    time_commitment: Optional[str | None] = None

    model_config = ConfigDict(extra="allow")


class GenerateNodeContentBatch(BaseModel):
    organization_id: str
    team_id: str | None
    roadmap_id: str
    retry: bool = False


class GenerateContentJobStatus(BaseModel):
    organization_id: str
    team_id: str | None
    roadmap_id: str
    job_id: str
