import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status

from modules.prompt_sharing.schema import GenerateRoadmapPromptResponse
from modules.prompt_sharing.service import PromptSharingService, get_prompt_sharing_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompt-sharing", tags=["prompt-sharing"])


@router.post(
    "/generate-roadmap-prompt",
    response_model=GenerateRoadmapPromptResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_roadmap_prompt(
    who_is_this_for: Optional[str] = Form("Organization"),
    what_to_create: Optional[str] = Form("roadmap"),
    role_description_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    service: PromptSharingService = Depends(get_prompt_sharing_service),
):
    try:
        file_bytes = await file.read() if file else None
        return await service.generate_roadmap_prompt(
            who_is_this_for=who_is_this_for or "Organization",
            what_to_create=what_to_create or "roadmap",
            role_description_text=role_description_text,
            file_bytes=file_bytes,
        )
    except Exception as e:
        logger.error("generate_roadmap_prompt failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
