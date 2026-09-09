import json
import logging

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exception import AppException, BadRequestException
from core.security.dependencies import get_current_user
from modules.artifact.model import ArtifactRepository
from modules.thread.model import ChatThread, ConversationMessage
from modules.thread.schema import (
    ChatResponse,
    DoubtSolverAgentChatRequest,
    MessageFeedbackRequest,
    MessagesRequest,
    RoadmapAgentChatRequest,
    ThreadType,
    ThreadUpdate,
)
from modules.thread.service import ThreadService, get_thread_service
from modules.user.model import UserDetails
from shared.db.dependencies import get_db
from shared.redis import redis

router = APIRouter(prefix="/thread", tags=["thread"])


logger = logging.getLogger(__name__)


@router.post("/roadmap/chat")
async def roadmap_chat(
    data: RoadmapAgentChatRequest,
    thread_type: ThreadType = Query(alias="t"),
    user: UserDetails = Depends(get_current_user),
    thread_service: ThreadService = Depends(get_thread_service),
) -> ChatResponse | None:
    if thread_type != ThreadType.ROADMAP_GENERATION:
        raise BadRequestException("Not a valid thread")

    response = await thread_service.start_roadmap_generation_thread(
        user_id=user.user_id, data=data
    )

    return response


@router.post("/doubt/chat")
async def doubt_chat(
    data: DoubtSolverAgentChatRequest,
    thread_type: ThreadType = Query(alias="t"),
    user: UserDetails = Depends(get_current_user),
    thread_service: ThreadService = Depends(get_thread_service),
) -> ChatResponse | None:
    if thread_type != ThreadType.ROADMAP_DOUBT:
        raise BadRequestException("Not a valid thread")

    response = await thread_service.start_doubt_solver_agent_thread(
        user_id=user.user_id, data=data
    )

    return response


@router.get("/stream")
async def chat_stream(
    thread_id: str = Query(alias="t_id"), user: UserDetails = Depends(get_current_user)
):

    channel = f"thread:{thread_id}:{user.user_id}"

    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)

    async def event_stream():
        try:
            yield "event: connected\ndata: stream_start\n\n"

            # while True:
            #     message = await pubsub.get_message(
            #         ignore_subscribe_messages=True,
            #         timeout=1.0,
            #     )

            #     print("message: ", message)

            #     if message is None:
            #         continue

            #     yield f"data: {json.loads(message['data'])}\n\n"

            async for message in pubsub.listen():
                # print("message:", message)

                if message["type"] != "message":
                    continue

                data = json.loads(message["data"])
                yield f"data: {data}\n\n"

                if data == "[DONE]":
                    break

        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{thread_id}/messages")
