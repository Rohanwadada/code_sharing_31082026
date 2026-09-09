import operator
from pydantic import BaseModel, Field, conlist
from typing import Annotated, List, Literal, Optional

from app.models.competency import CompetencyItem


class JDCompetency(BaseModel):
    name: str = Field(..., description="Competency name extracted from the JD")
    definition: str = Field(..., description="Assessment-ready definition of the competency")


class JDCompetencyExtractionOutput(BaseModel):
    jd_text: str = Field(..., description="Original JD content")
    competencies: List[JDCompetency] = Field(..., 
                                             min_length=3,
                                             max_length=9,
                                             description="Competencies extracted from the JD")


class JDSingleCompetencyCombinationInput(BaseModel):
    jd_text: str = Field(..., description="Original JD content")
    competencies: List[JDCompetency] = Field(
        ...,
        min_length=1,
        max_length=1,
        description="Exactly one competency to generate sub-competencies for",
    )


class JDSubCompetency(BaseModel):
    sub_competency: str = Field(..., description="Sub-competency name")
    sub_competency_def: str = Field(..., description="Assessment-ready definition of the sub-competency")


class JDCompetencyCombination(BaseModel):
    competency: str = Field(..., description="Parent competency name")
    competency_def: str = Field(..., description="Parent competency definition")
    sub_competencies: List[JDSubCompetency] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="Between 2 and 5 sub-competencies for the parent competency",
    )


class JDCompetencyCombinationOutput(BaseModel):
    jd_text: str = Field(..., description="Original JD content")
    importance_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Score from 0.0 to 100.0 indicating how strongly the competency and its sub-competencies represent the JD for assessment",
    )
    importance_score_explanation: str = Field(
        ...,
        description="Concise explanation of why the importance score was assigned",
    )
    combinations: List[JDCompetencyCombination] = Field(
        ...,
        min_length=1,
        max_length=1,
        description="Exactly one competency to sub-competency combination",
    )


class JDCompetencyCompatibilityOutput(JDCompetencyCombinationOutput):
    compatible_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Score from 0.0 to 100.0 indicating how relevant the competency and sub-competencies are to the JD",
    )
    compatible_explanation: str = Field(
        ...,
        description="Concise explanation of the compatibility score based only on JD text, competency, and sub-competencies",
    )


class JDScoredCompetencyItem(CompetencyItem):
    score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Score from 0.0 to 100.0 indicating final JD relevance and assessment value",
    )
    score_explanation: str = Field(..., description="Concise explanation of why the score was assigned")


class JDScoredCompetencyUploadResponse(BaseModel):
    items: List[JDScoredCompetencyItem] = Field(
        ...,
        max_length=20,
        description="Top scored competency/sub-competency items",
    )


class JDCompetencyGraphState(BaseModel):
    jd_text: str = Field(..., description="Original JD content")
    competency_extraction: Optional[JDCompetencyExtractionOutput] = Field(
        default=None,
        description="Extracted top-level JD competencies",
    )
    current_competency_index: int = Field(default=0, ge=0, description="Current competency index being processed")
    current_competency: Optional[JDCompetency] = Field(default=None, description="Current competency being processed")
    current_combination: Optional[JDCompetencyCombinationOutput] = Field(
        default=None,
        description="Latest generated sub-competency combination for the current competency",
    )
    current_compatibility: Optional[JDCompetencyCompatibilityOutput] = Field(
        default=None,
        description="Latest compatibility judgement for the current competency combination",
    )
    best_attempt: Optional[JDCompetencyCompatibilityOutput] = Field(
        default=None,
        description="Best compatibility attempt for the current competency",
    )
    current_attempts: int = Field(default=0, ge=0, description="Generation attempts for the current competency")
    max_attempts: int = Field(default=3, ge=1, description="Maximum regeneration attempts per competency")
    compatibility_threshold: float = Field(default=90.0, ge=0.0, le=100.0, description="Passing compatibility score")
    combination_list: Annotated[List[JDCompetencyCompatibilityOutput], operator.add] = Field(
        default_factory=list,
        description="Accepted or best-attempt competency combinations",
    )
    final_output: Optional[JDScoredCompetencyUploadResponse] = Field(
        default=None,
        description="Final flattened top competency/sub-competency items",
    )


