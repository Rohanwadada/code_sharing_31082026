import logging

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph

from modules.roadmap_agent.nodes.analyze_intent import analyze_intent
from modules.roadmap_agent.nodes.create_roadmap import create_roadmap
from modules.roadmap_agent.nodes.edit_roadmap import edit_roadmap
from modules.roadmap_agent.nodes.gather_career_context import (
    await_career_context_response,
    gather_career_context,
)
from modules.roadmap_agent.nodes.generate_clarification import (
    await_clarification_response,
    generate_clarification,
)
from modules.roadmap_agent.nodes.prepare_approval import (
    await_approval_response,
    prepare_approval,
)
from modules.roadmap_agent.nodes.router import route_decision, router
from modules.roadmap_agent.state import RoadmapCoachState

logger = logging.getLogger(__name__)


class RoadmapGeneratorGraphManager:
    async def get_graph(self, checkpointer: AsyncPostgresSaver | None):
        builder = StateGraph(RoadmapCoachState)

        builder.add_node("analyze_intent", analyze_intent)  # type: ignore
        builder.add_node("router", router)

        # career context gathring flow
        builder.add_node("gather_career_context", gather_career_context)
        builder.add_node("await_career_context_response", await_career_context_response)

        # clarification flow
        builder.add_node("generate_clarification", generate_clarification)
        builder.add_node("await_clarification_response", await_clarification_response)  # type: ignore

        # approval flow
        builder.add_node("prepare_approval", prepare_approval)
        builder.add_node("await_approval_response", await_approval_response)

        builder.add_node("create_roadmap", create_roadmap)  # type: ignore

        # incremental editing flow
        builder.add_node("edit_roadmap", edit_roadmap)  # type: ignore

        builder.add_edge(START, "analyze_intent")
        builder.add_edge("analyze_intent", "router")

        # ccg loop
        builder.add_edge("gather_career_context", "await_career_context_response")
        builder.add_edge("await_career_context_response", "analyze_intent")

        # clarification loop
        builder.add_edge("generate_clarification", "await_clarification_response")
        builder.add_edge("await_clarification_response", "analyze_intent")

        # approval loop
        builder.add_edge("prepare_approval", "await_approval_response")
        builder.add_edge("await_approval_response", "create_roadmap")

        # incremental editing loop
        builder.add_edge("edit_roadmap", END)

        # conditional edge
        builder.add_conditional_edges(
            "router",
            route_decision,
            {
                "gather_career_context": "gather_career_context",
                "generate_clarification": "generate_clarification",
                "prepare_approval": "prepare_approval",
                "create_roadmap": "create_roadmap",
                "edit_roadmap": "edit_roadmap",
                "end": END,
                # "generate_content": "generate_content",
                # "recommend_courses": "recommend_courses",
            },
        )

        self._graph = builder.compile(checkpointer=checkpointer)

        print(self._graph.nodes)

        logger.info("LangGraph compiled (ASYNC CHECKPOINTER)")
        return self._graph
