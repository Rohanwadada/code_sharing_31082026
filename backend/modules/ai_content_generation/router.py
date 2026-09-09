from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.ai_content_generation.schema import (
    GenerateContentJobStatus,
    GenerateNodeContent,
    GenerateNodeContentBatch,
)
from modules.ai_content_generation.service import (
    ContentGenerationService,
    get_content_generation_service,
)
from modules.user.model import UserDetails


router = APIRouter(prefix="/ai", tags=["ai content gen"])


@router.post("/generate-content")
async def generate_node_content(
    data: GenerateNodeContent,
    user: UserDetails = Depends(get_current_user),
    content_generation_service: ContentGenerationService = Depends(
        get_content_generation_service
    ),
):
    response = await content_generation_service.generate_node_content(
        user_id=user.user_id, data=data
    )
    return response


@router.post("/generate")
async def generate_node_content_batch(
    data: GenerateNodeContentBatch,
    user: UserDetails = Depends(get_current_user),
    content_generation_service: ContentGenerationService = Depends(
        get_content_generation_service
    ),
):
    response = await content_generation_service.generate_roadmap_content_batch(
        user_id=user.user_id, data=data
    )
    return response


@router.post("/content/status")
async def roadmap_content_generation_status(
    data: GenerateContentJobStatus,
    user: UserDetails = Depends(get_current_user),
    content_generation_service: ContentGenerationService = Depends(
        get_content_generation_service
    ),
):
    response = await content_generation_service.get_content_generation_job_status(
        data=data
    )
    return response
