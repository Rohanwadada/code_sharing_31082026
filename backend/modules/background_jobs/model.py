from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

import modules.organization.model  # noqa: F401 — registers organizations table
import modules.team.model  # noqa: F401 — registers teams table
from core.time import get_current_timestamp
from shared.db.base import Base


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    __table_args__ = (
        UniqueConstraint(
            "job_id", "organization_id", name="uq_background_jobs_job_org"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(Text, nullable=False)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("teams.team_id", ondelete="CASCADE"),
        nullable=True,
    )
    job_type: Mapped[str] = mapped_column(String(255), nullable=False)

    job_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")

    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=get_current_timestamp
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=get_current_timestamp,
        onupdate=get_current_timestamp,
    )

    def __init__(self, **kw: Any):
        super().__init__(**kw)


class BackgroundTaskNotificationPreference(Base):
    __tablename__ = "background_task_notification_preference"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"), nullable=False
    )

    job_id: Mapped[str] = mapped_column(Text, nullable=False)

    notification_type: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(Text, nullable=False)

    channels: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)

    content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=get_current_timestamp
    )

    def __init__(self, **kw: Any):
        super().__init__(**kw)
