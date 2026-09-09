from typing import List, Literal, TypedDict


class DoubtSolverAgentState(TypedDict):
    thread_id: str
    user_id: str

    # latest user input
    user_message: str

    message_intent: List[Literal["roadmap_or_chapter", "general"]]
    safty_index: Literal[0, 1]

    message_window: List[str]

    context: List[str]
