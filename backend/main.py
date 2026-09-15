import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from core.config import settings
from core.database import engine
from core.exception import AppException, app_exception_handler
from core.langgraph_db import langgraph_pool, typed_langgraph_pool

from core.logging import setup_logging
from core.middleware.csrf import CSRFMiddleware

# from core.middleware.request_logging import RequestLoggingMiddleware
from modules.ai_content_generation.router import router as ai_content_generation_router
from modules.artifact.router import router as artifact_router
from modules.assessment.router import router as assessment_router
from modules.audio_transcription.router import router as audio_transcription_router
from modules.auth.router import router as auth_router
from modules.opensource_content_sources.router import (
    router as opensource_content_sources_router,
)
from modules.organization.router import router as organization_router
from modules.roadmap.router import router as roadmap_router
from modules.roadmap_snippet.router import router as roadmap_snippet_router
from modules.team.router import router as team_router
from modules.user.router import router as user_router
from modules.thread.router import router as thread_router
from modules.roadmap.roadmap_access_router import router as roadmap_access_router
from modules.roadmap_content.router import router as roadmap_content_router
from modules.learning_progress.router import router as learning_progress_router
from modules.background_jobs.router import router as background_jobs_router
from modules.course_recommendation.router import router as course_recommendation_router
from modules.project.router import router as project_router
from modules.roadmap_learning_assessment.router import router as roadmap_learning_assessment_router
from modules.assessment_attempt.router import router as assessment_attempt_router
from modules.prompt_sharing.router import router as prompt_sharing_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await langgraph_pool.open()

    # create checkpoint tables once (optional but recommended)
    saver = AsyncPostgresSaver(typed_langgraph_pool)
    await saver.setup()

    try:
        yield
    finally:
        # shutdown
        await langgraph_pool.close()
        await engine.dispose()


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

setup_logging()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(
    CSRFMiddleware,
    exempt_paths={"/api/v1/auth/login-request", "/api/v1/auth/verify-login"},
)


# app.add_middleware(
#     RequestLoggingMiddleware
# )


app.add_exception_handler(AppException, app_exception_handler)

api_v1 = APIRouter(prefix="/api/v1")


api_v1.include_router(project_router)
api_v1.include_router(auth_router)
api_v1.include_router(organization_router)
api_v1.include_router(roadmap_router)
api_v1.include_router(roadmap_snippet_router)
api_v1.include_router(roadmap_access_router)
api_v1.include_router(roadmap_content_router)
api_v1.include_router(learning_progress_router)
api_v1.include_router(team_router)
api_v1.include_router(user_router)
api_v1.include_router(audio_transcription_router)
api_v1.include_router(ai_content_generation_router)
api_v1.include_router(artifact_router)
api_v1.include_router(assessment_router)
api_v1.include_router(opensource_content_sources_router)
api_v1.include_router(thread_router)
api_v1.include_router(background_jobs_router)
api_v1.include_router(course_recommendation_router)
api_v1.include_router(roadmap_learning_assessment_router)
api_v1.include_router(assessment_attempt_router)
api_v1.include_router(prompt_sharing_router)


app.include_router(api_v1)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

