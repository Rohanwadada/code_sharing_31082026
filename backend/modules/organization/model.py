from datetime import datetime
from typing import Any

import uuid_utils as uuid
from sqlalchemy import DateTime, Enum, ForeignKey, PrimaryKeyConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from modules.organization.schema import OrganizationMembershipStatus
from shared.db.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    # __table_args__ = (
    #     UniqueConstraint(
    #         "slug",
    #         name="uq_organizations_slug",
    #     ),
    # )

    organization_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    organization_name: Mapped[str] = mapped_column(Text, nullable=False)
    # slug: Mapped[str] = mapped_column(Text, nullable=False)
    organization_details: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    created_by: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id"),
        nullable=False,
    )
    updated_by: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id"),
        nullable=False,
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
        organization_name: str,
        # slug: str,
        created_by: str,
        updated_by: str,
        organization_details: dict[str, Any] | None = None,
    ):
        self.organization_id = self.generate_organization_id()
        self.organization_name = organization_name
        # self.slug = slug
        self.created_by = created_by
        self.updated_by = updated_by
        self.organization_details = organization_details or {}

    @staticmethod
    def generate_organization_id() -> str:
        organization_uuid = str(uuid.uuid7())
        return organization_uuid

    def __repr__(self) -> str:
        return f"<Organization(organization_id={self.organization_id}, name={self.organization_name})>"


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"

    __table_args__ = (
        PrimaryKeyConstraint(
            "user_id",
            "organization_id",
        ),
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[OrganizationMembershipStatus] = mapped_column(
        Enum(
            OrganizationMembershipStatus,
            values_callable=lambda e: [i.value for i in e],
            native_enum=False,
        ),
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
        organization_id: str,
        status: OrganizationMembershipStatus,
    ):
        self.user_id = user_id
        self.organization_id = organization_id
        self.status = status

    def __repr__(self) -> str:
        return (
            f"<OrganizationMembership("
            f"user_id={self.user_id}, "
            f"organization_id={self.organization_id}, "
            f"status={self.status})>"
        )
