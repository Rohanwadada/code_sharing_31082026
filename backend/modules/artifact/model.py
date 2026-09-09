from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base
import uuid_utils as uuid


class ArtifactRepository(Base):
    __tablename__ = "artifact_repository"

    artifact_id: Mapped[str] = mapped_column(Text, primary_key=True)

    thread_id: Mapped[str] = mapped_column(
        Text, ForeignKey("chat_threads.thread_id", ondelete="CASCADE"), nullable=False
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        nullable=False,
    )

    team_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("teams.team_id", ondelete="CASCADE"), nullable=True
    )

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str] = mapped_column(Text, nullable=True)

    description: Mapped[str] = mapped_column(Text, nullable=True)

    artifact_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    artifact_type: Mapped[str] = mapped_column(Text, nullable=False)

    artifact_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

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

    def __init__(
        self,
        thread_id: str,
        organization_id: str,
        team_id: str | None,
        title: str,
        description: str,
        artifact_data: dict,
        artifact_type: str,
        artifact_metadata: dict,
        project_id: str
    ):
        self.artifact_id = self.generate_artifact_id()
        self.thread_id = thread_id
        self.organization_id = organization_id
        self.team_id = team_id
        self.title = title
        self.description = description
        self.artifact_data = artifact_data
        self.artifact_type = artifact_type
        self.artifact_metadata = artifact_metadata
        self.project_id = project_id

    @staticmethod
    def generate_artifact_id() -> str:
        return str(uuid.uuid7())
