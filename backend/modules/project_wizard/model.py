from datetime import datetime
import uuid_utils as uuid
from sqlalchemy import UUID, DateTime, ForeignKey, String, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base
import modules.user.model  # noqa: F401
import modules.project.model  # noqa: F401
import modules.roadmap.model  # noqa: F401


class ProjectWizardSession(Base):
    __tablename__ = "project_wizard_sessions"

    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False
    )
    current_step: Mapped[str] = mapped_column(
        String(100), default="step_1_project_details", nullable=False
    )
    last_route: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    step_data: Mapped[dict] = mapped_column(
        JSONB, default=dict, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_current_timestamp,
        onupdate=get_current_timestamp,
        nullable=False,
    )
