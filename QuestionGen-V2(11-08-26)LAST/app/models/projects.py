import uuid

from sqlalchemy import Column, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.sql import func
from app.utils.time_utils import now_ist
from app.db.database import Base

class Project(Base):
    __tablename__ = "projects"

    project_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_name = Column(Text, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False)
    function_id = Column(UUID(as_uuid=True), ForeignKey("functions.function_id"), nullable=True)
    designation_id = Column(UUID(as_uuid=True), ForeignKey("designations.designation_id"), nullable=True)
    hiring_goal = Column(Text) 
    jd_url = Column(Text)
    project_status = Column(JSONB, nullable=False, default=lambda: {"status": "draft"}) 
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ist)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ist, onupdate=now_ist)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True) 
    project_details = Column(JSONB, nullable=False, default=dict)