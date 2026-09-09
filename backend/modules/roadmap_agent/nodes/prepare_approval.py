import json
import logging
import random
from typing import Any, Dict

from langchain.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime
from langgraph.types import interrupt

from core.exception import AgentExecutionError
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.prompts import PROMPT_GENERATION_SYSTEM_INSTRUCTION
from modules.roadmap_agent.schema import RoadmapGenerationPromptGeneration
from modules.roadmap_agent.state import RoadmapCoachState
from modules.roadmap_agent.utils import (
    check_stop_signal,
    get_time_commitment_by_id,
    pseudo_stream_text,
)
from shared.llm.gemini import get_gemini_instance
from shared.pii_analyzer import pii_analyzer
from shared.sse_stream import publish_content_block

logger = logging.getLogger(__name__)


async def prepare_approval(
    state: RoadmapCoachState, config: RunnableConfig, runtime: Runtime[GraphContext]
) -> Dict[str, Any]:
    """
    summarize understanding, stream message to Redis, and save to state.
    This node does NOT interrupt.
    """
    logger.info("In Prepare Approval Node")

    is_retry = bool(config.get("configurable", {}).get("is_retry"))

    try:
        run_id = config.get("configurable", {}).get("run_id")
        message_id = config.get("configurable", {}).get("message_id")
        organization_id = config.get("configurable", {}).get("organization_id")
        team_id = config.get("configurable", {}).get("team_id")

        thread_id, user_id = state["thread_id"], state["user_id"]

        thread_service = runtime.context.thread_service

        await check_stop_signal(
            thread_id=thread_id,
            user_id=user_id,
            run_id=str(run_id),
            node_name="prepare_approval",
            message_id=str(run_id if not is_retry else message_id),
        )

        # anonymization init
        pii_mapping = {}

        anonymized_current_role = pii_analyzer.anonymize_text(
            state.get("current_role", ""), pii_mapping
        )
        anonymized_experience = pii_analyzer.anonymize_text(
            state.get("experience", ""), pii_mapping
        )
        anonymized_education = pii_analyzer.anonymize_text(
            state.get("education", ""), pii_mapping
        )
        anonymized_career_goals = pii_analyzer.anonymize_text(
            state.get("career_goals", ""), pii_mapping
        )

        anonymized_learning_scope = pii_analyzer.anonymize_text(
            state.get("learning_scope", ""), pii_mapping
        )
        anonymized_learnig_objective = pii_analyzer.anonymize_text(
            state.get("learning_objective", ""), pii_mapping
        )
        anonymized_starting_profile = pii_analyzer.anonymize_text(
            state.get("starting_profile", ""), pii_mapping
        )
        anonymized_learning_pace = pii_analyzer.anonymize_text(
            state.get("learning_pace", ""), pii_mapping
        )

        logger.info(f"PII MAPPING: {pii_mapping}")

        current_extras_str = json.dumps(state.get("extra_requirements", {}), indent=2)
        time_commitment = json.dumps(
            get_time_commitment_by_id(state.get("time_commitment", "tier_5")), indent=2
        )

        # LLM call
        llm = get_gemini_instance(temperature=0.6)
        structured_llm = llm.with_structured_output(
            RoadmapGenerationPromptGeneration, strict=True
        )

        prompt = [
            SystemMessage(content=PROMPT_GENERATION_SYSTEM_INSTRUCTION),
            HumanMessage(
                content=f"""
<current_state>
CAREER_CONTEXT_FIELDS:
- Current Role: {anonymized_current_role}
- Experience: {anonymized_experience}
- Education: {anonymized_education}
- Career Goals: {anonymized_career_goals}
CANONICAL_FIELDS:
- Scope: {anonymized_learning_scope}
- Objective: {anonymized_learnig_objective}
- Profile: {anonymized_starting_profile}
- Pace: {anonymized_learning_pace}

EXTRA_REQUIREMENTS:
{current_extras_str}

TIME COMMITMENT:
{time_commitment}
</current_state>
    """
            ),
        ]

        result: RoadmapGenerationPromptGeneration = structured_llm.invoke(prompt)

        # de-anonymize the result
        result = pii_analyzer.deanonymize_value(result, pii_mapping)

        # redis publish
        content = [
            {
                "type": "text",
                "data": {"text": random.choice(INITIAL_MESSAGE)},
            }
        ]

        for chunk in pseudo_stream_text(content[0]["data"]["text"]):
            text_content = [{"type": "text", "data": {"text": chunk}}]

            await publish_content_block(
                message_id=str(run_id if not is_retry else message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=text_content,
            )
        action_message_blocks = [
            {
                "type": "action",
                "interaction_id": "roadmap_generation_cta",
                "layout": "call_to_action_card",
                "data": {
                    "title": result.prompt,
                    "options": [
                        {
                            "id": "edit_prompt",
                            "label": "Edit Prompt",
                            "icon": "edit",
                            "action": "EDIT_MESSAGE",
                            "value": "cmd_edit",
                        },
                        {
                            "id": "generate_roadmap",
                            "icon": "spark",
                            "label": "Shifu, Generate my Roadmap",
                            "action": "GENERATE_ROADMAP",
                            "value": "gen_roadmap",
                        },
                    ],
                },
            }
        ]
        await publish_content_block(
            message_id=str(run_id if not is_retry else message_id),
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=action_message_blocks,
        )
        content.extend(action_message_blocks)
        await thread_service.save_conversation_to_db(
            organization_id=str(organization_id),
            team_id=team_id,
            message_id=str(run_id if not is_retry else message_id),
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=content,
        )

        # Save message to state so the next node can use it
        return {"assistant_message": result.prompt}
    except Exception as e:
        message_id = config.get("configurable", {}).get("run_id")

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
            message="Prompt generation failed",
            node="prepare_approval",
            message_id=message_id,
            original_error=str(e),
        ) from e


def await_approval_response(state: RoadmapCoachState) -> Dict[str, Any]:
    """
    pause and wait for user approval.
    This node handles the interrupt/resume logic.
    """

    # get the message sent in the previous step
    approval_message = state.get("assistant_message")

    user_response = interrupt(approval_message)
    print(user_response)
    print(type(user_response))

    updates = {
        "user_message": user_response["user_message"],
        "user_approved": True,
        "roadmap_generation_prompt": user_response["roadmap_generation_prompt"],
    }

    return updates


INITIAL_MESSAGE = [
    "Here’s what I’ve put together based on your goals. Take a moment to review it—want to refine anything, or should I turn this into your roadmap?",
    "This is what your plan looks like so far. Feel free to tweak it, or I can go ahead and build your roadmap.",
    "I’ve mapped out your goals here. If it looks right, I’ll turn this into a step-by-step roadmap—or we can adjust it together.",
    "I’ve put this together based on your goals. Give it a quick look—want to adjust anything, or should I turn it into your roadmap?",
    "This is what I’ve prepared for you. Want to make any changes, or shall I turn it into a clear roadmap?",
    "I’ve shaped this around your goals. Have a look—ready to move forward, or tweak it a bit first?",
]
