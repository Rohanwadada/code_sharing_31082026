from datetime import datetime

import uuid_utils as uuid
from sqlalchemy import UUID, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    project_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    project_name: Mapped[str] = mapped_column(Text, nullable=False)
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("organizations.organization_id"), nullable=False
    )
    function_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("functions.function_id"), nullable=True
    )
    designation_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("designations.designation_id"), nullable=True
    )

    hiring_goal: Mapped[str] = mapped_column(Text)
    jd_url: Mapped[str] = mapped_column(Text)

    project_status: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=lambda: {"status": "draft"}
    )

    created_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id")
    )

    updated_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )

    project_details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_current_timestamp,
        onupdate=get_current_timestamp,
        nullable=False,
    )


class ProjectHiringManager(Base):
    __tablename__ = "project_hiring_managers"

    project_manager_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("projects.project_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )


class ProjectHiringSponsor(Base):
    __tablename__ = "project_hiring_sponsors"

    project_hiring_sponsor_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("projects.project_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=False
    )
    created_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id")
    )
    sponsor_details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )


class Function(Base):
    __tablename__ = "functions"

    function_id = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        nullable=False,
    )
    function_name = mapped_column(Text, nullable=False)
    function_details = mapped_column(JSONB, nullable=False, default=dict)
    created_by = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_details.user_id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )


class Designation(Base):
    __tablename__ = "designations"

    designation_id = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    function_id = mapped_column(
        UUID(as_uuid=True), ForeignKey("functions.function_id"), nullable=True
    )
    organization_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        nullable=False,
    )
    designation_name = mapped_column(Text, nullable=False)
    created_by = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_details.user_id"), nullable=True
    )
    designation_details = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )
