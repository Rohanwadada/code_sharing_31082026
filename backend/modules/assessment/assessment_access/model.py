from sqlalchemy import UUID, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base


class UserAssessmentAccess(Base):
    """
    Table storing candidate user access grants for assessments/assignments.
    Identifies candidate users directly via candidate email.
    """

    __tablename__ = "user_assessment_access"

    access_id = mapped_column(UUID(as_uuid=False), primary_key=True)
    assessment_id = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    user_email = mapped_column(Text, nullable=False, index=True)
    user_name = mapped_column(Text, nullable=True)
    organization_id = mapped_column(UUID(as_uuid=False), nullable=True)
    access_status = mapped_column(
        Text, default="GRANTED", nullable=False
    )  # GRANTED, REVOKED, EXPIRED
    granted_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    granted_at = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )
    access_details = mapped_column(JSONB, default=dict)
