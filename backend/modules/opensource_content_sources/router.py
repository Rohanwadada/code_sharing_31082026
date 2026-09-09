from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.opensource_content_sources.schema import ContentSource
from modules.opensource_content_sources.service import (
    OpensourceContentSourcesService,
    get_opensource_content_sources_service,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="/ocs", tags=["opensource content sources"])


@router.post("/add", status_code=201)
async def add_content_sources_route(
    data: list[ContentSource],
    user: UserDetails = Depends(get_current_user),
    opensource_content_sources_service: OpensourceContentSourcesService = Depends(
        get_opensource_content_sources_service
    ),
):

    response = await opensource_content_sources_service.add_content_sources(
        user_id=user.user_id, content_source_data=data
    )

    return response
