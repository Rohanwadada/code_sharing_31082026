import asyncio
import logging
from enum import Enum
from typing import Optional

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.types import Command, StateSnapshot

from core.database import AsyncSessionLocal
from core.exception import AgentExecutionError
from core.langgraph_db import create_worker_pool, typed_langgraph_pool
from modules.artifact.service import ArtifactService
from modules.roadmap.roadmap_access_service import RoadmapAccessService
from modules.roadmap_agent.context import GraphContext
from modules.roadmap_agent.graph import RoadmapGeneratorGraphManager
from modules.thread.repository import ThreadRepository
from modules.thread.schema import ThreadType
from modules.thread.service import ThreadService
from shared.celery import celery_app
from shared.email.provider import SMTPEmailProvider
from shared.email.service import EmailService
from shared.sse_stream import publish_content_block, stream_to_redis
from shared.celery import _worker_loop

logger = logging.getLogger(__name__)


class ExecutionStatus(Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    INTERRUPTED = "INTERRUPTED"
    ERROR = "ERROR"


@celery_app.task(bind=True)
def run_graph_task(
    self,
    thread_id: str,
    user_id: str,
    organization_id: str,
    team_id: str | None,
    project_id:str,
    run_id: str,
    user_message: str,
    is_new_thread: bool,
    additional_data: dict,
):
    return _worker_loop.run_until_complete(
        _run_graph_task_impl(
            self,
            thread_id,
            user_id,
            organization_id,
            team_id,
            project_id,
            run_id,
            user_message,
            is_new_thread,
            additional_data,
        )
    )


async def _run_graph_task_impl(
    self,
    thread_id: str,
    user_id: str,
    organization_id: str,
    team_id: str | None,
    project_id: str,
    run_id: str,
    user_message: str,
    is_new_thread: bool,
    additional_data: dict,
):
    worker_pool = create_worker_pool()
    await worker_pool.open()

    try:
        async with AsyncSessionLocal() as db:
            email_service = EmailService(SMTPEmailProvider())
            thread_service = ThreadService(
                repo=ThreadRepository(db=db), email_service=email_service
            )
            roadmap_access_service = RoadmapAccessService(
                db=db, email_service=email_service
            )
            artifact_service = ArtifactService(
                db=db,
                thread_service=thread_service,
                roadmap_access_service=roadmap_access_service,
            )

            try:
                await thread_service.update_thread_status(
                    thread_id=thread_id, user_id=user_id, status="running"
                )

                checkpointer = AsyncPostgresSaver(worker_pool)
                graph = await RoadmapGeneratorGraphManager().get_graph(
                    checkpointer=checkpointer
                )

                config = {
                    "run_id": run_id,
                    # "callbacks": [langfuse_handler],
                    "configurable": {
                        "thread_id": thread_id,
                        "run_id": run_id,
                        "organization_id": organization_id,
                        "team_id": team_id,
                        "project_id": project_id,
                    },
                    "tags": ["roadmap_agent", "dev"],
                    "metadata": {
                        "langfuse_session_id": thread_id,
                        "langfuse_user_id": user_id,
                        "langfuse_organization_id": organization_id,
                        "langfuse_team_id": team_id,
                        "langfuse_project_id": project_id,
                    },
                }

                context = GraphContext(
                    thread_service=thread_service, artifact_service=artifact_service
                )

                print("\nGraph State before invoke\n")
                g_state = await graph.aget_state(config=config)  # type: ignore
                print(g_state)

                result = {}
                if is_new_thread:
                    initial_state = {
                        "thread_id": thread_id,
                        "user_id": user_id,
                        "user_message": user_message,
                        "assistant_message": None,
                        "current_role": None,
                        "experience": None,
                        "education": None,
                        "career_goals": None,
                        "learning_scope": None,
                        "learning_objective": None,
                        "starting_profile": None,
                        "learning_pace": None,
                        "extra_requirements": {},
                        "missing_fields": [],
                        "clarification_count": 0,
                        "last_asked_field": None,
                        "approval_variants": None,
                        "selected_variant_index": None,
                        "user_approved": False,
                        "roadmap_created": False,
                        "time_commitment": None,
                        "roadmap_generation_prompt": {},
                    }

                    if additional_data.get("generate_from_prompt"):
                        initial_state.update(
                            {
                                "force_create_roadmap": True,
                                "roadmap_generation_prompt": additional_data["prompt"],
                                "time_commitment": additional_data.get(
                                    "time_commitment", "tier_5"
                                ),
                                "user_approved": True,
                            }
                        )

                    result = await graph.ainvoke(
                        initial_state, config=config, context=context
                    )  # type: ignore
                else:
                    print("In existing graph invokation")
                    graph_current_state = get_graph_state(g_state)

                    resume_config = config.copy()
                    if "configurable" not in resume_config:
                        resume_config["configurable"] = {}

                    resume_data = {}
                    # If resuming from learning_pace button click, include time_commitment
                    if (
                        "time_commitment" in additional_data
                        and g_state.values.get("last_asked_field") == "learning_pace"
                    ):
                        resume_data["time_commitment"] = additional_data[
                            "time_commitment"
                        ]
                    if "prompt" in additional_data:
                        resume_data["roadmap_generation_prompt"] = additional_data[
                            "prompt"
                        ]
                    if "m_id" in additional_data:
                        resume_config["configurable"]["message_id"] = additional_data[
                            "m_id"
                        ]
                    if "retry" in additional_data:
                        resume_config["configurable"]["is_retry"] = additional_data[
                            "retry"
                        ]

                    if graph_current_state == ExecutionStatus.INTERRUPTED:
                        print("Inside interrupt...")

                        resume_config["configurable"]["is_resuming"] = True

                        # Prepare resume data
                        resume_data["user_message"] = user_message

                        print(f"AGENT.py: Resume Data : {resume_data}")

                        result = await graph.ainvoke(
                            Command(resume=resume_data),
                            config=resume_config,  # type: ignore
                            context=context,  # type: ignore
                        )
                    else:
                        print("Inside re-invoking the graph...")

                        # Prepare resume data
                        resume_data["user_message"] = user_message

                        print("Rerun data: ", resume_data)
                        print("Rerun config: ", resume_config)
                        result = await graph.ainvoke(
                            resume_data, resume_config, context=context
                        )  # type: ignore

                await thread_service.update_thread_status(
                    thread_id=thread_id, user_id=user_id, status="complete"
                )

                logger.info("\n\nRESULT\n\n")
                logger.info(result)
                logger.info(type(result))
                logger.info("\n\n")

            except AgentExecutionError as e:
                await thread_service.update_thread_status(
                    thread_id=thread_id, user_id=user_id, status="failed"
                )

                logger.error(
                    f"LangGraph error: {str(e)} | context: {e.context}",
                    # exc_info=1
                )
                message_id = e.context.get("message_id")
                action = e.context.get("action")
                reason = e.context.get("reason", None)

                content = [
                    # {
                    #     "type": "text",
                    #     "data": {
                    #         "text": "I hit an issue while processing your request!"
                    #         # "Something went wrong. Please try again later. Contact support mitra@setuschool.com if the error persists"
                    #     },
                    # },
                    {
                        "type": "action",
                        "interaction_id": "error_cta",
                        "layout": "error_cta",
                        "data": {
                            "title": "Shifu is interrupted"
                            if reason == "STOP"
                            else "I hit an issue while processing your request!",
                            "options": [
                                {
                                    "id": "retry",
                                    "label": "Retry",
                                    "action": "RETRY",
                                    "value": "retry",
                                    "type": ThreadType.ROADMAP_GENERATION.value,
                                    "extra": {"m_id": message_id, "action": action},
                                }
                            ],
                        },
                    }
                ]
                await publish_content_block(
                    message_id=str(message_id),
                    thread_id=thread_id,
                    user_id=user_id,
                    role="assistant",
                    content=content,
                    overwrite=True,
                )

                await thread_service.save_conversation_to_db(
                    organization_id=str(organization_id),
                    team_id=team_id,
                    message_id=str(message_id),
                    thread_id=thread_id,
                    user_id=user_id,
                    role="assistant",
                    content=content,
                    mode="overwrite",
                )

                raise self.retry(exc=e, countdown=0, max_retries=0)

            except Exception as e:
                await thread_service.update_thread_status(
                    thread_id=thread_id, user_id=user_id, status="failed"
                )
                logger.error(
                    f"Exception occured in run_graph_task {str(e)}", exc_info=True
                )
                raise self.retry(exc=e, countdown=0, max_retries=0)

            finally:
                # send signal to close the SSE stream
                redis_channel_id = f"thread:{thread_id}:{user_id}"
                await stream_to_redis(channel=redis_channel_id, message="[DONE]")

    finally:
        await worker_pool.close()


def get_graph_state(state: Optional[StateSnapshot]) -> ExecutionStatus:
    """
    Derives execution status from a LangGraph StateSnapshot.

    Rules (official + safe):
    - INTERRUPTED: snapshot has interrupt tasks
    - RUNNING: next nodes exist
    - COMPLETED: no next nodes and no tasks
    - ERROR: snapshot is None (graph failed before checkpoint)
    """

    # No snapshot - invocation failed before checkpoint
    if state is None:
        return ExecutionStatus.ERROR

    # Interrupted (HIL or explicit interrupt)
    if state.tasks:
        for task in state.tasks:
            if task.interrupts:
                return ExecutionStatus.INTERRUPTED

    # Still running (has nodes left to execute)
    if state.next:
        return ExecutionStatus.RUNNING

    # No next nodes, no interrupts - reached END
    return ExecutionStatus.COMPLETED


def get_current_node(state: StateSnapshot) -> Optional[str]:
    """
    Returns the node the graph is currently in.

    Priority:
    1. Interrupted inside a node → task.name
    2. Between nodes → next node
    3. Completed → None
    """

    # 1. Halted inside a node (interrupt)
    if state.tasks:
        for task in state.tasks:
            if task.interrupts:
                return task.name

    # 2. Between nodes (node finished, next scheduled)
    if state.next:
        return state.next[0]

    # 3. Graph completed
    return None
