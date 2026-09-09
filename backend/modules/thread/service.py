import logging
from typing import Literal

import uuid_utils as uuid
from fastapi import Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exception import BadRequestException
from core.time import get_current_timestamp


from modules.thread.exception import MessageNotFound, ThreadNotFound
from modules.thread.model import ChatThread, ConversationMessage
from modules.thread.repository import ThreadRepository
from modules.thread.schema import (
    ChatResponse,
    DoubtSolverAgentChatRequest,
    RoadmapAgentChatRequest,
    ThreadCreate,
    ThreadType,
    ThreadUpdate,
)
from shared.db.dependencies import get_db
from shared.email.dependencies import get_background_email_service
from shared.email.schema import EmailAttachment, EmailTemplate
from shared.email.service import BackgroundEmailService
from shared.redis import redis

logger = logging.getLogger(__name__)


class ThreadService:
    def __init__(
        self, repo: ThreadRepository, email_service: BackgroundEmailService
    ) -> None:
        self.repo = repo
        self.email_service = email_service

    async def create_thread(self, user_id: str, data: ThreadCreate) -> ChatThread:
        return await self.repo.create_thread(user_id=user_id, data=data)

    async def get_thread(self, thread_id: str, user_id: str) -> ChatThread:
        thread = await self.repo.get_thread_by_id(thread_id)
        if not thread:
            raise ThreadNotFound("Thread not found")
        return thread

    async def update_thread(
        self, thread_id: str, user_id: str, data: ThreadUpdate
    ) -> ChatThread:
        thread = await self.repo.update_thread(
            thread_id=thread_id, user_id=user_id, data=data
        )
        if not thread:
            raise ThreadNotFound("Thread not found")
        return thread

    async def update_thread_status(
        self,
        thread_id: str,
        user_id: str,
        status: Literal["pending", "running", "complete", "failed"],
    ) -> ChatThread:
        thread = await self.repo.update_thread_running_status(
            thread_id=thread_id, user_id=user_id, status=status
        )
        if not thread:
            raise ThreadNotFound("Thread not found")
        return thread

    async def delete_thread(self, thread_id: str, user_id: str) -> None:
        deleted = await self.repo.delete_thread(thread_id=thread_id, user_id=user_id)
        if not deleted:
            raise ThreadNotFound("Thread not found")

    async def get_user_threads(
        self, user_id: str, thread_type: str | None = None
    ) -> list[ChatThread]:
        return await self.repo.get_user_threads(
            user_id=user_id, thread_type=thread_type
        )

    async def get_thread_messages(self, thread_id: str) -> list[ConversationMessage]:
        thread = await self.repo.get_thread_by_id(thread_id)
        if not thread:
            raise ThreadNotFound("Thread not found")
        return await self.repo.get_thread_messages(thread_id)

    async def stop_thread(self, thread_id: str, run_id: str, user_id: str):
        await self.get_thread(thread_id=thread_id, user_id=user_id)
        signal_id = f"stop_signal::{thread_id}::{user_id}::{run_id}"
        await redis.set(signal_id, "true", ex=300)

        return {"status": "success"}

    async def create_message(
        self,
        thread_id: str,
        user_id: str,
        role: Literal["human", "assistant"],
        content: list[dict],
        message_metadata: dict | None = None,
    ) -> ConversationMessage:
        thread = await self.repo.get_thread_by_id(thread_id)
        if not thread:
            raise ThreadNotFound("Thread not found")
        return await self.repo.create_message(
            thread_id=thread_id,
            user_id=user_id,
            role=role,
            content=content,
            message_metadata=message_metadata,
        )

    async def save_conversation_to_db(
        self,
        organization_id: str,
        team_id: str | None,
        message_id: str,
        thread_id: str,
        user_id,
        role: Literal["human", "assistant"],
        content: list[dict],
        mode: Literal["update", "overwrite"] = "update",
    ):
        try:
            current_timestamp = get_current_timestamp()

            existing_message = await self.repo.get_message_by_id(
                message_id=message_id, thread_id=thread_id
            )

            if existing_message:
                print(f"In existing message with message id: {message_id}")

                existing_content = existing_message.content or []

                if mode == "update":
                    # Safe append (avoid in-place mutation)
                    new_content = existing_content + content

                elif mode == "overwrite":
                    history = []
                    current_data = existing_content

                    # Check if audit record already exists
                    if (
                        existing_content
                        and isinstance(existing_content[0], dict)
                        and existing_content[0].get("type") == "audit"
                    ):
                        history = existing_content[0].get("past_data", [])
                        current_data = existing_content[1:]

                    # Append current version to history
                    history.append(current_data)

                    audit_record = {
                        "type": "audit",
                        "past_data": history,
                        "archived_at": current_timestamp.isoformat(),
                    }

                    new_content = [audit_record] + content

                # await self.repo.update_thread(
                #     thread_id=thread_id,
                #     user_id=user_id,
                #     data=ThreadUpdate(
                #         organization_id=organization_id,
                #         team_id=team_id,
                #         content=new_content,
                #     ),
                # )

                await self.repo.update_message_content(
                    message_id=message_id, thread_id=thread_id, content=new_content
                )

            else:
                print(f"Creating new message entry with message id: {message_id}")

                await self.repo.create_message(
                    message_id=message_id,
                    thread_id=thread_id,
                    user_id=user_id,
                    role=role,
                    content=content,
                    message_metadata={},
                )

        except Exception as e:
            logger.error(
                f"Exception occured in save_conversation_to_db {str(e)}", exc_info=True
            )
            raise

    async def update_message_feedback(
        self,
        message_id: str,
        thread_id: str,
        feedback: Literal["like", "dislike"],
    ) -> ConversationMessage:
        message = await self.repo.update_message_feedback(
            message_id=message_id, thread_id=thread_id, feedback=feedback
        )
        if not message:
            raise MessageNotFound("Message not found")
        return message

    async def update_message_content(
        self,
        message_id: str,
        thread_id: str,
        content: list[dict],
    ) -> ConversationMessage:
        message = await self.repo.update_message_content(
            message_id=message_id, thread_id=thread_id, content=content
        )
        if not message:
            raise MessageNotFound("Message not found")
        return message

    async def email_roadmap(
        self, email: str, thread_id: str, attachments: list[UploadFile]
    ):

        email_attachments: list[EmailAttachment] = []

        for attachment in attachments:
            email_attachments.append(
                EmailAttachment(
                    filename=attachment.filename or "attachment",
                    content=await attachment.read(),
                    content_type=attachment.content_type,
                )
            )

        self.email_service.send_email(
            template=EmailTemplate.ROADMAP_EMAIL_FROM_THREAD,
            to_emails=[email],
            attachments=email_attachments,
            subject_text="Your Personalized Learning Roadmap is Ready",
            message="We've prepared a structured roadmap to help you move forward with clarity and confidence. This plan is designed to guide your learning step by step, so you can focus on consistent progress rather than uncertainty.",
            cta_url=f"{settings.site_base_url}/shifu/{thread_id}",
            cta_text="View Your Roadmap",
        )

        return True

    async def start_roadmap_generation_thread(
        self, user_id: str, data: RoadmapAgentChatRequest
    ) -> ChatResponse:
        user_message = data.message
        thread_id = data.thread_id

        is_force_generation_from_prompt = False
        additional_data = {}
        if data.time_commitment:
            additional_data["time_commitment"] = data.time_commitment
        if data.prompt:
            additional_data["prompt"] = data.prompt
        if data.m_id:
            additional_data["m_id"] = data.m_id
        if data.retry:
            additional_data["retry"] = data.retry
        if data.generate_from_prompt:
            additional_data["generate_from_prompt"] = data.generate_from_prompt
            is_force_generation_from_prompt = True

        is_new_thread = True if not thread_id else False

        if is_new_thread:
            print("New graph invokation....")
            new_thread = await self.create_thread(
                user_id=user_id,
                data=ThreadCreate(
                    organization_id=data.organization_id,
                    team_id=data.team_id,
                    project_id=data.project_id,
                    title=str(
                        data.thread_title
                        if is_force_generation_from_prompt
                        else user_message
                    ),
                    thread_type=ThreadType.ROADMAP_GENERATION,
                    thread_metadata={}
                    if not is_force_generation_from_prompt
                    else {
                        "ref_assessment_id": data.assessment_id,
                        "source": "objective_assessmet_setuschool",
                        "force_generation_prompt": data.prompt,
                    },
                ),
            )

            thread_id = new_thread.thread_id

        # save to pg
        if user_message and not is_force_generation_from_prompt:
            human_message = [{"type": "text", "data": {"text": user_message}}]
            # if time_commitment:
            #     human_message.append(
            #         {
            #             "type": "artifact",
            #             "subtype": "time_commitment",
            #             "data": {"name": get_time_commitment_by_id(time_commitment)["name"]}
            #         }
            #     )
            await self.save_conversation_to_db(
                organization_id=data.organization_id,
                team_id=data.team_id,
                message_id=str(uuid.uuid4()),
                thread_id=str(thread_id),
                user_id=user_id,
                role="human",
                content=human_message,
            )

        await self.update_thread_status(
            thread_id=str(thread_id), user_id=user_id, status="pending"
        )

        run_id = str(uuid.uuid4())

        from modules.roadmap_agent.agent import run_graph_task as run_roadmap_gen_agent

        run_roadmap_gen_agent.delay(  # type: ignore
            thread_id,
            user_id,
            data.organization_id,
            data.team_id,
            data.project_id,
            run_id,
            user_message,
            is_new_thread,
            additional_data,
        )

        return ChatResponse(
            thread_id=thread_id,
            run_id=run_id,
            status="accepted",
        )

    async def start_doubt_solver_agent_thread(
        self, user_id: str, data: DoubtSolverAgentChatRequest
    ) -> ChatResponse:
        try:
            user_message = data.message
            thread_id = data.thread_id

            additional_data = {}
            if not data.roadmap_id:
                raise BadRequestException("roadmap not provided")

            additional_data["roadmap_id"] = data.roadmap_id
            if data.chapter_id:
                additional_data["chapter_id"] = data.chapter_id
            if data.m_id:
                additional_data["m_id"] = data.m_id
            if data.retry:
                additional_data["retry"] = data.retry

            is_new_thread = True if not thread_id else False

            if is_new_thread:
                print("New graph invokation....")
                thread_metadata = {"roadmap_id": data.roadmap_id}
                new_thread = await self.create_thread(
                    user_id=user_id,
                    data=ThreadCreate(
                        organization_id=data.organization_id,
                        team_id=data.team_id,
                        project_id=data.project_id,
                        title=str(user_message),
                        thread_type=ThreadType.ROADMAP_DOUBT,
                        thread_metadata=thread_metadata,
                    ),
                )
                thread_id = new_thread.thread_id

            # save to pg
            if user_message:
                human_message = [{"type": "text", "data": {"text": user_message}}]

                await self.save_conversation_to_db(
                    organization_id=data.organization_id,
                    team_id=data.team_id,
                    message_id=str(uuid.uuid4()),
                    thread_id=str(thread_id),
                    user_id=user_id,
                    role="human",
                    content=human_message,
                )

            await self.update_thread_status(
                thread_id=str(thread_id), user_id=user_id, status="pending"
            )

            run_id = str(uuid.uuid4())

            from modules.doubt_solver_agent.agent import (
                run_graph_task as run_doubt_solver_agent,
            )

            run_doubt_solver_agent.delay(  # type: ignore
                thread_id,
                user_id,
                data.organization_id,
                data.team_id,
                data.project_id,
                run_id,
                user_message,
                is_new_thread,
                additional_data,
            )

            return ChatResponse(
                thread_id=thread_id,
                run_id=run_id,
                status="accepted",
            )
        except Exception as e:
            logger.error(f"Error occured in start_doubt_solver_agent_thread: {str(e)}")
            raise e


async def get_thread_service(
    db: AsyncSession = Depends(get_db),
    email_service: BackgroundEmailService = Depends(get_background_email_service),
) -> ThreadService:
    return ThreadService(repo=ThreadRepository(db=db), email_service=email_service)
