from typing import Any, Dict, Optional, Union
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class StepPayload(BaseModel):
    route: Optional[str] = None
    is_completed: Optional[bool] = True
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SaveWizardStepRequest(BaseModel):
    project_id: Optional[Union[UUID, str]] = None
    current_step: str
    last_route: str
    step_key: Optional[str] = None  # e.g. "step_1_project_details", "step_2_assessment_type"
    step_payload: Optional[StepPayload] = None
    step_data: Optional[Dict[str, Any]] = None  # direct dictionary if saving multiple steps at once


class WizardSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: Any
    project_id: Any
    user_id: Any
    current_step: str
    last_route: str
    is_completed: bool = False
    step_data: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CompleteWizardRequest(BaseModel):
    project_id: Union[UUID, str]

