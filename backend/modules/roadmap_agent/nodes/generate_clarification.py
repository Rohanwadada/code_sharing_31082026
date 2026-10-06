import logging
import time
from typing import Any, Dict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime
from langgraph.types import interrupt

from core.exception import AgentExecutionError
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.prompts import ASK_CLARIFICATION_SYSTEM_INSTRUCTION
from modules.roadmap_agent.schema import ClarificationQuestion
from modules.roadmap_agent.state import RoadmapCoachState
from modules.roadmap_agent.utils import (
    check_stop_signal,
    get_time_commitment_by_id,
    pseudo_stream_text,
)
from modules.thread.schema import ThreadUpdate
from shared.llm.gemini import get_gemini_instance, log_token_usage
from shared.pii_analyzer import pii_analyzer
from shared.sse_stream import publish_content_block

logger = logging.getLogger(__name__)


async def generate_clarification(
    state: RoadmapCoachState, config: RunnableConfig, runtime: Runtime[GraphContext]
) -> Dict[str, Any]:
    """
    Generate the question, stream it, and save it to state.
    """

    is_retry = bool(config.get("configurable", {}).get("is_retry"))
    try:
        # safety fallback (should not normally happen)
        if not state.get("missing_fields"):
            return {}

        run_id = config.get("configurable", {}).get("run_id")
        thread_id, user_id = state["thread_id"], state["user_id"]

        message_id = config.get("configurable", {}).get("message_id")

        organization_id = config.get("configurable", {}).get("organization_id")
        team_id = config.get("configurable", {}).get("team_id")

        thread_service = runtime.context.thread_service

        await check_stop_signal(
            thread_id=thread_id,
            user_id=user_id,
            run_id=str(run_id),
            node_name="generate_clarification",
            message_id=str(run_id if not is_retry else message_id),
        )

        # anonymization init
        pii_mapping = {}

        anonymized_user_msg = pii_analyzer.anonymize_text(
            state.get("user_message", ""), pii_mapping
        )

        logger.info(f"PII MAPPING: {pii_mapping}")

        # LLM call
        llm = get_gemini_instance(temperature=0.6)
        structured_llm = llm.with_structured_output(ClarificationQuestion, strict=True, include_raw=True)

        prompt = [
            SystemMessage(content=ASK_CLARIFICATION_SYSTEM_INSTRUCTION),
            HumanMessage(
                content=f"""
Missing fields: {state["missing_fields"]}
Last asked field: {state.get("last_asked_field")}
User last message: {anonymized_user_msg}
    """
            ),
        ]

        t0 = time.time()
        res_output = structured_llm.invoke(prompt)
        raw_msg = res_output.get("raw") if isinstance(res_output, dict) else None
        result = res_output.get("parsed") if isinstance(res_output, dict) else res_output

        if raw_msg:
            field_name = getattr(result, "field", "question") or "question"
            log_token_usage(
                raw_msg,
                feature_name=f"Roadmap Clarification: {field_name}",
                model_name="gemini-2.5-flash",
                latency=f"{time.time() - t0:.2f}s",
            )

        # de-anonymize the result
        result = pii_analyzer.deanonymize_value(result, pii_mapping)

        content = [{"type": "text", "data": {"text": result.question}}]

        first_chunk = is_retry
        full_text = result.question
        for chunk in pseudo_stream_text(full_text):
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

        if result.field == "learning_pace":
            action_content_block = [
                {
                    "type": "action",
                    "interaction_id": "depth_selector_001",
                    "selection_mode": "single",
                    "disable_on_select": True,
                    "layout": "chip_list",
                    "data": {
                        "title": None,
                        "options": [
                            {
                                "label": "Crash (Zero to basics, fast)",
                                "value": "tier_1",
                                "action": "SEND",
                            },
                            {
                                "label": "Essentials (Must-know core skills)",
                                "value": "tier_2",
                                "action": "SEND",
                            },
                            {
                                "label": "Practical (Learn by doing)",
                                "value": "tier_3",
                                "action": "SEND",
                            },
                            {
                                "label": "Advanced (Beyond the basics)",
                                "value": "tier_4",
                                "action": "SEND",
                            },
                            {
                                "label": "Pro (Industry-ready mastery)",
                                "value": "tier_5",
                                "action": "SEND",
                            },
                        ],
                    },
                }
            ]
            content.extend(action_content_block)
            await publish_content_block(
                message_id=str(run_id if not is_retry else message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=action_content_block,
            )

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

        # update state so the next node knows what was asked
        return {
            "assistant_message": result.question,
            "last_asked_field": result.field,
        }
    except Exception as e:
        message_id = (
            config.get("configurable", {}).get("run_id")
            if not is_retry
            else config.get("configurable", {}).get("message_id")
        )

        if isinstance(e, AgentExecutionError):
            ctx = getattr(e, "context", {})

            raise AgentExecutionError(
                message=str(e),
                node=ctx.get("node"),
                message_id=ctx.get("message_id"),
                original_error=ctx.get("original_error"),
                reason=ctx.get("reason"),
            ) from e
        raise AgentExecutionError(
            message="Crification question generation failed",
            node="generate_clarification",
            message_id=message_id,
            original_error=str(e),
        ) from e


async def await_clarification_response(
    state: RoadmapCoachState, config: RunnableConfig, runtime: Runtime[GraphContext]
) -> Dict[str, Any]:
    """
    pause and wait for user input.
    """

    thread_id, user_id = state["thread_id"], state["user_id"]

    organization_id = config.get("configurable", {}).get("organization_id")
    team_id = config.get("configurable", {}).get("team_id")

    thread_service = runtime.context.thread_service

    # The question is already in the state from the previous node
    question_to_display = state.get("assistant_message")

    user_response = interrupt(question_to_display)

    updates = {
        "user_message": user_response["user_message"],
        "clarification_count": state["clarification_count"] + 1,
    }

    print("Last Asked: ", state.get("last_asked_field"))
    print("Time Commitment from config: ", user_response.get("time_commitment"))
    print("Time Commitment from state: ", state.get("learning_pace"))

    if (
        state.get("last_asked_field") == "learning_pace"
        and user_response.get("time_commitment")
        and not state.get("learning_pace")  # learning_pace not already set
    ):
        print("Fast path: Updating learning_pace from button selection")
        selected_time_commitment = get_time_commitment_by_id(
            user_response.get("time_commitment")
        )
        updates["learning_pace"] = selected_time_commitment["duration"]
        updates["time_commitment"] = user_response.get("time_commitment")

        await thread_service.update_thread(
            thread_id=thread_id,
            user_id=user_id,
            data=ThreadUpdate(
                organization_id=str(organization_id),
                team_id=team_id,
                thread_metadata={
                    "time_commitment": {
                        "selected": True,
                        "value": user_response.get("time_commitment"),
                    }
                },
            ),
        )

    return updates
