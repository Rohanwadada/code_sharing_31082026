import uuid

from sqlalchemy import Column, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.sql import func
from app.utils.time_utils import now_ist
from app.db.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    organization_id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    organization_name = Column(Text,nullable=False,unique=True)
    organization_details = Column(JSONB,nullable=False,default=dict)
    created_at = Column(TIMESTAMP(timezone=True),nullable=False,default=now_ist)
    created_by = Column(UUID(as_uuid=True),ForeignKey("users.user_id"),nullable=True)
    # updated_at = Column(TIMESTAMP(timezone=True),nullable=False,default=now_ist)
    
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ist, onupdate=now_ist)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)