class SubCompetencyInput(BaseModel):
    competency: str
    competency_definition: str
    sub_competency: str
    sub_competency_definition: str
    feedback: Optional[str] = Field(default="Not Applicable", description="Feedback for the sub-competency.")

class AgentInputState(BaseModel):
    experience_level: str
    competencies: List[SubCompetencyInput]

class QuestionTypeDecision(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    is_programming_suitable: bool = Field(..., description="Whether programming questions are suitable for this sub-competency")
    is_non_programming_suitable: bool = Field(..., description="Whether non-programming questions are suitable for this sub-competency")
    num_programming_questions: int = Field(..., description="Number of programming questions out of 3")
    num_non_programming_questions: int = Field(..., description="Number of non-programming questions out of 3")
    rationale: str = Field(..., description="Brief reasoning for why this split was chosen based on the experience level and definitions.")

class NodeDecisionOutput(BaseModel):
    decisions: List[QuestionTypeDecision] = Field(..., description="Decisions for each sub-competency provided in the input.")

class JudgeDecision(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    is_approved: bool = Field(..., description="Whether the original decision is approved")
    relevance_score: float = Field(..., ge=0.0, le=100.0, description="Score from 0.0 to 100.0 indicating how relevant and reasonable the proposed split is for the given competency and sub-competency")
    feedback: str = Field(..., description="Actionable feedback only. Must not reference or repeat the evaluated split numbers. Should state what to change and why, without mentioning the original counts.")

class NodeJudgeOutput(BaseModel):
    judgements: List[JudgeDecision] = Field(..., description="Judgements for each decision provided in the input.")

class BusinessScenarioInput(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    num_programming_questions: int = Field(..., ge=0, le=3, description="Number of programming scenarios to generate")
    num_non_programming_questions: int = Field(..., ge=0, le=3, description="Number of non-programming scenarios to generate")
    feedback: Optional[str] = Field(default="Not Applicable", description="Feedback for the generated business scenario.")

class BusinessScenarioInputState(BaseModel):
    decisions: List[BusinessScenarioInput] = Field(..., description="Question type decisions that need business scenarios")

class BusinessScenario(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    question_type: Literal["programming", "non-programming"] = Field(..., description="The type of question this scenario supports")
    scenario_title: str = Field(..., description="Short title for the business scenario")
    business_scenario: str = Field(..., description="Valid, realistic business context for the assessment question")
    feedback: Optional[str] = Field(default="Not Applicable", description="Feedback for regenerating or improving the question from this scenario.")

class BusinessScenarioOutput(BaseModel):
    scenarios: List[BusinessScenario] = Field(..., description="Generated business scenarios for all requested questions")

class BusinessScenarioValidationInputState(BaseModel):
    scenarios: List[BusinessScenario] = Field(..., description="Business scenarios that need relevance validation")

class BusinessScenarioValidation(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    question_type: Literal["programming", "non-programming"] = Field(..., description="The type of question this scenario supports")
    scenario_title: str = Field(..., description="Short title for the business scenario")
    business_scenario: str = Field(..., description="Business scenario that was validated")
    relevance_score: float = Field(..., ge=0.0, le=100.0, description="Score from 0.0 to 100.0 indicating relevance to competency, sub-competency, and question type")
    is_approved: Literal["Yes", "No"] = Field(..., description="Yes if relevance_score is greater than or equal to 60, otherwise No")
    feedback: str = Field(..., description="Actionable regeneration feedback that does not repeat or summarize scenario-specific information")

class BusinessScenarioValidationOutput(BaseModel):
    validations: List[BusinessScenarioValidation] = Field(..., description="Validation results for each business scenario")

class MCQGenerationInputState(BaseModel):
    scenarios: List[BusinessScenario] = Field(..., description="Business scenarios used to generate MCQ questions")

class GeneratedMCQQuestion(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    question_type: Literal["programming", "non-programming"] = Field(..., description="The type of question generated")
    scenario_title: str = Field(..., description="Short title for the business scenario")
    business_scenario: str = Field(..., description="Business scenario used to generate the question")
    code_snippet: str = Field(..., description="Programming code snippet for programming questions; empty string for non-programming questions")
    question: str = Field(..., description="Application-level MCQ stem based on the business scenario")
    options: conlist(str, min_length=4, max_length=4) = Field(..., description="Exactly four answer options")
    correct_option: Literal["A", "B", "C", "D"] = Field(..., description="The single correct option")
    correct_answer: str = Field(..., description="The full text of the correct answer option")
    correct_answer_explanation: str = Field(..., description="Concise explanation of why the correct answer is best and why the distractors are weaker")
    feedback: Optional[str] = Field(default="Not Applicable", description="Feedback for regenerating or improving this MCQ.")

class MCQGenerationOutput(BaseModel):
    questions: List[GeneratedMCQQuestion] = Field(..., description="Generated MCQ questions for the provided scenarios")

class RegenerateMCQInput(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    level: str = Field(..., description="Question level displayed in the UI")
    question_type: Literal["programming", "non-programming"] = Field(..., description="The type of question to regenerate")
    scenario_title: str = Field(..., description="Short title for the business scenario")
    business_scenario: str = Field(..., description="Business scenario to keep for regeneration")
    code_snippet: str = Field(default="", description="Existing code snippet for programming questions")
    current_question: str = Field(..., description="Current question stem to replace")
    current_options: conlist(str, min_length=4, max_length=4) = Field(..., description="Current four answer options")
    current_correct_option: str = Field(..., description="Current correct option label")
    current_correct_answer: str = Field(..., description="Current correct answer text")
    current_correct_answer_explanation: str = Field(..., description="Current answer explanation")
    regeneration_scope: Literal["single_question"] = Field(default="single_question", description="Regeneration scope")

class RegeneratedMCQQuestion(BaseModel):
    competency: str = Field(..., description="The competency name")
    sub_competency: str = Field(..., description="The sub-competency name")
    question_type: Literal["programming", "non-programming"] = Field(..., description="The type of question regenerated")
    scenario_title: str = Field(..., description="Short title for the business scenario")
    business_scenario: str = Field(..., description="Business scenario used for the regenerated question")
    code_snippet: str = Field(..., description="Code snippet for programming questions; empty string for non-programming questions")
    question: str = Field(..., description="Regenerated MCQ stem")
    options: conlist(str, min_length=4, max_length=4) = Field(..., description="Exactly four regenerated answer options")
    correct_option: Literal["A", "B", "C", "D"] = Field(..., description="The single correct option")
    correct_answer: str = Field(..., description="The full text of the correct answer option")
    correct_answer_explanation: str = Field(..., description="Concise explanation of why the correct answer is best")

class RegenerateMCQInputWithFeedback(RegenerateMCQInput):
    feedback: str = Field(..., description="feedback from user, to be used for the new question")

class RegeneratedMCQQuestionWithFeedback(RegeneratedMCQQuestion):
    provided_feedback: str = Field(..., description="provided user feedback")

class GraphState(BaseModel):
    item: SubCompetencyInput = Field(..., description="Single isolated sub-competency item being processed")
    experience_level: str = Field(default="mid senior", description="Experience level used for question type decisions")
    question_type_decision: Optional[NodeDecisionOutput] = Field(default=None, description="Latest question type decision")
    question_type_judgement: Optional[NodeJudgeOutput] = Field(default=None, description="Latest question type judge result")
    question_type_feedback: Optional[str] = Field(default=None, description="Feedback used to regenerate question type decisions")
    business_scenarios: Optional[BusinessScenarioOutput] = Field(default=None, description="Latest generated business scenarios")
    scenario_validations: Optional[BusinessScenarioValidationOutput] = Field(default=None, description="Latest business scenario validation results")
    scenario_feedback: Optional[str] = Field(default=None, description="Feedback used to regenerate business scenarios")
    mcq_questions: Optional[MCQGenerationOutput] = Field(default=None, description="Generated MCQ questions")
    question_type_iterations: int = Field(default=0, ge=0, description="Number of question type generation attempts")
    scenario_iterations: int = Field(default=0, ge=0, description="Number of business scenario generation attempts")
    max_question_type_iterations: int = Field(default=3, ge=1, description="Maximum question type regeneration attempts")
    max_scenario_iterations: int = Field(default=3, ge=1, description="Maximum business scenario regeneration attempts")
