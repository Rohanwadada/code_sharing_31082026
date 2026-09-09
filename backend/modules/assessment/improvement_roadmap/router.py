from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.assessment.improvement_roadmap.schema import (
    GenerateImprovementRoadmap,
)
from modules.assessment.improvement_roadmap.service import (
    ImprovementRoadmapGenerationService,
    get_improvent_roadmap_generation_service,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="/imr")


@router.post("/generate-roadmap")
async def generate_roadmap_from_assesment_route(
    data: GenerateImprovementRoadmap,
    user: UserDetails = Depends(get_current_user),
    improvement_roadmap_generation_service: ImprovementRoadmapGenerationService = Depends(
        get_improvent_roadmap_generation_service
    ),
):
    response = (
        await improvement_roadmap_generation_service.generate_roadmap_from_assessment(
            user=user, payload=data
        )
    )
    return response


@router.get("/get-improvement-roadmap/{assessment_id}")
async def get_improvement_roadmaps_route(
    assessment_id: str,
    user: UserDetails = Depends(get_current_user),
    improvement_roadmap_generation_service: ImprovementRoadmapGenerationService = Depends(
        get_improvent_roadmap_generation_service
    ),
):
    response = await improvement_roadmap_generation_service.get_improvement_roadmaps(
        user_id=user.user_id, assessment_id=assessment_id
    )
    return response
