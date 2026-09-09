import secrets
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import EmailStr
from sqlalchemy import UUID, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.security.encryption import get_cipher
from core.security.hashing import hash_entity
from core.time import get_current_timestamp
from shared.db.base import Base
from shared.db.types import EncryptedText
import uuid_utils as uuid

if TYPE_CHECKING:
    from modules.roadmap.model import UserRoadmap

cipher = get_cipher()


class UserDetails(Base):
    __tablename__ = "user_details"

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_email: Mapped[str] = mapped_column(
        Text, unique=True, nullable=False
    )
    email: Mapped[EmailStr] = mapped_column(Text, unique=True, nullable=False)
    profile_image: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # Stores the image path or URL
    registration_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_current_timestamp
    )
    institute_or_organization: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    provided_role: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default="Learner"
    )
    utm_source: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # Marketing or referral source
    phone_no: Mapped[str | None] = mapped_column(
        EncryptedText(cipher=cipher), unique=True, nullable=True
    )
    linkedin_profile: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # LinkedIn profile URL
    designation_specialization: Mapped[str | None] = mapped_column(
        String(150), nullable=True
    )
    year_of_experience: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )  # Allows decimal values (e.g., 2.5 years)
    gender: Mapped[str | None] = mapped_column(
        EncryptedText(cipher=cipher), nullable=True
    )  # Male, Female, Other

    roadmap_associations: Mapped[list["UserRoadmap"]] = relationship(
        "UserRoadmap",
        foreign_keys="UserRoadmap.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    granted_roadmaps: Mapped[list["UserRoadmap"]] = relationship(
        "UserRoadmap",
        foreign_keys="UserRoadmap.granted_by",
        back_populates="granted_by_user",
    )

    def __init__(
        self,
        user_email: str,
        user_name: str | None = None,
        profile_image: str | None = None,
        institute_or_organization: str | None = None,
        provided_role: str | None = "Learner",
        utm_source: str | None = None,
        phone_no: str | None = None,
        linkedin_profile: str | None = None,
        designation_specialization: str | None = None,
        year_of_experience: float | None = None,
        gender: str | None = None,
    ):
        self.user_id = self.generate_user_id()
        self.user_name = user_name
        self.user_email = user_email
        self.email = hash_entity(user_email)
        self.profile_image = profile_image
        self.institute_or_organization = institute_or_organization
        self.provided_role = provided_role
        self.utm_source = utm_source
        self.phone_no = phone_no
        self.linkedin_profile = linkedin_profile
        self.designation_specialization = designation_specialization
        self.year_of_experience = year_of_experience
        self.gender = gender

    @staticmethod
    def generate_user_id() -> str:
        """
        Generate a unique user ID.
        """
        # user_hash = secrets.token_urlsafe(16)
        # generated_user_id = f"user-{user_hash}"

        generated_user_id = str(uuid.uuid7())
        return generated_user_id

    def __repr__(self) -> str:
        return (
            f"<UserDetails(user_name={self.user_name}, user_email={self.user_email})>"
        )
