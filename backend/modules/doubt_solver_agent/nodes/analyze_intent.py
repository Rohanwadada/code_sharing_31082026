import logging
from typing import Any, Dict, cast
from uuid import uuid4

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig

from core.exception import AgentExecutionError
from modules.doubt_solver_agent.prompts import INTENT_ANALYSIS_SYSTEM_INSTRUCTION
from modules.doubt_solver_agent.schema import IntentExtraction
from modules.doubt_solver_agent.state import DoubtSolverAgentState
from modules.roadmap_agent.utils import check_stop_signal
from shared.llm.gemini import get_gemini_instance

logger = logging.getLogger(__name__)


async def analyze_intent(
    state: DoubtSolverAgentState, config: RunnableConfig
) -> Dict[str, Any]:

    try:
        logger.info("Running Intent analysis")
        is_retry = bool(config.get("configurable", {}).get("is_retry"))
        run_id = config.get("configurable", {}).get("run_id")
        message_id = config.get("configurable", {}).get("message_id")
        thread_id, user_id = state["thread_id"], state["user_id"]

        await check_stop_signal(
            thread_id=thread_id,
            user_id=user_id,
            run_id=str(run_id),
            node_name="analyze_intent",
            message_id=str(run_id if not is_retry else message_id),
        )

        user_message = state["user_message"]
        past_messages = config.get("configurable", {}).get("past_messages", "")

        llm = get_gemini_instance(model="gemini-2.5-flash-lite")
        structured_llm = llm.with_structured_output(IntentExtraction)

        human_message = """
Analyze the user intent
user_message: {user_message}
past_messages: {past_messages}
        """

        prompt_messages = [
            SystemMessage(content=INTENT_ANALYSIS_SYSTEM_INSTRUCTION),
            HumanMessage(
                content=human_message.format(
                    user_message=user_message, past_messages=past_messages
                )
            ),
        ]

        result: IntentExtraction = cast(
            IntentExtraction, structured_llm.invoke(prompt_messages)
        )

        logger.info(f"Intent analysis result : {result}")

        updates = {"message_intent": result.intent, "safety_index": result.safety_index}

        return updates
    except Exception as e:
        if isinstance(e, AgentExecutionError):
            ctx = getattr(e, "context", {})

            raise AgentExecutionError(
                message=str(e),
                node=ctx.get("node"),
                roadmap_id=config.get("configurable", {}).get("roadmap_id"),
                message_id=ctx.get("message_id"),
                original_error=ctx.get("original_error"),
                reason=ctx.get("reason"),
            ) from e
        raise AgentExecutionError(
            message="Intent Analysis failed",
            node="analyze_intent",
            message_id=str(uuid4()),
            roadmap_id=config.get("configurable", {}).get("roadmap_id"),
            original_error=str(e),
        ) from e
