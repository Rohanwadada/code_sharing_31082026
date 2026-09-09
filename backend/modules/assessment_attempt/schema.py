from enum import StrEnum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class AssessmentType(StrEnum):
    SKILL_GAP_ASSESSMENT = "skill_gap_assessment"
    ROADMAP_LEARNING_ASSESSMENT = "roadmap_learning_assessment"


class ExamDetailsRequest(BaseModel):
    organization_id: str
    project_id: str = ""
    assessment_id: str
    assessment_type: AssessmentType
    roadmap_id: str | None
    
class ExamDetails(BaseModel):
    exam_name: str
    exam_type: str
    exam_category: str | None = None
    exam_sub_category: str | None = None
    exam_status: str
    exam_image: str | None = None
    exam_description: str = ""
    exam_instruction: list[str] = []
    exam_duration: int = 0
    allowed_tab_toggle_time: int = 0
    number_of_question_appeared_from_each_subcompetency: int = 3
    number_of_question_appeared_for_descriptive: int = 1
    appearence_limit: int = 1
    access_for_all: bool = False
    has_mcq_moq: bool = False
    has_saq: bool = False
    average_rating: float = 3.2
    number_of_ratings: int = 12
    number_of_learners_taken_exam: int = 121
    number_of_competencies: int = 0
    number_of_total_question: int = 54


class AllocateExam(BaseModel):
    organization_id: str
    project_id: str
    assessment_id: str
    assessment_type: AssessmentType
    roadmap_id: str | None


class AnswerPayload(BaseModel):
    id: str
    attempted: bool
    selected_option: Optional[str] = None
    time_taken: Optional[str] = "00:00:00:000"

    # This ensures any extra fields the frontend sends aren't lost
    # when we save it to submission_details later
    model_config = ConfigDict(extra="allow")


class EvaluateExamPayload(BaseModel):
    test_id: str
    examStartTime: Optional[str] = ""
    examEndTime: Optional[str] = ""
    submission_mode: Optional[str] = "online"
    submitted: bool
    answers: List[AnswerPayload]

    organization_id: str
    team_id: str | None

    roadmap_id: str | None = None
    node_id: str | None = None

    model_config = ConfigDict(extra="allow")


class SolutionExplanationPayload(BaseModel):
    allocation_id: str
