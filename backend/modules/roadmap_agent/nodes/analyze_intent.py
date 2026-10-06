import json
import logging
import time
from typing import Any, Dict
from uuid import uuid4

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime

from core.exception import AgentExecutionError
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.prompts import INTENT_ANALYSIS_SYSTEM_INSTRUCTION
from modules.roadmap_agent.schema import IntentExtraction
from modules.roadmap_agent.state import RoadmapCoachState
from modules.roadmap_agent.utils import (
    TIME_COMMITMENTS,
    check_stop_signal,
    get_time_commitment_by_id,
)
from modules.thread.schema import ThreadUpdate
from shared.llm.gemini import get_gemini_instance, log_token_usage
from shared.pii_analyzer import pii_analyzer


logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.65  # minimum confidence to accept a change


async def analyze_intent(
    state: RoadmapCoachState, config: RunnableConfig, runtime: Runtime[GraphContext]
) -> Dict[str, Any]:
    """
    Analyzes the user message against current state to propose updates.
    """

    print("Running Intent analysis")
    thread_id, user_id = state["thread_id"], state["user_id"]
    run_id = config.get("configurable", {}).get("run_id")
    organization_id = config.get("configurable", {}).get("organization_id")
    team_id = config.get("configurable", {}).get("team_id")

    thread_service = runtime.context.thread_service

    updates = {}

    await check_stop_signal(
        thread_id=thread_id,
        user_id=user_id,
        run_id=str(run_id),
        node_name="analyze_intent",
        message_id=str(uuid4()),
    )
    try:
        # FAST PATH: If action is either `generate_content` or `recommend_courses` then directly move to router node if `roadmap_created` is true
        # if state.get("roadmap_created") and state.get("action") in [
        #     "generate_content",
        #     "recommend_courses",
        # ]:
        #     print("Fast path: Updating learning_pace from button selection")
        #     updates["action"] = state.get("action")
        #     return updates

        # NORMAL PATH: Use LLM to analyze intent

        # anonymization init
        pii_mapping = {}

        anonymized_user_msg = pii_analyzer.anonymize_text(
            state.get("user_message", ""), pii_mapping
        )
        anonymized_asst_msg = pii_analyzer.anonymize_text(
            state.get("assistant_message", ""), pii_mapping
        )

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

        llm = get_gemini_instance()
        structured_llm = llm.with_structured_output(IntentExtraction, strict=True, include_raw=True)

        current_extras_str = json.dumps(state.get("extra_requirements", {}), indent=2)

        # input prompt
        prompt_messages = [
            SystemMessage(
                content=INTENT_ANALYSIS_SYSTEM_INSTRUCTION.format(
                    learning_pace=TIME_COMMITMENTS
                )
            ),
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
</current_state>

<user_message>
{anonymized_user_msg}
</user_message>
<last_assistant_message>
{anonymized_asst_msg}
</last_assistant_message>
            """
            ),
        ]

        # print("\n\nPROMPT MESSAGE\n\n")
        # print(prompt_messages)

        t0 = time.time()
        res_output = structured_llm.invoke(prompt_messages)
        raw_msg = res_output.get("raw") if isinstance(res_output, dict) else None
        result: IntentExtraction = res_output.get("parsed") if isinstance(res_output, dict) else res_output

        if raw_msg:
            log_token_usage(
                raw_msg,
                feature_name=f"Roadmap Intent Analysis ({getattr(result, 'intent', 'intent')})",
                model_name="gemini-2.5-flash",
                latency=f"{time.time() - t0:.2f}s",
            )

        # de-anonymize the result
        result = pii_analyzer.deanonymize_value(result, pii_mapping)

        updates = {}

        # career context fields, take the output to a map for later easy update
        career_context_map = {
            "current_role": result.current_role,
            "experience": result.experience,
            "education": result.education,
            "career_goals": result.career_goals,
        }

        for key, extracted_data in career_context_map.items():
            # only update if the model found something with high confidence
            if (
                extracted_data
                and not state[key]
                and extracted_data.confidence >= CONFIDENCE_THRESHOLD
            ):
                updates[key] = extracted_data.value

        # canonical fields, take the output to a map for later easy update
        canonical_map = {
            "learning_scope": result.learning_scope,
            "learning_objective": result.learning_objective,
            "starting_profile": result.starting_profile,
            "learning_pace": result.learning_pace,
        }

        for key, extracted_data in canonical_map.items():
            # only update if the model found something with high confidence
            if (
                extracted_data
                and not state[key]
                and extracted_data.confidence >= CONFIDENCE_THRESHOLD
            ):
                if key == "learning_pace":
                    time_commitment_id = extracted_data.value
                    time_commitment = get_time_commitment_by_id(time_commitment_id)
                    updates[key] = time_commitment["duration"]
                    updates["time_commitment"] = time_commitment_id
                    await thread_service.update_thread(
                        thread_id=thread_id,
                        user_id=user_id,
                        data=ThreadUpdate(
                            organization_id=str(organization_id),
                            team_id=team_id,
                            thread_metadata={
                                "time_commitment": {
                                    "selected": True,
                                    "value": time_commitment_id,
                                }
                            },
                        ),
                    )
                else:
                    updates[key] = extracted_data.value

        # extra requirements
        current_extras = normalize_extras(state.get("extra_requirements", {}))

        # map Pydantic categories to the dictionary keys in extra_requirements
        extras_map = {
            "intent_signals": result.intent_signals,
            "preferences": result.preferences,
            "constraints": result.constraints,
            "context": result.context,
            "org_context": result.org_context,
        }

        extras_updated = False

        for category, extracted_data in extras_map.items():
            if extracted_data and extracted_data.confidence >= CONFIDENCE_THRESHOLD:
                # ensure the category sub-dict exists
                if category not in current_extras:
                    current_extras[category] = {}

                # overwrite existing keys with new ones, keep others
                value = normalize_category(extracted_data.value)
                current_extras[category] = value
                extras_updated = True

        # only include extra_requirements in the return dict if we actually changed something
        if extras_updated:
            updates["extra_requirements"] = current_extras

        print("INTENT ANALYSIS RESULT: ", result)
        print("Leaving Intent analysis")

        return updates
    except Exception as e:
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
            message="Intent Analysis failed",
            node="analyze_intent",
            message_id=str(run_id),
            original_error=str(e),
        ) from e


def normalize_extras(extras: dict):
    normalized = {}

    for k, v in extras.items():
        if isinstance(v, str):
            try:
                normalized[k] = json.loads(v)
            except Exception:
                normalized[k] = v
        else:
            normalized[k] = v

    return normalized


def normalize_category(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value  # keep as string if not JSON
    return value
