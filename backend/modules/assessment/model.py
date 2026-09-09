from datetime import datetime
from typing import Any

import uuid_utils as uuid
from sqlalchemy import UUID, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.time import get_current_timestamp
from shared.db.base import Base


class AssessmentFormation(Base):
    __tablename__ = "assessment_formation"

    assessment_formation_id = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    assessment_formation_name = mapped_column(String(255), nullable=True)
    assessment_duration = mapped_column(Integer, nullable=True)
    assessment_details = mapped_column(JSONB, nullable=True, default=dict)

    curate_flow_node_id = mapped_column(UUID(as_uuid=False), nullable=True)

    designation_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("designations.designation_id", ondelete="SET NULL"),
        nullable=True,
    )
    function_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("functions.function_id", ondelete="SET NULL"),
        nullable=True,
    )

    organization_id = mapped_column(UUID(as_uuid=False), nullable=True)
    created_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    updated_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
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


class Competency(Base):
    __tablename__ = "competencies"

    competency_id = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    competency_name = mapped_column(String(255), nullable=False)
    competency_description = mapped_column(Text, nullable=True)
    source_of_competency = mapped_column(String(255), nullable=True)
    organization_id = mapped_column(UUID(as_uuid=False), nullable=True)

    designation_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("designations.designation_id", ondelete="SET NULL"),
        nullable=True,
    )
    function_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("functions.function_id", ondelete="SET NULL"),
        nullable=True,
    )

    competency_details = mapped_column(JSONB, nullable=False, default=dict)

    created_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    updated_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
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

    # Relationships
    subcompetencies = relationship(
        "Subcompetency", back_populates="competency", cascade="all, delete-orphan"
    )


class Subcompetency(Base):
    __tablename__ = "subcompetencies"

    subcompetency_id = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    competency_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("competencies.competency_id", ondelete="CASCADE"),
        nullable=False,
    )
    subcompetency_name = mapped_column(String(255), nullable=False)
    subcompetency_description = mapped_column(Text, nullable=True)
    source_of_subcompetency = mapped_column(String(255), nullable=True)
    organization_id = mapped_column(UUID(as_uuid=False), nullable=True)

    designation_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("designations.designation_id", ondelete="SET NULL"),
        nullable=True,
    )
    function_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("functions.function_id", ondelete="SET NULL"),
        nullable=True,
    )

    subcompetency_details = mapped_column(JSONB, nullable=False, default=dict)

    created_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    updated_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
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

    # Relationships
    competency = relationship("Competency", back_populates="subcompetencies")


class McqQuestion(Base):
    __tablename__ = "mcq_questions"

    mcq_question_id = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    question_text = mapped_column(Text, nullable=False)
    option_1 = mapped_column(Text, nullable=True)
    option_2 = mapped_column(Text, nullable=True)
    option_3 = mapped_column(Text, nullable=True)
    option_4 = mapped_column(Text, nullable=True)
    correct_option_text = mapped_column(Text, nullable=True)

    question_type = mapped_column(Text, nullable=False, default='mcq')

    competency_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("competencies.competency_id", ondelete="SET NULL"),
        nullable=True,
    )
    subcompetency_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("subcompetencies.subcompetency_id", ondelete="SET NULL"),
        nullable=True,
    )

    designation_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("designations.designation_id", ondelete="SET NULL"),
        nullable=True,
    )
    function_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("functions.function_id", ondelete="SET NULL"),
        nullable=True,
    )

    hints_text = mapped_column(Text, nullable=True)
    code_snippets = mapped_column(Text, nullable=True)
    marks = mapped_column(Integer, nullable=True)
    source_of_question = mapped_column(String(255), nullable=True)
    question_status = mapped_column(String(50), nullable=True)
    question_details = mapped_column(JSONB, nullable=True, default=dict)

    # Removed strict ForeignKey for now to prevent missing table errors
    organization_id = mapped_column(UUID(as_uuid=False), nullable=True)
    created_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    updated_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
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

    def __init__(self, **kw: Any):
        super().__init__(**kw)


class ProjectAssessmentMap(Base):
    __tablename__ = "project_assessment_map"

    project_assessment_map_id = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=uuid.uuid4
    )
    project_id = mapped_column(UUID(as_uuid=False), nullable=True)

    assessment_formation_id = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("assessment_formation.assessment_formation_id", ondelete="CASCADE"),
        nullable=True,
    )

    created_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )

    created_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp, nullable=False
    )
