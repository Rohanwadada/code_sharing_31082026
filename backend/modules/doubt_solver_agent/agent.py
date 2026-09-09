import logging

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.exception import AgentExecutionError
from core.langgraph_db import create_worker_pool
from modules.artifact.service import ArtifactService
from modules.doubt_solver_agent.graph import DoubtSolverAgentGraphManager
from modules.roadmap.roadmap_access_service import RoadmapAccessService
from modules.roadmap_agent.context import GraphContext
from modules.thread.model import ConversationMessage
from modules.thread.repository import ThreadRepository
from modules.thread.schema import ThreadType
from modules.thread.service import ThreadService
from shared.celery import _worker_loop, celery_app
from shared.email.provider import SMTPEmailProvider
from shared.email.service import EmailService
from shared.sse_stream import publish_content_block, stream_to_redis

logger = logging.getLogger(__name__)

MAX_CONVERSATION_LIMIT = 6


@celery_app.task(bind=True)
def run_graph_task(
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
                graph = await DoubtSolverAgentGraphManager().get_graph(
                    checkpointer=checkpointer
                )

                config = {
                    "run_id": run_id,
                    # "callbacks": [langfuse_handler],
                    "configurable": {
                        "thread_id": thread_id,
                        "user_id": user_id,
                        "run_id": run_id,
                        "organization_id": organization_id,
                        "team_id": team_id,
                        "project_id": project_id,
                        **additional_data,
                    },
                    "tags": ["doubt_solver_agent", "dev"],
                    "metadata": {
                        "langfuse_session_id": thread_id,
                        "langfuse_user_id": user_id,
                        "langfuse_project_id": project_id,
                    },
                }

                context = GraphContext(
                    thread_service=thread_service, artifact_service=artifact_service
                )

                print("\nGraph State before invoke\n")
                g_state = await graph.aget_state(config=config)  # type: ignore
                print(g_state)

                if is_new_thread:
                    initial_state = {
                        "thread_id": thread_id,
                        "user_id": user_id,
                        "user_message": user_message,
                        "message_window": [],
                    }

                    await graph.ainvoke(initial_state, config=config, context=context)  # type: ignore
                else:
                    print("In existing graph invokation")

                    resume_config = config.copy()
                    if "configurable" not in resume_config:
                        resume_config["configurable"] = {}

                    if "m_id" in additional_data:
                        resume_config["configurable"]["message_id"] = additional_data[
                            "m_id"
                        ]
                    if "retry" in additional_data:
                        resume_config["configurable"]["is_retry"] = additional_data[
                            "retry"
                        ]

                    past_messages = get_past_conversations(
                        thread_id, user_id, MAX_CONVERSATION_LIMIT, db
                    )
                    resume_config["configurable"]["past_messages"] = past_messages

                    resume_data = {}
                    print("Inside re-invoking the graph...")
                    print("Rerun data: ", resume_data)
                    print("Rerun config: ", resume_config)
                    await graph.ainvoke(
                        resume_data, config=resume_config, context=context
                    )  # type: ignore

                await thread_service.update_thread_status(
                    thread_id=thread_id, user_id=user_id, status="complete"
                )

                # logger.info("\n\nRESULT\n\n")
                # logger.info(result)
                # logger.info(type(result))
                # logger.info("\n\n")

            except AgentExecutionError as e:
                await thread_service.update_thread_status(
                    thread_id=thread_id, user_id=user_id, status="failed"
                )

                logger.error(
                    f"LangGraph error: {str(e)} | context: {e.context}",
                    # exc_info=1
                )
                message_id = e.context.get("message_id")
                roadmap_id = e.context.get("roadmap_id")
                action = e.context.get("action")
                reason = e.context.get("reason", None)

                content = [
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
                                    "type": ThreadType.ROADMAP_DOUBT.value,
                                    "extra": {
                                        "m_id": message_id,
                                        "action": action,
                                        "roadmap_id": roadmap_id,
                                    },
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
                    organization_id=organization_id,
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


async def get_past_conversations(
    thread_id: str, user_id: str, limit: int, db: AsyncSession
) -> str:
    try:
        conversations = (
            await db.scalars(
                select(ConversationMessage)
                .where(
                    ConversationMessage.thread_id == thread_id,
                    ConversationMessage.user_id == user_id,
                )
                .order_by(ConversationMessage.created_at.asc())
            )
        ).all()

        messages = ""
        for msg in conversations[-limit:]:
            messages += (
                f"""#Human\n{msg.content[0]["data"]["text"]}\n"""
                if msg.role == "human"
                else f"""#Assistant\n{msg.content[0].get("data", {}).get("text", "")}\n"""
            )
        return messages
    except Exception as e:
        raise e
