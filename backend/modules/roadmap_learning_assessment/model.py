from datetime import datetime
from typing import Any

from sqlalchemy.dialects.postgresql.json import JSONB
import uuid_utils as uuid
from sqlalchemy import (
    UUID,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.time import get_current_timestamp
from shared.db.base import Base


class RoadmapLearningAssessment(Base):
    __tablename__ = "roadmap_learning_assessment"

    assessment_id: Mapped[str] = mapped_column(
        UUID(
            as_uuid=False,
        ),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    roadmap_id: Mapped[str] = mapped_column(
        Text, ForeignKey("roadmaps.roadmap_id"), nullable=True
    )
    node_id: Mapped[str] = mapped_column(Text, nullable=True)
    organization_id = mapped_column(UUID(as_uuid=False), nullable=True)
    created_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    updated_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    # time_limit_mins = mapped_column(Integer, nullable=True, default=0)
    # question_time_limit_secs = mapped_column(Integer, nullable=True, default=0)
    duration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    assessment_url: Mapped[str] = mapped_column(Text, nullable=True)
    excel_export_url: Mapped[str] = mapped_column(Text, nullable=True)
    assessment_details = mapped_column(JSONB, nullable=True, default=dict)
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

    questions = relationship(
        "RoadmapLearningAssessmentQuestions", backref="assessment", lazy=True, cascade="all, delete-orphan"
    )

    def __init__(self, **kw: Any):
       super().__init__(**kw)

    def to_dict(self):
        return {
            "assessment_id": self.assessment_id,
            "title": self.title,
            "roadmap_id": self.roadmap_id,
            "created_by": self.created_by,
            # "time_limit_mins": self.time_limit_mins,
            # "question_time_limit_secs": self.question_time_limit_secs,
            "assessment_url": self.assessment_url,
            "excel_export_url": self.excel_export_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "questions": [q.to_dict() for q in self.questions],
        }


class RoadmapLearningAssessmentQuestions(Base):
    __tablename__ = "roadmap_learning_assessment_questions"

    question_id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(
        ForeignKey("roadmap_learning_assessment.assessment_id"), nullable=False
    )
    question_text = Column(Text, nullable=False)
    option_1 = mapped_column(Text, nullable=True)
    option_2 = mapped_column(Text, nullable=True)
    option_3 = mapped_column(Text, nullable=True)
    option_4 = mapped_column(Text, nullable=True)
    correct_option_text = mapped_column(Text, nullable=True)
    hints_text = Column(Text, nullable=True)
    code_snippets = Column(Text)

    question_type = mapped_column(Text, nullable=False, default='mcq')

    topic = Column(Text, nullable=True)
    subtopic = Column(Text, nullable=True)
    solution_explanation = Column(Text)
    marks = mapped_column(Integer, nullable=True)
    source_of_question = mapped_column(String(255), nullable=True)
    question_status = mapped_column(String(50), nullable=True)
    question_details = mapped_column(JSONB, nullable=True, default=dict)
    organization_id = mapped_column(UUID(as_uuid=False), nullable=True)
    created_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
    )
    updated_by = mapped_column(
        UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=True
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
    

    def __init__(self, **kw: Any):
       super().__init__(**kw)

    def to_dict(self):
        return {
            "question_id": self.question_id,
            "question": self.question_text,
            "question_text": self.question_text,
            "topic": self.topic,
            "subtopic": self.subtopic,
            "code_snippets": self.code_snippets,
            "hints_text": self.hints_text,
            "solution_explanation": self.solution_explanation,
            "option_1": self.option_1,
            "option_2": self.option_2,
            "option_3": self.option_3,
            "option_4": self.option_4,
            "answer": self.correct_option_text,
            "correct_answer": self.correct_option_text,
        }
