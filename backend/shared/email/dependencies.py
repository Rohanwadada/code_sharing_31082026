from functools import lru_cache

from fastapi import BackgroundTasks

from shared.email.provider import SMTPEmailProvider
from shared.email.service import BackgroundEmailService, EmailService

provider = SMTPEmailProvider()


@lru_cache
def get_email_service() -> EmailService:
    return EmailService(provider=provider)


def get_background_email_service(
    background_tasks: BackgroundTasks,
) -> BackgroundEmailService:
    return BackgroundEmailService(provider=provider, background_tasks=background_tasks)
