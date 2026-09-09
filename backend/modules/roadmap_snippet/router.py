from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.roadmap_snippet.schema import (
    AddComponentToBag,
    BaseRequest,
    RemoveComponentFromBag,
    SnippetAddToRoadmap,
    SnippetSearch,
)
from modules.roadmap_snippet.service import (
    RoadmapSnippetService,
    get_roadmap_snippet_service,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="/roadmap-blocks", tags=["roadmap blocks"])


@router.post("/search")
async def find_roadmap_snippets(
    data: SnippetSearch,
    user: UserDetails = Depends(get_current_user),
    roadmap_snippet_service: RoadmapSnippetService = Depends(
        get_roadmap_snippet_service
    ),
):
    response = await roadmap_snippet_service.find_roadmap_snippets(
        query=data.query,
        organization_id=data.organization_id,
        team_id=data.team_id,
        roadmap_id=data.roadmap_id,
    )

    return response


@router.post("/add-snippet/{roadmap_id}")
async def add_snippet_to_roadmap(
    roadmap_id: str,
    data: SnippetAddToRoadmap,
    user: UserDetails = Depends(get_current_user),
    roadmap_snippet_service: RoadmapSnippetService = Depends(
        get_roadmap_snippet_service
    ),
):
    response = await roadmap_snippet_service.add_snippet_to_roadmap(
        user_id=user.user_id, roadmap_id=roadmap_id, data=data
    )

    return response


@router.post("/add-component")
async def add_snippet_to_bag_route(
    data: AddComponentToBag,
    user: UserDetails = Depends(get_current_user),
    roadmap_snippet_service: RoadmapSnippetService = Depends(
        get_roadmap_snippet_service
    ),
):
    response = await roadmap_snippet_service.add_component_to_bag(
        user_id=user.user_id,
        organization_id=data.organization_id,
        component=data.component,
    )
    return response


@router.post("/get-components")
async def get_user_all_component_route(
    data: BaseRequest,
    user: UserDetails = Depends(get_current_user),
    roadmap_snippet_service: RoadmapSnippetService = Depends(
        get_roadmap_snippet_service
    ),
):
    response = await roadmap_snippet_service.get_user_all_components(
        user_id=user.user_id,
        organization_id=data.organization_id,
    )
    return response


@router.post("/remove-component")
async def remove_component_from_bag_route(
    data: RemoveComponentFromBag,
    user: UserDetails = Depends(get_current_user),
    roadmap_snippet_service: RoadmapSnippetService = Depends(
        get_roadmap_snippet_service
    ),
):
    response, status_code = await roadmap_snippet_service.remove_component_from_bag(
        user_id=user.user_id,
        organization_id=data.organization_id,
        component=data.component,
    )
    return response
