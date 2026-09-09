import time
from typing import Any, Dict

from langchain.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime
from langgraph.types import interrupt

from core.exception import AgentExecutionError
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.prompts import (
    CAREER_CONTEXT_EXTRACTION_SYSTEM_INSTRUCTION,
)
from modules.roadmap_agent.state import RoadmapCoachState
from modules.roadmap_agent.utils import check_stop_signal
from shared.llm.gemini import get_gemini_instance
from shared.sse_stream import publish_content_block


async def gather_career_context(
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
            node_name="gather_career_context",
            message_id=str(run_id if not is_retry else message_id),
        )

        # no anonymization needed as we ar only sending field names which are graph state names and not PII

        # LLM call
        llm = get_gemini_instance(temperature=0.6)
        # structured_llm = llm.with_structured_output(CareerContextGatheringQuestion)

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

        prompt = [
            SystemMessage(content=CAREER_CONTEXT_EXTRACTION_SYSTEM_INSTRUCTION),
            HumanMessage(
                content=f"""
Missing fields: {career_context_missing_fields}
    """
            ),
        ]

        # result = structured_llm.invoke(prompt)

        result = llm.stream(prompt)
        full_response = ""
        buffer = ""
        # for chunk in result:
        #     if chunk.content:
        #         text = chunk.content
        #         full_response += text
        #         buffer += text
        #         print(text)
        #         content = [{
        #             "type": "text",
        #             "data": {"text": f"{text}"}
        #         }]
        #         await publish_content_block(message_id=run_id, thread_id=thread_id, user_id=user_id, role='assistant', content=content)

        first_chunk = is_retry
        for chunk in result:
            await check_stop_signal(
                thread_id=thread_id,
                user_id=user_id,
                run_id=str(run_id),
                node_name="gather_career_context",
                message_id=str(run_id if not is_retry else message_id),
            )
            if chunk.content:
                text = str(chunk.content)
                full_response += text
                buffer += text

                await publish_content_block(
                    message_id=str(run_id if not is_retry else message_id),
                    thread_id=thread_id,
                    user_id=user_id,
                    role="assistant",
                    content=[{"type": "text", "data": {"text": text}}],
                    overwrite=first_chunk,
                )

                first_chunk = False

                time.sleep(0.05)

        print("\nCareer context result\n")
        print(result)
        print("\n\n")

        # stream to redis
        # redis_channel_id = f"chat:{state['thread_id']}:{state['user_id']}"
        content = [{"type": "text", "data": {"text": f"{full_response}"}}]
        # message = SSEMessage(
        #     message_id=run_id,
        #     thread_id=thread_id,
        #     role="assistant",
        #     content=content
        # )
        # stream_to_redis(channel=redis_channel_id, message=message.model_dump_json())
        # await publish_content_block(message_id=run_id, thread_id=thread_id, user_id=user_id, role='assistant', content=content)
        await thread_service.save_conversation_to_db(
            organization_id=str(organization_id),
            team_id=team_id,
            message_id=str(run_id) if not is_retry else str(message_id),
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=content,
            mode="update" if not is_retry else "overwrite",
        )

        # update state so the next node knows what was asked
        return {
            "assistant_message": f"{full_response}\nBe as specific as possible.",
            # "last_asked_field": result.field,
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
            message="Career context gathering failed",
            node="gather_career_context",
            message_id=message_id,
            original_error=str(e),
        ) from e


def await_career_context_response(state: RoadmapCoachState) -> Dict[str, Any]:
    """
    pause and wait for user input.
    """

    # The question is already in the state from the previous node
    question_to_display = state.get("assistant_message")

    user_response = interrupt(question_to_display)

    return {
        "user_message": user_response["user_message"],
        # "clarification_count": state["clarification_count"] + 1,
    }
