import logging
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime
from langsmith import traceable

from core.exception import AgentExecutionError
from modules.doubt_solver_agent.prompts import DRAFT_RESPONSE_SYSTEM_INSTRUCTION
from modules.doubt_solver_agent.state import DoubtSolverAgentState
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.utils import check_stop_signal, pseudo_stream_text
from shared.llm.gemini import get_gemini_instance
from shared.sse_stream import publish_content_block

logger = logging.getLogger(__name__)


@traceable(name="Draft response")
async def draft_response(
    state: DoubtSolverAgentState, config: RunnableConfig, runtime: Runtime[GraphContext]
) -> Dict[str, Any]:
    logger.info("Running draft response. . .")
    run_id = config.get("configurable", {}).get("run_id")
    thread_id, user_id = state["thread_id"], state["user_id"]

    message_id = config.get("configurable", {}).get("message_id")
    is_retry = bool(config.get("configurable", {}).get("is_retry"))
    organization_id = config.get("configurable", {}).get("organization_id")
    team_id = config.get("configurable", {}).get("team_id")
    logger.info(f"LOG: {run_id} :: {thread_id} :: {user_id} :: {message_id}")

    thread_service = runtime.context.thread_service

    try:
        await check_stop_signal(
            thread_id=thread_id,
            user_id=user_id,
            run_id=str(run_id),
            node_name="draft_response",
            message_id=str(run_id if not is_retry else message_id),
        )

        user_message = state["user_message"]
        message_intent = state["message_intent"]
        past_messages = config.get("configurable", {}).get("past_messages", "")
        context = state["context"]

        llm = get_gemini_instance(model="gemini-2.5-flash")

        human_message = """
Help the user by answering the query
user_message: {user_message}
message_intent: {message_intent}
context: {context}
past_messages: {past_messages}
        """

        prompt_messages = [
            SystemMessage(content=DRAFT_RESPONSE_SYSTEM_INSTRUCTION),
            HumanMessage(
                content=human_message.format(
                    user_message=user_message,
                    message_intent=message_intent,
                    context=context,
                    past_messages=past_messages,
                )
            ),
        ]

        response = llm.invoke(prompt_messages)

        result = str(response.content).strip("`").lstrip("markdown").strip()

        first_chunk = is_retry
        for chunk in pseudo_stream_text(result):
            text_content = [{"type": "text", "data": {"text": chunk}}]

            await publish_content_block(
                message_id=str(run_id if not is_retry else message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=text_content,
                overwrite=first_chunk,
            )
            first_chunk = False

        logger.info(f"Drafted response: {result}")

        content = [{"type": "text", "data": {"text": result}}]
        await thread_service.save_conversation_to_db(
            organization_id=str(organization_id),
            team_id=team_id,
            message_id=str(run_id if not is_retry else message_id),
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=content,
            mode="update" if not is_retry else "overwrite",
        )

        # new_message_window = add_turn(messages=state["message_window"], human_message=user_message, assistant_message=result, max_length=MAX_LENGTH)

        return {}
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
            message="Final response generation failed",
            node="draft_response",
            roadmap_id=config.get("configurable", {}).get("roadmap_id"),
            message_id=str(run_id if not is_retry else message_id),
            original_error=str(e),
        ) from e


def add_turn(
    messages: List[str], human_message: str, assistant_message: str, max_length: int
) -> List[str]:
    messages.extend(
        [
            f"""#Human
{human_message}""",
            f"""#Assistant
{assistant_message}""",
        ]
    )

    if len(messages) > 6:
        messages = messages[-max_length:]
    return messages
