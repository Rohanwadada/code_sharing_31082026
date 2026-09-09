import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from celery import Celery

from core.config import settings


_worker_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_worker_loop)

celery_app = Celery(
    "worker",
    broker=settings.celery_broker_url,
    include=[
        "modules.ai_content_generation.tasks",
        "modules.course_recommendation.tasks",
        "modules.roadmap_agent.agent",
        "modules.doubt_solver_agent.agent",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
)

import shared.notification_signal  # noqa: E402, F401
