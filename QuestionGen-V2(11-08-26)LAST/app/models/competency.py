from pydantic import BaseModel, Field
from typing import List, Literal


class CompetencyItem(BaseModel):
    competency: str = Field(..., description="Competency name")
    competency_definition: str = Field(..., description="Definition of the competency")
    sub_competency: str = Field(..., description="Sub‑competency name")
    sub_competency_definition: str = Field(..., description="Definition of the sub‑competency")

class CompetencyUploadResponse(BaseModel):
    items: List[CompetencyItem] = Field(..., description="List of cleaned competency items")

class CompetencyGenerateRequest(BaseModel):
    items: List[CompetencyItem] = Field(..., description="Competency items to generate questions for")

class CompetencyGenerateResponse(BaseModel):
    job_id: str = Field(..., description="Background generation job id")
    status: Literal["queued", "running", "completed", "failed"] = Field(..., description="Current job status")

class GeneratedQuestionRow(BaseModel):
    id: str = Field(..., description="Stable generated question id")
    row_number: int = Field(..., description="Display row number")
    question: str = Field(..., description="Generated MCQ question stem")
    competency: str = Field(..., description="Competency name")
    sub_competency: str = Field(..., description="Sub-competency name")
    level: Literal["Medium"] = Field(default="Medium", description="Display level")
    actions: List[Literal["edit", "regenerate", "delete"]] = Field(
        default_factory=lambda: ["edit", "regenerate", "delete"],
        description="UI actions supported for the generated row",
    )
    question_type: str = Field(..., description="Generated question type")
    scenario_title: str = Field(..., description="Business scenario title")
    business_scenario: str = Field(..., description="Business scenario used for the question")
    code_snippet: str = Field(default="", description="Code snippet for programming questions")
    options: List[str] = Field(..., description="MCQ options")
    correct_option: str = Field(..., description="Correct option label")
    correct_answer: str = Field(..., description="Correct answer text")
    correct_answer_explanation: str = Field(..., description="Answer explanation")

class RegenerateQuestionRequest(BaseModel):
    question_id: str = Field(..., description="Stable generated question id")
    row_number: int = Field(..., description="Display row number")
    competency: str = Field(..., description="Competency name")
    sub_competency: str = Field(..., description="Sub-competency name")
    level: str = Field(..., description="Display level")
    question_type: str = Field(..., description="Generated question type")
    scenario_title: str = Field(..., description="Business scenario title")
    business_scenario: str = Field(..., description="Business scenario used for the question")
    code_snippet: str = Field(default="", description="Code snippet for programming questions")
    current_question: str = Field(..., description="Current MCQ question stem")
    current_options: List[str] = Field(..., min_length=4, max_length=4, description="Current MCQ options")
    current_correct_option: str = Field(..., description="Current correct option label")
    current_correct_answer: str = Field(..., description="Current correct answer text")
    current_correct_answer_explanation: str = Field(..., description="Current answer explanation")
    regeneration_scope: Literal["single_question"] = Field(default="single_question", description="Regeneration scope")

class RegenerateQuestionResponse(RegenerateQuestionRequest):
    regeneration_mode: Literal["same_scenario_new_question"] = Field(
        default="same_scenario_new_question",
        description="Regeneration mode used by the backend",
    )

class RegenerateQuestionRequestWithFeedback(RegenerateQuestionRequest):
    feedback: str = Field(..., description="feedback on the current question, will be used to generate the new one")

class RegenerateQuestionResponseWithFeedback(RegenerateQuestionRequestWithFeedback):
    regeneration_mode: Literal["with_feedback_new_question"] = Field(
        default="with_feedback_new_question",
        description="Regeneration mode with user feedback",
    )
