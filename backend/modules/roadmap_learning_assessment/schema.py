from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class GenerateAssessmentForAssessmentNode(BaseModel):
    organization_id: str
    team_id: str | None
    roadmap_id: str
    module_id: str
    node_id: str


class AssessmentResponse(BaseModel):
    name: str
    url: str
    
class GenerateAssessmentForAssessmentNodeResponse(BaseModel):
    status: str
    assessment: AssessmentResponse
    


class QuizGenerateRequest(BaseModel):
    topics: List[str] = Field(default_factory=list)
    count: int = Field(default=10, ge=1, le=50)
    # user_id: Optional[str] = "rohan@setuschool.com"
    roadmap_id: Optional[str] = None
    node_id: str
    roadmap_title: Optional[str] = "General Roadmap"
    roadmap_desc: Optional[str] = ""
    chapter_name: Optional[str] = "General Chapter"
    module_name: Optional[str] = "General Module"
    chapter_content: list[str] = []
    difficulty: Optional[str] = "moderate"
    custom_settings: Optional[dict] = Field(default_factory=dict)
    organization_id: str


class QuestionFormattedItem(BaseModel):
    id: str
    question: str
    options: List[str]
    answer: str
    topic: str
    subtopic: str
    topic_priority: str
    complexity: str
    chapter_name: str
    key_competency: str = "null"
    sub_competency: str = "null"
    code_snippet: Optional[str] = "null"
    hints_text: Optional[str] = "null"
    solution_explanation: str


class QuizGenerateResponse(BaseModel):
    status: str = "success"
    is_fallback: Optional[bool] = False
    warning: Optional[str] = None
    questions: List[QuestionFormattedItem]


class QuestionInputItem(BaseModel):
    question_text: Optional[str] = None
    question: Optional[str] = None
    topic: Optional[str] = "General"
    subtopic: Optional[str] = "General"
    options: List[str] = Field(default_factory=list)
    correct_answer: Optional[str] = None
    answer: Optional[str] = None
    code_snippet: Optional[str] = "null"
    hints_text: Optional[str] = "null"
    solution_explanation: Optional[str] = None


class QuizCreateRequest(BaseModel):
    roadmap_id: Optional[str] = None
    title: str = "Custom Generated Quiz"
    user_id: str = "anonymous"
    time_limit_mins: Optional[int] = 0
    question_time_limit_secs: Optional[int] = 0
    questions: List[QuestionInputItem] = Field(default_factory=list)


class QuizUpdateRequest(BaseModel):
    title: Optional[str] = None
    questions: Optional[List[QuestionInputItem]] = None


class QuizAutoGenerateRequest(QuizGenerateRequest):
    title: Optional[str] = None
    time_limit_mins: Optional[int] = 0
    question_time_limit_secs: Optional[int] = 0
    frontend_base_url: Optional[str] = "http://localhost:5173"


class QuizAutoGenerateResponse(BaseModel):
    status: str = "success"
    quiz_id: int
    title: str
    roadmap_id: Optional[str] = None
    user_id: str
    total_questions: int
    assignment_url: str
    excel_export_url: str
    is_fallback: bool = False
    warning: Optional[str] = None
    questions: List[QuestionFormattedItem]


class RoadmapGenerationPromptResponse(BaseModel):
    prompt: str
    time_commitment: Literal["tier_1", "tier_2", "tier_3", "tier_4", "tier_5"]