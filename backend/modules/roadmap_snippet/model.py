from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base


class RoadmapUserData(Base):
    __tablename__ = "roadmap_user_data"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.organization_id", ondelete="CASCADE"),
        primary_key=True,
    )
    preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default={}
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
