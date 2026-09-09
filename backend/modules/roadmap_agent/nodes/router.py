from modules.roadmap_agent.state import RoadmapCoachState


def router(state: RoadmapCoachState):
    """
    Computes missing_fields and prepares state.
    Does NOT decide next node.
    """

    print("\n\nIn router Node\n\n")

    missing_fields = [
        field
        for field in [
            "learning_scope",
            "learning_objective",
            "starting_profile",
            "learning_pace",
        ]
        if not state.get(field)
    ]

    print("\n\nIn Router Node\n\n")
    print(f"Missing Fields: {missing_fields}")

    career_context_missing_fields = [
        field
        for field in [
            "current_role",
            "experience",
            "education",
            "career_goals",
        ]
        if not state.get(field)
    ]
    print("\n\nIn Router Node\n\n")
    print(f"Career Cintext Missing Fields: {career_context_missing_fields}")

    return {"missing_fields": missing_fields}


def route_decision(state: RoadmapCoachState) -> str:
    """
    Decides the next node based on current state.
    """
    print("\n\nIn routing descision\n\n")

    if state.get("force_create_roadmap", False):
        return "create_roadmap"

    career_context_missing_fields = [
        field
        for field in [
            "current_role",
            "experience",
            "education",
            "career_goals",
        ]
        if not state.get(field)
    ]

    if bool(state.get("roadmap_created")) and bool(
        state.get("extra_requirements", {})
        .get("intent_signals", {})
        .get("edit_roadmap")
    ):
        return "edit_roadmap"

    if len(career_context_missing_fields) > 0:
        print("\nMoving to CAREER CONTEXT GATHERER NODE\n")
        return "gather_career_context"

    if state.get("missing_fields") and state.get("clarification_count", 0) < 3:
        print("\nMoving to ASK CLARIFICATION NODE\n")
        return "generate_clarification"

    return "prepare_approval"
