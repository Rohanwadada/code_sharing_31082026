from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from modules.team.schema import TeamMembershipStatus
from shared.db.base import Base
import uuid_utils as uuid


class Team(Base):
    __tablename__ = "teams"

    __table_args__ = (
        UniqueConstraint(
            "slug",
            name="uq_teams_slug",
        ),
    )

    team_id: Mapped[str] = mapped_column(Text, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    team_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
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

    def __init__(
        self,
        organization_id: str,
        created_by: str,
        name: str,
        slug: str,
        team_metadata: dict[str, Any] | None = None,
    ):
        self.team_id = self.generate_team_id()
        self.organization_id = organization_id
        self.created_by = created_by
        self.name = name
        self.slug = slug
        self.team_metadata = team_metadata or {}

    @staticmethod
    def generate_team_id() -> str:
        team_uuid = str(uuid.uuid7())
        return team_uuid

    def __repr__(self) -> str:
        return f"<Team(team_id={self.team_id}, name={self.name})>"


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    __table_args__ = (
        PrimaryKeyConstraint(
            "user_id",
            "team_id",
        ),
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id: Mapped[str] = mapped_column(
        ForeignKey("teams.team_id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[TeamMembershipStatus] = mapped_column(
        Enum(TeamMembershipStatus, native_enum=False),
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=get_current_timestamp,
    )

    def __init__(
        self,
        user_id: str,
        team_id: str,
        status: TeamMembershipStatus,
    ):
        self.user_id = user_id
        self.team_id = team_id
        self.status = status

    def __repr__(self) -> str:
        return f"<TeamMembership(user_id={self.user_id}, team_id={self.team_id})>"
