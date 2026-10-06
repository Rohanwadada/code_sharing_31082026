from enum import StrEnum
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, model_validator

from core.exception import BadRequestException


class SubCompetencyPriority(StrEnum):
    MUST_HAVE = "must have"
    GOOD_TO_HAVE = "good to have"
    ICING_ON_THE_CAKE = "icing on the cake"


class AssessmentAllocationMode(StrEnum):
    STATIC = "static"
    RANDOMIZED = "randomized"


class Question(BaseModel): ...


class QuestionGroup(BaseModel):
    competency: str
    sub_competency: str
    competency_definition: str = ""
    sub_competency_definition: str = ""
    priority: SubCompetencyPriority = SubCompetencyPriority.MUST_HAVE
    questions: list[dict[str, Any]] = []
    add_to_test: bool = True

    competency_id: Optional[str] = None
    sub_competency_id: Optional[str] = None


# #changes 28-09-2026 - start: Make organization_id optional for learner/self projects
# class CreateAssessment(BaseModel):
#     organization_id: str
#     project_id: str
#     items: list[QuestionGroup]
#     source: str
#
#
# class UpdateAssessment(BaseModel):
#     organization_id: str
#     allocation_mode: AssessmentAllocationMode | None = None
#     shuffle: bool | None = None
#     items: list[QuestionGroup] | None = None
class CreateAssessment(BaseModel):
    organization_id: Optional[str] = None
    project_id: str
    items: list[QuestionGroup]
    source: str


class UpdateAssessment(BaseModel):
    organization_id: Optional[str] = None
    allocation_mode: AssessmentAllocationMode | None = None
    shuffle: bool | None = None
    items: list[QuestionGroup] | None = None
# #changes 28-09-2026 - end

    @model_validator(mode="after")
    def validate_shuffle(self) -> "UpdateAssessment":
        if self.allocation_mode == AssessmentAllocationMode.RANDOMIZED and self.shuffle:
            raise BadRequestException(
                "shuffle is not allowed for randomized assessment mode"
            )
        return self


# Assessment Upload Schemas


class UploadedFileInfo(BaseModel):
    filename: str
    file_size_bytes: int
    file_size_display: str


class ReviewCompetencyItem(BaseModel):
    row_number: int
    competency: str
    competency_definition: str
    sub_competency: str
    sub_competency_definition: str
    priority: Literal["must have", "good to have", "icing on the cake"] = "must have"
    add_to_test: bool = True


class CompetencyReviewSummary(BaseModel):
    total_competencies: int
    total_sub_competencies: int
    selected_sub_competencies: int


class AssessmentUploadResponse(BaseModel):
    file: UploadedFileInfo
    items: List[ReviewCompetencyItem]
    summary: CompetencyReviewSummary


class CreateFormationRequest(BaseModel):
    project_id: UUID
    assessment_formation_name: str
    estimated_duration_minutes: int
    format_type: Literal["static", "randomized"]
    shuffle_per_candidate: bool = False
    created_by: UUID
    items: List[ReviewCompetencyItem]


class EnrichedCompetencyItem(ReviewCompetencyItem):
    competency_id: UUID
    subcompetency_id: UUID


class CreateFormationResponse(BaseModel):
    assessment_formation_id: UUID
    items: List[EnrichedCompetencyItem]


class FinalizeFormationRequest(BaseModel):
    assessment_formation_id: UUID
    created_by: UUID
    questions: List[Dict[str, Any]]
