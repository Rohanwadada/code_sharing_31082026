import logging
from typing import Any

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exception import BadRequestException
from modules.background_jobs.model import BackgroundTaskNotificationPreference
from shared.db.dependencies import get_db
from shared.email.dependencies import get_email_service
from shared.email.schema import EmailTemplate
from shared.email.service import EmailService

logger = logging.getLogger(__name__)


class BackgroundTaskNotificationService:
    def __init__(self, db: AsyncSession, email_service: EmailService) -> None:
        self.db = db
        self.email_service = email_service

    async def add_notification(
        self,
        user_id: str,
        job_id: str,
        channels: list[dict[str, Any]],
        content: dict,
        notification_type: str,
    ):
        try:
            existing_notification = await self.db.scalar(
                select(BackgroundTaskNotificationPreference).where(
                    BackgroundTaskNotificationPreference.user_id == user_id,
                    BackgroundTaskNotificationPreference.job_id == job_id,
                    BackgroundTaskNotificationPreference.notification_type
                    == notification_type,
                )
            )
            if existing_notification:
                raise BadRequestException("Preference already exists")

            new_notification = BackgroundTaskNotificationPreference(
                user_id=user_id,
                job_id=job_id,
                notification_type=notification_type,
                channels=channels,
                content=content,
                status="pending",
            )

            self.db.add(new_notification)
            await self.db.commit()

            return {"status": "success"}

        except Exception as e:
            logger.error(
                f"Exception occured in add_notification, error: {str(e)}", exc_info=True
            )
            raise e

    async def update_notification_status(
        self, user_id: str, job_id: str, notification_type: str, status: str
    ):
        try:
            np = await self.db.scalar(
                select(BackgroundTaskNotificationPreference)
                .where(
                    BackgroundTaskNotificationPreference.user_id == user_id,
                    BackgroundTaskNotificationPreference.job_id == job_id,
                    BackgroundTaskNotificationPreference.notification_type
                    == notification_type,
                )
                .order_by(BackgroundTaskNotificationPreference.created_at.desc())
            )

            if np:
                np.status = status
                await self.db.commit()
        except Exception as e:
            logger.error(
                f"Exception occured in add_notification, error: {str(e)}", exc_info=True
            )
            raise e

    async def check_notification(
        self, user_id: str, job_id: str, notification_type: str
    ) -> tuple[dict[str, Any], bool]:
        try:
            np = await self.db.scalar(
                select(BackgroundTaskNotificationPreference)
                .where(
                    BackgroundTaskNotificationPreference.user_id == user_id,
                    BackgroundTaskNotificationPreference.job_id == job_id,
                    BackgroundTaskNotificationPreference.notification_type
                    == notification_type,
                    BackgroundTaskNotificationPreference.status == "pending",
                )
                .order_by(BackgroundTaskNotificationPreference.created_at.desc())
            )

            if not np:
                return {}, False

            return {
                "notification_id": np.id,
                "job_id": job_id,
                "email": np.channels[0]["value"],
                "content": np.content,
                "notification_type": np.notification_type,
            }, True
        except Exception as e:
            logger.error(
                f"Exception occured in check_notification, error: {str(e)}",
                exc_info=True,
            )
            return {}, False

    async def send_notification(
        self, content: dict[str, Any], notification_type: EmailTemplate
    ):
        roadmap_title = content["content"]["r_title"]
        roadmap_id = content["content"]["slug"]
        email = content["email"]
        email_content = self.get_email_content(
            notification_type=notification_type, roadmap_title=roadmap_title
        )

        await self.email_service.send_email(
            template=notification_type,
            to_emails=[email],
            roadmap_name=roadmap_title,
            roadmap_url=f"{settings.site_base_url}/roadmap/{roadmap_id}",
            content=email_content["text"],
        )

    def get_email_content(
        self, notification_type: EmailTemplate, roadmap_title: str
    ) -> dict:
        if notification_type == EmailTemplate.CONTENT_GENERATION_SUCCESS:
            return {
                "subject": "Shifu-Content Generated",
                "text": "I have generated content for you. Click the button below to see it.",
            }
        elif notification_type == "course_recommend_success":
            return {
                "subject": "Shifu-Course Recommended",
                "text": f"I have generated course recommendation for the <strong>{roadmap_title}</strong>. Click the button below to see it.",
            }

        return {}


async def get_background_task_notification_service(
    db: AsyncSession = Depends(get_db),
    email_service: EmailService = Depends(get_email_service),
):
    return BackgroundTaskNotificationService(db=db, email_service=email_service)
