import logging

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph

from modules.doubt_solver_agent.nodes.analyze_intent import analyze_intent
from modules.doubt_solver_agent.nodes.draft_response import draft_response
from modules.doubt_solver_agent.nodes.inject_context import inject_context
from modules.doubt_solver_agent.state import DoubtSolverAgentState

logger = logging.getLogger(__name__)


class DoubtSolverAgentGraphManager:
    async def get_graph(self, checkpointer: AsyncPostgresSaver | None):
        builder = StateGraph(DoubtSolverAgentState)

        builder.add_node("analyze_intent", analyze_intent)
        builder.add_node("inject_context", inject_context)
        builder.add_node("draft_response", draft_response)

        # edges
        builder.add_edge(START, "analyze_intent")
        builder.add_edge("analyze_intent", "inject_context")
        builder.add_edge("inject_context", "draft_response")
        builder.add_edge("draft_response", END)

        self._graph = builder.compile(checkpointer=checkpointer)

        print(self._graph.nodes)

        logger.info("LangGraph compiled for `doubt solver agent`")
        return self._graph
