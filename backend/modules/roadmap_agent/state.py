from typing import Optional, TypedDict


class RoadmapCoachState(TypedDict):
    thread_id: str
    user_id: str

    # latest user input
    user_message: str

    # career context fields
    current_role: Optional[str]
    experience: Optional[str]
    education: Optional[str]
    career_goals: Optional[str]

    # canonical understanding (single-valued, identity)
    learning_scope: Optional[str]
    learning_objective: Optional[str]
    starting_profile: Optional[str]
    learning_pace: Optional[str]

    # structured extra context (slot-based, bounded)
    extra_requirements: dict

    # intent & clarification control
    missing_fields: list[str]
    clarification_count: int
    last_asked_field: Optional[str]

    # approval phase
    approval_variants: Optional[list[dict]]
    selected_variant_index: Optional[int]

    # lifecycle
    user_approved: bool
    roadmap_created: bool
    roadmap_generation_prompt: dict

    # message tracking
    assistant_message: Optional[str]

    # extra variables
    time_commitment: Optional[str]

    # post roadmap events
    # action: Optional[Literal["generate_content", "recommend_courses"]]

    # forced graph manipulations
    force_create_roadmap: Optional[bool]
