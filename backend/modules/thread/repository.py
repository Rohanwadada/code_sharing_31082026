from typing import Literal
from uuid import uuid4

from sqlalchemy import JSON, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from modules.thread.model import ChatThread, ConversationMessage
from modules.thread.schema import ThreadCreate, ThreadUpdate


class ThreadRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_thread_by_id(self, thread_id: str) -> ChatThread | None:
        return await self.db.get(ChatThread, thread_id)

    async def create_thread(self, user_id: str, data: ThreadCreate) -> ChatThread:
        thread = ChatThread(
            thread_id=str(uuid4()),
            user_id=user_id,
            organization_id=data.organization_id,
            team_id=data.team_id,
            project_id=data.project_id,
            title=data.title,
            thread_type=data.thread_type.value,
            thread_metadata=data.thread_metadata,
        )
        self.db.add(thread)
        await self.db.commit()
        await self.db.refresh(thread)
        return thread

    async def update_thread(
        self, thread_id: str, user_id: str, data: ThreadUpdate
    ) -> ChatThread | None:
        thread = await self.db.scalar(
            select(ChatThread).where(
                ChatThread.thread_id == thread_id,
                ChatThread.user_id == user_id,
            )
        )
        if not thread:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if "thread_metadata" in update_data:
            thread.thread_metadata = {
                **(thread.thread_metadata or {}),
                **(update_data.pop("thread_metadata") or {}),
            }
            flag_modified(thread, "thread_metadata")

        for field, value in update_data.items():
            print(f"Field: {field}, Value: {value}")
            setattr(thread, field, value)

        await self.db.commit()
        await self.db.refresh(thread)
        return thread

    async def update_thread_running_status(
        self,
        thread_id: str,
        user_id: str,
        status: Literal["pending", "running", "complete", "failed"],
    ) -> ChatThread | None:
        thread = await self.db.scalar(
            select(ChatThread).where(
                ChatThread.thread_id == thread_id,
                ChatThread.user_id == user_id,
            )
        )
        if not thread:
            return None

        thread.thread_metadata = {
            **(thread.thread_metadata or {}),
            "status": status,
        }
        await self.db.commit()
        await self.db.refresh(thread)
        return thread

    async def delete_thread(self, thread_id: str, user_id: str) -> bool:
        thread = await self.db.scalar(
            select(ChatThread).where(
                ChatThread.thread_id == thread_id,
                ChatThread.user_id == user_id,
            )
        )
        if not thread:
            return False
        await self.db.delete(thread)
        await self.db.commit()
        return True

    async def get_user_threads(
        self, user_id: str, thread_type: str | None = None
    ) -> list[ChatThread]:
        query = select(ChatThread).where(ChatThread.user_id == user_id)
        if thread_type:
            query = query.where(ChatThread.thread_type == thread_type)
        query = query.order_by(ChatThread.updated_at.desc())
        result = await self.db.scalars(query)
        return list(result.all())

    async def get_thread_messages(self, thread_id: str) -> list[ConversationMessage]:
        result = await self.db.scalars(
            select(ConversationMessage)
            .where(ConversationMessage.thread_id == thread_id)
            .order_by(ConversationMessage.created_at)
        )
        return list(result.all())

    async def get_message_by_id(
        self, message_id: str, thread_id: str
    ) -> ConversationMessage | None:
        return await self.db.scalar(
            select(ConversationMessage).where(
                ConversationMessage.message_id == message_id,
                ConversationMessage.thread_id == thread_id,
            )
        )

    async def create_message(
        self,
        thread_id: str,
        user_id: str,
        role: Literal["human", "assistant"],
        content: list[dict],
        message_metadata: dict | None = None,
        message_id: str | None = None,
    ) -> ConversationMessage:
        message = ConversationMessage(
            message_id=message_id if message_id else str(uuid4()),
            thread_id=thread_id,
            user_id=user_id,
            role=role,
            content=content,
            message_metadata=message_metadata or {},
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def update_message_content(
        self,
        message_id: str,
        thread_id: str,
        content: list[dict],
    ) -> ConversationMessage | None:
        message = await self.get_message_by_id(
            message_id=message_id, thread_id=thread_id
        )
        if not message:
            return None
        message.content = content
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def update_message_feedback(
        self,
        message_id: str,
        thread_id: str,
        feedback: Literal["like", "dislike"],
    ) -> ConversationMessage | None:
        message = await self.get_message_by_id(
            message_id=message_id, thread_id=thread_id
        )
        if not message:
            return None
        message.message_metadata = {
            **(message.message_metadata or {}),
            "feedback": 0 if feedback == "dislike" else 1 if feedback == "like" else 0,
        }
        await self.db.commit()
        await self.db.refresh(message)
        return message
