# ── Organizations ───────────────────────────────────────────────
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import Field
from pydantic.main import BaseModel


class OrgCreate(BaseModel):
    organization_name: str
    organization_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_by: UUID


class FunctionCreate(BaseModel):
    function_name: str
    function_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_by: Optional[UUID] = None


# ── Designations ────────────────────────────────────────────────
class DesigCreate(BaseModel):
    designation_name: str
    function_id: Optional[UUID] = None  # Optional based on your model
    designation_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_by: Optional[UUID] = None
