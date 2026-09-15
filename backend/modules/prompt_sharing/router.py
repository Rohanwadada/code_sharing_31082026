import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status

from modules.prompt_sharing.schema import (
    GenerateRoadmapPromptRequest,
    GenerateRoadmapPromptResponse,
)
from modules.prompt_sharing.service import (
    PromptSharingService,
    get_prompt_sharing_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompt-sharing", tags=["prompt-sharing"])


@router.post(
    "/generate-roadmap-prompt",
    response_model=GenerateRoadmapPromptResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_roadmap_prompt_endpoint(
    payload: Optional[str] = Form(None),
    who_is_this_for: Optional[str] = Form("Organization"),
    what_to_create: Optional[str] = Form("roadmap"),
    role_description_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    service: PromptSharingService = Depends(get_prompt_sharing_service),
):
    """
    Generate a roadmap prompt from Job Description text, form parameters, or uploaded PDF file.
    Accepts multipart/form-data or JSON payload string.
    """
    try:
        req_who = who_is_this_for
        req_what = what_to_create
        req_text = role_description_text

        if payload:
            try:
                data_dict = json.loads(payload)
                req_who = data_dict.get("who_is_this_for", req_who)
                req_what = data_dict.get("what_to_create", req_what)
                req_text = data_dict.get("role_description_text", req_text)
            except Exception as e:
                logger.warning(f"Could not parse payload string as JSON: {e}")

        file_bytes = None
        if file:
            file_bytes = await file.read()

        res = await service.generate_roadmap_prompt(
            who_is_this_for=req_who or "Organization",
            what_to_create=req_what or "roadmap",
            role_description_text=req_text,
            file_bytes=file_bytes,
        )
        return res
    except Exception as e:
        logger.error(f"Failed to generate roadmap prompt: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating prompt: {str(e)}",
        )
