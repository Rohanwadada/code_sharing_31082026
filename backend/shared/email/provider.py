from abc import ABC, abstractmethod
from email.message import EmailMessage
import mimetypes
import smtplib
from typing import List, Optional

import logging
from core.config import settings
from shared.email.schema import EmailAttachment

logger = logging.getLogger(__name__)


class EmailProvider(ABC):
    @abstractmethod
    async def send(
        self,
        to_emails: List[str],
        subject: str,
        html: str,
        text: str,
        attachments: Optional[List[EmailAttachment]] = None,
    ): ...


class SMTPEmailProvider(EmailProvider):
    def __init__(self) -> None:
        super().__init__()

    async def send(
        self,
        to_emails: List[str],
        subject: str,
        html: str,
        text: str,
        attachments: Optional[list[EmailAttachment]] = None,
    ):
        try:
            msg = EmailMessage()
            msg["From"] = settings.email_sender
            msg["To"] = to_emails
            msg["Subject"] = subject

            msg.set_content(text)
            msg.add_alternative(html, subtype="html")

            # Add attachments
            for attachment in attachments or []:
                if attachment.content_type:
                    maintype, subtype = attachment.content_type.split("/", 1)
                else:
                    guessed_type, _ = mimetypes.guess_type(attachment.filename)
                    if guessed_type:
                        maintype, subtype = guessed_type.split("/", 1)
                    else:
                        maintype, subtype = "application", "octet-stream"

                msg.add_attachment(
                    attachment.content,
                    maintype=maintype,
                    subtype=subtype,
                    filename=attachment.filename,
                )

            with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.email_sender, settings.email_password)
                server.send_message(msg)
                server.close()
        except Exception as e:
            raise e
