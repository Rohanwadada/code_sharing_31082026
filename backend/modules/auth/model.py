from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base


class UserSessions(Base):
    __tablename__ = "user_sessions"

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'revoked')",
            name="chk_user_sessions_status",
        ),
    )

    session_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("user_details.user_id"), nullable=False
    )
    current_refresh_jti: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="active",
        server_default="active",
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
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
