from dataclasses import dataclass
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from core.time import get_current_timestamp


class ScoredValue(BaseModel):
    value: str
    confidence: float = Field(..., description="0.0 to 1.0")


class ScoredCategory(BaseModel):
    value: str = Field(
        ..., description="Dictionary containing the extracted data as key-value pairs"
    )
    confidence: float = Field(
        ..., description="Confidence score between 0.0 and 1.0", ge=0.0, le=1.0
    )


class IntentExtraction(BaseModel):
    # Career Context
    current_role: Optional[ScoredValue] = Field(None, description="User's current role")
    experience: Optional[ScoredValue] = Field(
        None, description="User's work experience"
    )
    education: Optional[ScoredValue] = Field(
        None,
        description="User's education(e.g., what degree user have done, till what user have read etc.)",
    )
    career_goals: Optional[ScoredValue] = Field(
        None, description="User's career goals mentioned in the message"
    )

    # Canonical Fields
    learning_scope: Optional[ScoredValue] = Field(
        None,
        description="The thematic boundary or subject matter. Identifies the specific knowledge area, technology, or skill to be mastered (e.g., 'React Native', 'Project Management').",
    )
    learning_objective: Optional[ScoredValue] = Field(
        None,
        description="The intended terminal state or 'Why'. Defines the success criteria, such as career transitions, exam preparation, or project completion.",
    )
    starting_profile: Optional[ScoredValue] = Field(
        None,
        description="The learner's current baseline. Includes years of experience, current role, or prerequisite knowledge. Covers both individuals and cohorts.",
    )
    learning_pace: Optional[ScoredValue] = Field(
        None,
        description="The temporal constraints and intensity. Captures deadlines (e.g., 'by Dec'), weekly commitment (e.g., '5hrs/week'), or total duration.",
    )

    # Intent Signals
    intent_signals: Optional[ScoredCategory] = Field(
        None,
        description="""Intent detection signals. values should contain boolean flags like:
        - edit_roadmap: user give the instuction to edit the existing roadmap
        - detected_no_change: user doesn't want modifications
        - detected_clarification: user is answering a question
        - detected_roadmap_request: user wants to generate/see roadmap""",
    )

    preferences: Optional[ScoredCategory] = Field(
        None,
        description="User preferences about learning style, resources, tools, etc.",
    )
    constraints: Optional[ScoredCategory] = Field(
        None, description="Time, budget, or other constraints mentioned by user"
    )
    context: Optional[ScoredCategory] = Field(
        None, description="Additional context about user's situation"
    )
    org_context: Optional[ScoredCategory] = Field(
        None, description="Organization or work-related context if mentioned"
    )


# for generate_clarification node
class ClarificationQuestion(BaseModel):
    """
    Output schema for generate_clarification node.
    Exactly one field, exactly one question.
    """

    field: Literal[
        "learning_scope", "learning_objective", "starting_profile", "learning_pace"
    ] = Field(..., description="The canonical field this question is trying to clarify")

    question: str = Field(
        ...,
        min_length=5,
        description="A single, concise clarification question to ask the user",
    )


class CareerContextGatheringQuestion(BaseModel):
    """
    Output schema for career_context_gatherer node.
    Exactly one question combining all the fields.
    """

    # field: Literal[
    #     "learning_scope", "learning_objective", "starting_profile", "learning_pace"
    # ] = Field(..., description="The canonical field this question is trying to clarify")

    question: str = Field(
        ...,
        min_length=5,
        description="A single, concise question to ask the user",
    )


class RoadmapGenerationPromptGeneration(BaseModel):
    """
    Output schema for prepare_approval node.
    Generate prompt which can be used to generate roadmap structure
    """

    prompt: str = Field(
        ...,
        min_length=5,
        description="A single and detailed bu not noisey prompt which will be used to generate roadmap",
    )


class SSEMessage(BaseModel):
    # --- Identity & ordering ---
    message_id: str = Field(..., description="Unique message id for dedup/replay")
    timestamp: datetime = Field(
        default_factory=get_current_timestamp, description="Message creation time (IST)"
    )

    thread_id: str
    user_id: Optional[str] = None
    role: Optional[Literal["human", "assistant"]] = None

    content: Optional[list[dict] | str] = Field(
        None, description="Human-readable message content"
    )
    overwrite: bool = False


# edit roadmap node
class Position(BaseModel):
    type: Literal["start", "end", "before", "after"] = "end"
    anchor: Optional[str] = None


class RoadmapEditOp(BaseModel):
    op: Literal[
        "remove_node",
        "update_title",
        "update_level",
        "add_topic",
        "add_module",
        "add_subtopic",
        "move_node",
    ]
    path: Optional[str] = Field(
        None,
        description="Existing target/parent path from annotated DSL, e.g. t1, t1.m2, t1.m2.s3.",
    )
    value: Optional[str] = Field(
        None,
        description="New title text or full DSL line/subtree for add/update operations.",
    )
    level: Optional[Literal[1, 2, 3]] = None
    position: Optional[Position] = None
    target_parent: Optional[str] = Field(
        None, description="Destination parent path for move_node."
    )
    id: Optional[str] = Field(
        None, description="Temporary id for newly added module/topic."
    )
    ref: Optional[str] = Field(
        None, description="Temporary id of a prior add op to use as parent."
    )
    reason: Optional[str] = Field(
        None, description="1-2 sentence explaining why this op"
    )


class RoadmapDslEditPlan(BaseModel):
    ops: List[RoadmapEditOp] = Field(default_factory=list)
    message: str = Field(
        "",
        description="""Brief details of whats changed from earlier version in formatter markdown format, 
        - For multiple changes are there then write them in markdown list.
        - When tagging some dsl node name wrap them in inline code(e.g. `node name`). Also give a bit of explaination of why they changed. 
        - In node name in message only include the node name no symbols at start like `-` or knowledge level indecator. 
            - Example good names 
            - For node name `### Introduction to agentic ai` --> `Introduction to agentic ai`
            - For node name `- Supervised Learning [3]` --> `Supervised Learning`
        - Keep the tone of a human who edits based on instruction.
        - [CRITICAL]In case no ops list is empty then provide justification for that also""",
    )


@dataclass
class NodeInfo:
    path: str
    content: str
    line: int
    level: int  # title=0, topic=1, module=2, subtopic=3
    end: int
