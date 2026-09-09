from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CandidateAccessItem(BaseModel):
    email: str
    name: Optional[str] = None

class AccessGrantRequest(BaseModel):
    assessment_id: str = Field(..., description="Target assignment/assessment UUID")
    # granted_by: Optional[str] = Field(None, description="Admin/SPOC email granting access")
    organization_id: Optional[str] = None
    candidates: List[CandidateAccessItem] = Field(..., min_length=1, description="List of candidate objects to grant access")

class AccessGrantItem(BaseModel):
    access_id: str
    assessment_id: str
    user_email: str
    access_status: str
    granted_at: datetime

class AccessGrantResponse(BaseModel):
    status: str = "success"
    message: str
    granted_count: int
    existing_count: int
    access_records: List[AccessGrantItem]