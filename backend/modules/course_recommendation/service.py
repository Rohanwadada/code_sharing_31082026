import logging

import uuid_utils as uuid
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from core.exception import BadRequestException, ForbiddenException
from modules.background_jobs.schema import JobType
from modules.background_jobs.service import (
    BackgroundJobService,
    get_background_job_service,
)
from modules.course_recommendation.model import EYCourses
from modules.course_recommendation.schema import (
    CourseRecommendation,
    CourseRecommendationJobStatus,
)
from modules.course_recommendation.utils import chroma_client, parse_chapters_from_dsl
from modules.roadmap.exceptions import RoadmapNotFound
from modules.roadmap.model import Roadmap
from shared.db.dependencies import get_db

logger = logging.getLogger(__name__)


class CourseRecommendationService:
    def __init__(
        self, db: AsyncSession, background_job_service: BackgroundJobService
    ) -> None:
        self.db = db
        self.background_job_service = background_job_service

    async def recommend_courses(self, user_id: str, data: CourseRecommendation):
        try:
            organization_id = data.organization_id
            team_id = data.team_id
            roadmap_id = data.roadmap_id
            is_retry = data.retry

            roadmap = await self.db.scalar(
                select(Roadmap)
                .where(
                    Roadmap.roadmap_id == roadmap_id,
                    Roadmap.organization_id == organization_id,
                    Roadmap.team_id == team_id,
                )
                .with_for_update()
            )

            if not roadmap:
                raise RoadmapNotFound("Roadmap not found!!")
            if roadmap.user_id != user_id:
                raise ForbiddenException("Access Denied!!")

            roadmap_metadata = (
                dict(roadmap.roadmap_metadata) if roadmap.roadmap_metadata else {}
            )
            course_recommendation = roadmap_metadata.get("course_recommendation")
            if course_recommendation:
                # if recommendation exists and mode is not retry
                if not is_retry:
                    raise ForbiddenException("Access Denied!! duplicate error")

                current_job_id = course_recommendation["job_id"]
                job_status = await self.background_job_service.get_job_status(
                    organization_id=organization_id,
                    team_id=team_id,
                    job_id=current_job_id,
                )
                # if current job is running
                if job_status in ["pending", "processing"]:
                    raise ForbiddenException("Access Denied!! one job already running")
                if is_retry and job_status == "complete":
                    raise ForbiddenException("Access Denied!! job already completed")

            else:
                # if called retry first hand
                if is_retry:
                    raise ForbiddenException(
                        "Retry not allowed before first recommendation. recommendation in first hand"
                    )

            roadmap_dsl = roadmap_metadata["roadmap_dsl"]["current"]["dsl"]

            # Load Chroma collection
            collection = chroma_client.get_collection(
                "ey_coursera_courses_recommendation"
            )
            if not collection:
                raise ForbiddenException("Collection not found")

            job = await self.background_job_service.create_new_job(
                organization_id=organization_id,
                team_id=team_id,
                job_type=JobType.EXTERNAL_COURSE_RECOMMENDATION,
                job_data={},
                metadata={"roadmap_id": roadmap_id},
            )

            if not job:
                raise BadRequestException(
                    "Something went wrong. Please try again later"
                )
            job_id = job.job_id
            logger.info(f"[JOB ID]: {job_id}")

            celery_task_id = str(uuid.uuid7())
            task_data = {
                "organization_id": organization_id,
                "team_id": team_id,
                "job_id": job_id,
                "roadmap_id": roadmap_id,
                "user_id": user_id,
            }

            from modules.course_recommendation.tasks import course_recommendation_task

            task_signature = course_recommendation_task.s(**task_data).set(
                task_id=celery_task_id
            )

            course_recommendation_details = {
                "mode": "ai",
                "job_id": job_id,
                "celery_task_id": celery_task_id,
            }
            # It call from retry endpoint
            if is_retry and course_recommendation:
                past_jobs = roadmap_metadata["course_recommendation"].get(
                    "past_jobs", []
                )
                logger.info(past_jobs)
                past_jobs.append(
                    {
                        "mode": roadmap_metadata["course_recommendation"]["mode"],
                        "job_id": roadmap_metadata["course_recommendation"]["job_id"],
                        "celery_task_id": roadmap_metadata["course_recommendation"][
                            "celery_task_id"
                        ],
                    }
                )
                course_recommendation_details["past_jobs"] = past_jobs
                course_recommendation_details["retry_count"] = (
                    roadmap_metadata["course_recommendation"].get("retry_count", 0) + 1
                )
            roadmap_metadata["course_recommendation"] = course_recommendation_details
            roadmap.roadmap_metadata = roadmap_metadata
            flag_modified(roadmap, "roadmap_metadata")
            await self.db.commit()
            task_signature.apply_async()

            return {"job_id": job_id}

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error in recommendation pipeline: {str(e)}")
            raise

    async def get_course_recommendation_job_status(
        self, user_id: str, data: CourseRecommendationJobStatus
    ):
        try:
            organization_id = data.organization_id
            team_id = data.team_id
            roadmap_id = data.roadmap_id
            job_id = data.job_id

            job = await self.background_job_service.get_job_deatils(
                job_id=job_id, organization_id=organization_id, team_id=team_id
            )

            roadmap = await self.db.scalar(
                select(Roadmap).where(Roadmap.roadmap_id == roadmap_id)
            )
            if not roadmap:
                raise BadRequestException("Roadmap not found!!")

            job_data = job.job_data
            overall_status = job.status
            response = {"overall_status": overall_status}
            if overall_status == "complete":
                course_recommendation_data = job_data["course_recommendation_data"]
                course_data = []
                for course in course_recommendation_data["courses"]:
                    course_id = course["id"]

                    course_from_db = await self.db.scalar(
                        select(EYCourses).where(EYCourses.course_id == course_id)
                    )

                    if not course_from_db:
                        continue
                    course_data.append(
                        {
                            "course_name": course_from_db.course_name,
                            "course_url": course_from_db.course_url,
                            "course_description": course_from_db.course_description,
                            "course_metadata": course_from_db.course_metadata,
                            "coverage_percentage": course["coverage_percentage"],
                            "actual_chapters_covered": course[
                                "actual_chapters_covered"
                            ],
                            "effective_chapters_covered": course[
                                "effective_chapters_covered"
                            ],
                            "actual_contribution_count": course[
                                "actual_contribution_count"
                            ],
                            "effective_contribution_count": course[
                                "effective_contribution_count"
                            ],
                            "actual_chapters_contributed": course[
                                "actual_chapters_contributed"
                            ],
                        }
                    )
                response["recommended_courses"] = course_data
                response["total_covered"] = course_recommendation_data["total_covered"]
                response["total_chapters"] = course_recommendation_data[
                    "total_chapters"
                ]
                response["roadmap_chapters"] = parse_chapters_from_dsl(
                    roadmap.roadmap_metadata["roadmap_dsl"]["current"]["dsl"]
                )
                response["coverage_percentage_overall"] = course_recommendation_data[
                    "coverage_percentage_overall"
                ]

            return response
        except Exception as e:
            logger.error(f"Error occurred while fetching status: {str(e)}")
            raise


async def get_course_recommendation_service(
    db: AsyncSession = Depends(get_db),
    background_job_service: BackgroundJobService = Depends(get_background_job_service),
):
    return CourseRecommendationService(
        db=db, background_job_service=background_job_service
    )
