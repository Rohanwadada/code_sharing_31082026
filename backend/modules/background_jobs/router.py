from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.background_jobs.notification_service import (
    BackgroundTaskNotificationService,
    get_background_task_notification_service,
)
from modules.background_jobs.schema import TaskNotificationAddRequest
from modules.user.model import UserDetails

router = APIRouter(prefix="", tags=["background job"])


@router.post("/tn/notify")
async def add_notification_route(
    data: TaskNotificationAddRequest,
    user: UserDetails = Depends(get_current_user),
    task_notification_service: BackgroundTaskNotificationService = Depends(
        get_background_task_notification_service
    ),
):
    response = await task_notification_service.add_notification(
        user_id=user.user_id,
        job_id=data.job_id,
        channels=data.channels,
        content=data.content,
        notification_type=data.notification_type,
    )
    return response
