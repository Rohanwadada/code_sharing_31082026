import secrets
from datetime import datetime
from typing import Any

import uuid_utils as uuid
from sqlalchemy import CheckConstraint, Computed, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.security.hashing import generate_hash
from core.security.random import securerandomstring
from core.time import get_current_timestamp
from modules.user.model import UserDetails
from shared.db.base import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    roadmap_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.organization_id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[str | None] = mapped_column(
        ForeignKey("teams.team_id", ondelete="CASCADE"), nullable=True
    )
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    roadmap_graph: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    roadmap_content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    price: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=list)
    level: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="draft")
    visibility_scope: Mapped[str] = mapped_column(
        Text, nullable=False, default="private"
    )
    roadmap_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    search_vector = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('english', roadmap_content::text || ' ' || roadmap_graph::text)",
            persisted=True,
        ),
        index=True,
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

    user_roadmaps: Mapped[list["UserRoadmap"]] = relationship(
        "UserRoadmap",
        back_populates="roadmap",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "level IN ('beginner', 'intermediate', 'advanced')",
            name="ck_roadmaps_level",
        ),
        CheckConstraint(
            "status IN ('published', 'pending', 'draft')", name="ck_roadmaps_status"
        ),
        CheckConstraint(
            "visibility_scope IN ('public', 'org', 'team', 'private')",
            name="ck_roadmaps_visibility",
        ),
        Index("ix_roadmap_search", search_vector, postgresql_using="gin"),
    )

    def __init__(
        self,
        user_id: str,
        organization_id: str,
        project_id: str,
        title: str,
        description: str,
        roadmap_graph: dict[str, Any] | None = None,
        roadmap_content: dict[str, Any] | None = None,
        price: dict[str, Any] | None = None,
        level: str = "beginner",
        team_id: str | None = None,
        status: str = "draft",
        visibility_scope: str = "private",
        roadmap_metadata: dict = {},
    ):
        self.roadmap_id = self.generate_roadmap_id()
        self.user_id = user_id
        self.organization_id = organization_id
        self.team_id = team_id
        self.title = title
        self.description = description
        self.roadmap_graph = roadmap_graph or {}
        self.roadmap_content = roadmap_content or {}
        self.roadmap_metadata = roadmap_metadata or {}
        self.price = price or {}
        self.level = level
        self.status = status
        self.visibility_scope = visibility_scope
        self.project_id = project_id

    @staticmethod
    def generate_roadmap_id() -> str:
        roadmap_id = generate_hash(
            "#".join(
                [
                    str(uuid.uuid7()),
                    secrets.token_urlsafe(32),
                    securerandomstring(32),
                ]
            ).encode("utf-8"),
            64,
        )
        return roadmap_id

    def __repr__(self) -> str:
        return f"<Roadmap(roadmap_id={self.roadmap_id}, title={self.title})>"


class UserRoadmap(Base):
    __tablename__ = "user_roadmap"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    granted_by: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="SET NULL"), nullable=True
    )
    roadmap_id: Mapped[str] = mapped_column(
        ForeignKey("roadmaps.roadmap_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    sharing_mode: Mapped[str] = mapped_column(Text, nullable=False)
    user_roadmap_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=get_current_timestamp
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=get_current_timestamp,
        onupdate=get_current_timestamp,
    )

    user: Mapped[UserDetails] = relationship(
        "UserDetails", foreign_keys=[user_id], back_populates="roadmap_associations"
    )

    roadmap: Mapped["Roadmap"] = relationship(
        "Roadmap",
        foreign_keys=[roadmap_id],
        back_populates="user_roadmaps",
    )

    granted_by_user: Mapped["UserDetails"] = relationship(
        "UserDetails",
        foreign_keys=[granted_by],
        back_populates="granted_roadmaps",
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('owner', 'viewer', 'editor')",
            name="ck_user_roadmap_role",
        ),
        CheckConstraint(
            "sharing_mode IN ('basic_sharing', 'purchase', 'public_sharing', 'owner_sharing', 'access_shared_by_admin', 'collaboration')",
            name="ck_user_roadmap_sharing_mode",
        ),
        CheckConstraint(
            "status IN ('active', 'blocked')",
            name="ck_user_roadmap_status",
        ),
    )

    def __init__(self, **kw: Any):
        super().__init__(**kw)
