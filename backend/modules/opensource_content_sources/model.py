from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base


class OpenSourceContentSource(Base):
    __tablename__ = "opensource_content_sources"

    content_source_id: Mapped[str] = mapped_column(Text, primary_key=True)

    created_by: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    source_name: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)

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