async def get_chat_by_id(
    thread_id: str,
    data: MessagesRequest,
    user: UserDetails = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        if not thread_id:
            raise BadRequestException("thread_id and e (email) are required")

        thread = await db.scalar(
            select(ChatThread).where(
                ChatThread.organization_id == data.organization_id,
                ChatThread.team_id == data.team_id,
                ChatThread.thread_id == thread_id,
                ChatThread.user_id == user.user_id,
            )
        )

        if not thread:
            raise BadRequestException("Thread not found")

        # conversation in order
        conversations = (
            await db.scalars(
                select(ConversationMessage)
                .where(
                    ConversationMessage.thread_id == thread_id,
                    ConversationMessage.user_id == user.user_id,
                )
                .order_by(ConversationMessage.created_at.asc())
            )
        ).all()

        messages = [
            {
                "message_id": str(msg.message_id),
                "role": msg.role,
                "content": msg.content,
                "metadata": msg.message_metadata,
                "created_at": msg.created_at.isoformat(),
                "updated_at": msg.updated_at.isoformat(),
            }
            for msg in conversations
        ]

        # get artifacts created in that roadmap
        artifacts = (
            await db.scalars(
                select(ArtifactRepository).where(
                    ArtifactRepository.organization_id == data.organization_id,
                    ArtifactRepository.team_id == data.team_id,
                    ArtifactRepository.thread_id == thread_id,
                )
            )
        ).all()

        response = {
            "thread_id": thread_id,
            "thread_title": thread.title,
            "metadata": thread.thread_metadata,
            "messages": messages,
            "user_approved": bool(thread.thread_metadata.get("user_approved")),
            "roadmap_created": bool(thread.thread_metadata.get("roadmap_created")),
            "artifacts": [
                {
                    "version_tag": a.artifact_metadata.get("version", {}).get(
                        "version_tag", 0
                    ),
                    "a_id": a.artifact_id,
                    "title": a.title,
                }
                for a in sorted(
                    artifacts,
                    key=lambda x: x.artifact_metadata.get("version", {}).get(
                        "version_tag", 0
                    ),
                )
            ],
        }

        return response

    except Exception as e:
        # log properly in real app
        logger.info(f"get_chat_by_id error: {str(e)}", exc_info=True)
        raise AppException()


@router.post("/message/feedback")
async def update_message_feedback_route(
    data: MessageFeedbackRequest,
    user: UserDetails = Depends(get_current_user),
    thread_service: ThreadService = Depends(get_thread_service),
):
    await thread_service.update_message_feedback(
        message_id=data.message_id, thread_id=data.thread_id, feedback=data.feedback
    )
    return {"status": "success"}


@router.get("/all")
async def get_all_chats(
    thread_type: ThreadType = Query(alias="t"),
    organization_id: str = Query(alias="org"),
    team_id: str | None = Query(default=None, alias="team"),
    db: AsyncSession = Depends(get_db),
    user: UserDetails = Depends(get_current_user),
):
    try:
        threads = (
            await db.scalars(
                select(ChatThread)
                .where(
                    ChatThread.organization_id == organization_id,
                    ChatThread.team_id == team_id,
                    ChatThread.user_id == user.user_id,
                    ChatThread.thread_type == thread_type.value,
                )
                .order_by(ChatThread.updated_at.desc())
            )
        ).all()

        print(
            f"Threads: {threads}:: {user.user_id} :: {organization_id} :: {team_id} :: {thread_type}"
        )
        print(repr(team_id), type(team_id))

        thread_data = []
        for thread in threads:
            thread_data.append(
                {
                    "slug": thread.thread_id,
                    "project_id": thread.project_id,
                    "title": thread.title if thread.title else "Untitled thread",
                    "saved": thread.thread_metadata.get("saved", False),
                    "updated_at": thread.updated_at,
                }
            )

        return {"threads": thread_data}
    except Exception as e:
        logger.error(f"get_all_chats error: {str(e)}")
        raise AppException()


@router.put("/{thread_id}/update")
async def update_thread_route(
    thread_id: str,
    data: ThreadUpdate,
    user: UserDetails = Depends(get_current_user),
    thread_service: ThreadService = Depends(get_thread_service),
):
    try:
        verdict = await thread_service.update_thread(
            thread_id=thread_id,
            user_id=user.user_id,
            data=ThreadUpdate(
                organization_id=data.organization_id,
                team_id=data.team_id,
                title=data.title,
                thread_metadata=data.thread_metadata,
            ),
        )

        return {"status": "success" if verdict else "failed"}
    except Exception as e:
        logger.error(f"get_all_chats error: {str(e)}")
        raise AppException()


@router.post("/artifact/email")
async def email_roadmap_route(
    thread_id: str = Form(),
    email: str = Form(),
    attachment: UploadFile = File(...),
    user: UserDetails = Depends(get_current_user),
    thread_service: ThreadService = Depends(get_thread_service),
):
    try:
        status = await thread_service.email_roadmap(
            thread_id=thread_id, email=email, attachments=[attachment]
        )

        return {"status": "success" if status else "failed"}
    except Exception as e:
        logger.error(f"Exception occurred: {str(e)}", exc_info=True)
        raise AppException()


@router.delete("/{thread_id}/delete")
async def delete_thread_route(
    thread_id: str,
    user: UserDetails = Depends(get_current_user),
    thread_service: ThreadService = Depends(get_thread_service),
):
    response = await thread_service.delete_thread(
        user_id=user.user_id, thread_id=thread_id
    )
    return response


@router.post("/{thread_id}/stop")
async def stop_thread_route(
    thread_id: str,
    data: dict,
    user: UserDetails = Depends(get_current_user),
    thread_service: ThreadService = Depends(get_thread_service),
):
    run_id = data["run_id"]
    response = await thread_service.stop_thread(
        thread_id=thread_id, run_id=run_id, user_id=user.user_id
    )
    return response


def is_valid_thread_type(type):
    return type in [item.value for item in ThreadType]
