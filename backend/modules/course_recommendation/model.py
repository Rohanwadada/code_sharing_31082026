from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.security.encryption import get_cipher
from shared.db.base import Base
from shared.db.types import EncryptedJSON, EncryptedText

cipher = get_cipher()


class EYCourses(Base):
    __tablename__ = "ey_courses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    course_id: Mapped[str] = mapped_column(Text, nullable=False)
    course_name: Mapped[str] = mapped_column(
        EncryptedText(cipher=cipher), nullable=False
    )
    course_url: Mapped[str] = mapped_column(
        EncryptedText(cipher=cipher), nullable=False
    )
    course_modules: Mapped[dict] = mapped_column(JSONB, nullable=False)
    course_description: Mapped[str] = mapped_column(
        EncryptedText(cipher=cipher), nullable=False
    )
    course_metadata: Mapped[dict] = mapped_column(
        EncryptedJSON(
            cipher=cipher,
            keys_to_encrypt=[
                "platform",
                "course_type",
                "credit_type_id",
                "specialization",
                "coursera_domain",
                "coursera_subdomain",
                "ey_field_of_study_name",
                "university_partner_name",
            ],
        ),
        nullable=False,
    )
