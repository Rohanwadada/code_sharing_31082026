from dataclasses import dataclass
from enum import StrEnum
from typing import Optional


class EmailTemplate(StrEnum):
    LOGIN_OTP = "login_otp"
    ROADMAP_EMAIL_FROM_THREAD = "roadmap_email_from_thread"
    ROADMAP_ACCESS_GRANTED = "roadmap_access_granted"
    ROADMAP_EDITOR_ACCESS_GRANTED = "roadmap_editor_access_granted"
    ROADMAP_CONTENT_UPDATE = "roadmap_content_update"
    CONTENT_GENERATION_SUCCESS = "content_generation_success"
    ASSESSMENT_ACCESS_GRANTED = "assessment_access_granted"


@dataclass
class EmailAttachment:
    filename: str
    content: bytes
    content_type: Optional[str] = None
