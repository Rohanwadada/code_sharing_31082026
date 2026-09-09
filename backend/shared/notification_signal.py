import logging

from celery.signals import task_success

from core.database import AsyncSessionLocal
from modules.background_jobs.notification_service import (
    BackgroundTaskNotificationService,
)
from shared.celery import _worker_loop
from shared.email.dependencies import get_email_service
from shared.email.schema import EmailTemplate

logger = logging.getLogger(__name__)

email_service = get_email_service()

TASK_NOTIFICATION_MAP: dict[str, EmailTemplate] = {
    "content_gen": EmailTemplate.CONTENT_GENERATION_SUCCESS,
}


@task_success.connect
def on_task_success(sender=None, result=None, **kwargs):
    if not result or not isinstance(result, dict):
        return
    task_type = result.get("type")
    if task_type not in TASK_NOTIFICATION_MAP:
        return
    _worker_loop.run_until_complete(_notify_user_async(result))


async def _notify_user_async(result: dict):
    job_id = result.get("job_id")
    user_id = result.get("user_id")
    task_type = result.get("type")

    if not job_id or not user_id or not task_type:
        return

    email_template = TASK_NOTIFICATION_MAP[task_type]

    async with AsyncSessionLocal() as db:
        try:
            notification_service = BackgroundTaskNotificationService(
                db=db, email_service=email_service
            )

            (
                notification_content,
                verdict,
            ) = await notification_service.check_notification(
                user_id=user_id,
                job_id=job_id,
                notification_type=task_type,
            )

            if verdict:
                await notification_service.send_notification(
                    content=notification_content,
                    notification_type=email_template,
                )
                await notification_service.update_notification_status(
                    user_id=user_id,
                    job_id=job_id,
                    notification_type=task_type,
                    status="resolved",
                )
                logger.info(f"Notification sent for job {job_id} to user {user_id}")
        except Exception as e:
            logger.error(
                f"Failed to send notification for job {job_id}: {e}", exc_info=True
            )
