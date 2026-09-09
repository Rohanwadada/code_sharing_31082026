from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base
import modules.project.model  # noqa: F401 — registers projects table



class ChatThread(Base):
    __tablename__ = "chat_threads"

    thread_id: Mapped[str] = mapped_column(Text, primary_key=True)

    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        nullable=False,
    )

    team_id: Mapped[str | None] = mapped_column(
        Text,
        ForeignKey("teams.team_id", ondelete="CASCADE"),
        nullable=True,
    )

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str | None] = mapped_column(Text, nullable=True)

    thread_type: Mapped[str] = mapped_column(Text, nullable=False)

    thread_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=get_current_timestamp,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=get_current_timestamp,
        onupdate=get_current_timestamp,
    )


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    __table_args__ = (
        CheckConstraint(
            "role IN ('human', 'assistant')",
            name="conversation_messages_role_check",
        ),
        Index("idx_conv_thread_created", "thread_id", "created_at"),
        Index("idx_conv_thread_updated", "thread_id", "updated_at"),
    )

    message_id: Mapped[str] = mapped_column(Text, primary_key=True)

    thread_id: Mapped[str] = mapped_column(
        Text,
        ForeignKey("chat_threads.thread_id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(Text, nullable=False)

    content: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
    )

    message_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=get_current_timestamp,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=get_current_timestamp,
        onupdate=get_current_timestamp,
    )
