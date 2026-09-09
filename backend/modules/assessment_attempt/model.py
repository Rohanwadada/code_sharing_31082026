from sqlalchemy import UUID, Boolean,  Float, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import mapped_column

from core.time import get_current_timestamp
from shared.db.base import Base



class AllocatedExams(Base):
    __tablename__ = "allocated_exams"

    allocation_id = mapped_column(Text, primary_key=True)
    user_id = mapped_column(UUID(as_uuid=False), ForeignKey("user_details.user_id"), nullable=False)
    exam_id = mapped_column(UUID(as_uuid=False), nullable=False)

    allocated_questions = mapped_column(JSONB, nullable=False)
    total_questions = mapped_column(Integer, nullable=False)
    complexity_distribution = mapped_column(JSONB, nullable=False)

    exam_duration = mapped_column(Integer, nullable=False)

    allocated_date = mapped_column(DateTime(timezone=True), nullable=False, default=get_current_timestamp)

    test_language = mapped_column(Text, nullable=False, default="en-US")

    assessment_type = mapped_column(Text, nullable=False)


class Submissions(Base):
    __tablename__ = "submissions"

    submission_id = mapped_column(Integer, primary_key=True, autoincrement=True)

    allocation_id = mapped_column(Text, ForeignKey("allocated_exams.allocation_id"), nullable=False)

    submission_details = mapped_column(JSONB, nullable=False)

    total_marks = mapped_column(Float, nullable=False)
    obtained_marks = mapped_column(Float, nullable=False)
    obtained_percentage = mapped_column(Float, nullable=False)

    secured_level = mapped_column(Text, nullable=False)

    submission_mode = mapped_column(Text, nullable=False)

    submission_time = mapped_column(DateTime(timezone=True), nullable=False, default=get_current_timestamp)

    total_time_taken = mapped_column(Text, nullable=False)
    average_time_taken = mapped_column(Text, nullable=False)

    number_of_attempted_question = mapped_column(Integer, nullable=False)

    total_number_of_correct_answer = mapped_column(Integer, nullable=False, default=0)
    total_number_of_partial_correct_answer = mapped_column(Integer, nullable=False, default=0)

    best_streak = mapped_column(Integer, nullable=False, default=0)

    detailed_result = mapped_column(JSONB, nullable=False)

    evaluation_details = mapped_column(JSONB, default=dict)

    final_result = mapped_column(JSONB, default=dict)

    is_final_submission = mapped_column(Boolean, nullable=False, default=False)