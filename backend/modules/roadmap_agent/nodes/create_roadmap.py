import logging
import random
import time
from typing import Any, Dict
from uuid import uuid4

from langchain.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime

from core.exception import AgentExecutionError
from modules.artifact.service import ArtifactService
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.prompts import ROADMAP_DSL_GENERATION_SYSTEM_PROMPT
from modules.roadmap_agent.state import RoadmapCoachState
from modules.roadmap_agent.utils import (
    check_stop_signal,
    get_time_commitment_by_id,
    pseudo_stream_text,
)
from modules.thread.schema import ThreadUpdate
from shared.llm.gemini import get_gemini_instance
from shared.sse_stream import publish_content_block
from modules.roadmap_agent.nodes.utils.dsl_augmenter import augment_dsl

logger = logging.getLogger(__name__)


async def create_roadmap(
    state: RoadmapCoachState, config: RunnableConfig, runtime: Runtime[GraphContext]
) -> Dict[str, Any]:
    """
    Creates the roadmap using the finalized state.
    """
    is_retry = bool(config.get("configurable", {}).get("is_retry"))
    try:
        run_id = config.get("configurable", {}).get("run_id")
        message_id = config.get("configurable", {}).get("message_id")
        organization_id = config.get("configurable", {}).get("organization_id")
        team_id = config.get("configurable", {}).get("team_id")
        project_id = config.get("configurable", {}).get("project_id")

        thread_id, user_id = state["thread_id"], state["user_id"]

        thread_service = runtime.context.thread_service
        artifact_service = runtime.context.artifact_service

        await check_stop_signal(
            thread_id=thread_id,
            user_id=user_id,
            run_id=str(run_id),
            node_name="create_roadmap",
            message_id=str(run_id if not is_retry else message_id),
        )

        data = {
            "organization_id": organization_id,
            "team_id": team_id,
            "project_id": project_id,
            "thread_id": thread_id,
            "user_id": user_id,
            "state": {
                "time_commitment": state.get("time_commitment"),
                "roadmap_generation_prompt": state.get("roadmap_generation_prompt"),
            },
        }

        # redis_channel_id = f"chat:{state['thread_id']}:{state['user_id']}"

        # call roadmap generator
        roadmap_artifact, status_code = await generate_roadmap(
            data=data, artifact_service=artifact_service
        )

        content = [
            {
                "type": "text",
                "data": {"text": random.choice(INITIAL_MESSAGES)},
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
        artifact_message_blocks = [
            {
                "artifact_id": roadmap_artifact["artifact_id"],
                "type": "artifact",
                "subtype": "roadmap",
                "data": {
                    "name": roadmap_artifact["artifact_title"],
                    "version": roadmap_artifact["artifact_metadata"]["version"],
                },
            }
        ]
        content.extend(artifact_message_blocks)
        await publish_content_block(
            message_id=str(run_id if not is_retry else message_id),
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=artifact_message_blocks,
        )
        await thread_service.save_conversation_to_db(
            organization_id=str(organization_id),
            team_id=team_id,
            message_id=str(run_id if not is_retry else message_id),
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=content,
        )

        # Next message for content generation
        time.sleep(10)

        new_message_id = str(uuid4())
        content = [
            {
                "type": "text",
                "data": {
                    "text": "Your roadmap looks solid. Save it so we don't lose your progress — then we'll get into the real work together."
                },
            }
        ]
        for chunk in pseudo_stream_text(content[0]["data"]["text"]):
            text_content = [{"type": "text", "data": {"text": chunk}}]

            await publish_content_block(
                message_id=new_message_id,
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=text_content,
            )
        action_message_blocks = [
            {
                "type": "action",
                "interaction_id": "post_roadmap_action_cta",
                "layout": "post_roadmap_action_cta",
                "data": {
                    "title": None,
                    "options": [
                        {
                            "id": "save_roadmap",
                            "label": "Save Roadmap",
                            "action": "SAVE_ROADMAP",
                            "value": "save_roadmap",
                            "icon": "bookmark",
                            "artifact_id": roadmap_artifact["artifact_id"],
                        }
                    ],
                },
            },
        ]
        content.extend(action_message_blocks)
        await publish_content_block(
            message_id=new_message_id,
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=action_message_blocks,
        )

        await thread_service.save_conversation_to_db(
            organization_id=str(organization_id),
            team_id=team_id,
            message_id=new_message_id,
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=content,
        )

        await thread_service.update_thread(
            thread_id=thread_id,
            user_id=user_id,
            data=ThreadUpdate(
                organization_id=str(organization_id),
                team_id=team_id,
                thread_metadata={"roadmap_created": True},
            ),
        )

        return {
            "roadmap_created": True,
            "assistant_message": "Your roadmap is ready!",
            "force_create_roadmap": False,
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
            message="Roadmap generation failed",
            node="create_roadmap",
            message_id=message_id,
            original_error=str(e),
        ) from e


async def generate_roadmap(data: Dict, artifact_service: ArtifactService):
    try:
        thread_id = data["thread_id"]
        user_id = data["user_id"]

        time_commitment = data["state"]["time_commitment"]
        time_commitment_data = None
        if time_commitment:
            time_commitment_data = get_time_commitment_by_id(time_commitment)

        roadmap_generation_prompt = data["state"]["roadmap_generation_prompt"]["text"]

        # anonymization init
        # pii_analyzer = PIIAnalyzer()
        # pii_mapping = {}

        # anonymized_roadmap_generation_prompt = pii_analyzer.anonymize_text(
        #     roadmap_generation_prompt, pii_mapping
        # )

        # logger.info(f"PII MAPPING: {pii_mapping}")

        human_message = f"query: {roadmap_generation_prompt}"

        gemini = get_gemini_instance(temperature=0.2)
        message = [
            SystemMessage(
                content=ROADMAP_DSL_GENERATION_SYSTEM_PROMPT.format(
                    total_subtopic_count=(
                        time_commitment_data["max_total_subtopic_count"]
                        if time_commitment_data
                        else 45
                    ),
                )
            ),
            HumanMessage(content=human_message),
        ]
        response = gemini.invoke(message)
        print(response)
        result = response.content.strip("`").lstrip("json").strip()  # type: ignore

        # de-anonymize the result
        # result = pii_analyzer.deanonymize_value(result, pii_mapping)

        augmented_dsl = augment_dsl(result)

        # create artifact in DB
        artifact_title = get_roadmap_title(augmented_dsl)
        artifact_data = {
            "dsl": augmented_dsl,
            "prompt": roadmap_generation_prompt,
            "time_commitment": time_commitment_data,
        }
        artifact_metadata = {
            "usage_metadata": response.usage_metadata,
            "generation_status": "incomplete",
            "version": {"id": str(uuid4()), "version_tag": 0},
        }

        new_artifact = await artifact_service.create_artifact(
            organization_id=data["organization_id"],
            team_id=data["team_id"],
            project_id=data["project_id"],
            thread_id=thread_id,
            user_id=user_id,
            artifact_title=artifact_title,
            artifact_description=artifact_title,
            artifact_data=artifact_data,
            artifact_metadata=artifact_metadata,
        )

        return {
            "status": "success",
            "artifact_title": artifact_title,
            "artifact_id": new_artifact["artifact_id"],
            "artifact_metadata": artifact_metadata,
        }, 200
    except Exception as e:
        print(f"Error occured while generating roadmap artifact from prompt : {str(e)}")
        raise


def get_roadmap_title(s: str):
    for line in s.splitlines():
        if line.startswith("# "):
            return line.lstrip("# ").strip()
    return "AI generated roadmap"


INITIAL_MESSAGES = [
    "Here’s your personalized roadmap!\nI’ve mapped out a clear path based on your goal—take a look and see how it feels.",
    "Here’s your personalized roadmap.\nThis is your path forward—built around your goal and where you are right now. Take a moment to go through it.",
    "Your roadmap is ready\nStart by scanning the steps below—this is your game plan from here.",
]
