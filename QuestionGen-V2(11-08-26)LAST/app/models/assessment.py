from pydantic import BaseModel, Field
from typing import List, Literal, Optional

from app.models.competency import CompetencyItem, GeneratedQuestionRow

ImportanceLevel = Literal["must_have", "good_to_have", "icing_on_cake"]
AssessmentFormatType = Literal["static", "randomized"]

QUESTIONS_PER_SUB_COMPETENCY = 3
MINUTES_PER_QUESTION = 1


class UploadedFileInfo(BaseModel):
    filename: str = Field(..., description="Original uploaded filename")
    file_size_bytes: int = Field(..., description="File size in bytes")
    file_size_display: str = Field(..., description="Human-readable file size")


class ReviewCompetencyItem(CompetencyItem):
    row_number: int = Field(..., description="Display row number in the review table")
    importance: ImportanceLevel = Field(default="must_have", description="Priority level for this sub-competency")
    add_to_test: bool = Field(default=True, description="Whether this sub-competency is included in the assessment")


class CompetencyReviewSummary(BaseModel):
    total_competencies: int = Field(..., description="Count of unique competencies")
    total_sub_competencies: int = Field(..., description="Count of all sub-competencies in the upload")
    selected_sub_competencies: int = Field(..., description="Sub-competencies marked add_to_test")
    total_questions: int = Field(..., description="Auto-calculated question count (3 per selected sub-competency)")
    estimated_duration_minutes: int = Field(..., description="Auto-calculated duration in minutes")


class AssessmentUploadResponse(BaseModel):
    project_id: str = Field(..., description="Project this upload belongs to")
    session_id: str = Field(..., description="Session id to reference this upload through the review flow")
    file: UploadedFileInfo
    items: List[ReviewCompetencyItem] = Field(..., description="Parsed competency rows for review")
    summary: CompetencyReviewSummary


class CompetencyReviewRequest(BaseModel):
    session_id: str = Field(..., description="Upload session id")
    items: List[ReviewCompetencyItem] = Field(..., description="Reviewed items with importance and add_to_test selections")


class CompetencyReviewResponse(BaseModel):
    project_id: str
    session_id: str
    items: List[ReviewCompetencyItem]
    summary: CompetencyReviewSummary


class AssessmentConfig(BaseModel):
    format_type: AssessmentFormatType = Field(..., description="Static or randomized assessment format")
    shuffle_per_candidate: bool = Field(
        default=False,
        description="When static, shuffle question order per candidate",
    )


class AssessmentGenerateRequest(BaseModel):
    session_id: str = Field(..., description="Upload session id")
    items: List[ReviewCompetencyItem] = Field(..., description="Final reviewed competency selections")
    assessment: AssessmentConfig = Field(..., description="Assessment format configuration")


class AssessmentGenerateResponse(BaseModel):
    job_id: str = Field(..., description="Background generation job id")
    status: Literal["queued", "running", "completed", "failed"] = Field(..., description="Current job status")
    assessment: AssessmentConfig
    summary: CompetencyReviewSummary
    combination_count: Optional[int] = Field(
        default=None,
        description="For randomized format, number of possible question combinations",
    )


class AssessmentQuestionListResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "cancelling", "cancelled", "completed", "failed"]
    assessment: AssessmentConfig
    summary: CompetencyReviewSummary
    combination_count: Optional[int] = None
    total_questions: int = Field(default=0, description="Total generated questions so far")
    questions: List[GeneratedQuestionRow] = Field(default_factory=list)
