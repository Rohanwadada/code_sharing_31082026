from fastapi import APIRouter, Depends

from core.security.dependencies import get_current_user
from modules.course_recommendation.schema import (
    CourseRecommendation,
    CourseRecommendationJobStatus,
)
from modules.course_recommendation.service import (
    CourseRecommendationService,
    get_course_recommendation_service,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="", tags=["course recommendation"])


@router.post("/recommend-course")
async def recommend_courses_route(
    data: CourseRecommendation,
    user: UserDetails = Depends(get_current_user),
    course_recommendation_service: CourseRecommendationService = Depends(
        get_course_recommendation_service
    ),
):
    response = await course_recommendation_service.recommend_courses(
        user_id=user.user_id, data=data
    )
    return response


@router.post("/course-recommendation-status")
async def get_course_recommendation_job_status_route(
    data: CourseRecommendationJobStatus,
    user: UserDetails = Depends(get_current_user),
    course_recommendation_service: CourseRecommendationService = Depends(
        get_course_recommendation_service
    ),
):
    response = await course_recommendation_service.get_course_recommendation_job_status(
        user_id=user.user_id, data=data
    )
    return response
