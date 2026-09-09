import logging
import re

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from fastapi import BackgroundTasks

from core.database import AsyncSessionLocal
from modules.ai_content_generation.schema import GenerateNodeContent
from modules.ai_content_generation.service import ContentGenerationService
from modules.background_jobs.model import BackgroundJob
from modules.background_jobs.service import BackgroundJobService
from modules.opensource_content_sources.service import OpensourceContentSourcesService
from modules.roadmap_content.service import RoadmapContentService
from modules.roadmap_learning_assessment.schema import GenerateAssessmentForAssessmentNode
from modules.roadmap_learning_assessment.service import generate_final_assessment_for_roadmap, generate_learning_assessment_for_module
from shared.celery import celery_app, _worker_loop
from shared.email.provider import SMTPEmailProvider
from shared.email.service import BackgroundEmailService

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def generate_content_task(
    self,
    job_id: str,
    organization_id: str,
    team_id: str | None,
    structured_list: list,
    roadmap_name: str,
    roadmap_id: str,
    roadmap_content: dict,
    generation_prompt: str,
    time_commitment: str,
    user_id: str,
    final_assessment_node: dict | None
):
    return _worker_loop.run_until_complete(
        _generate_content_task_impl(
            self,
            job_id,
            organization_id,
            team_id,
            structured_list,
            roadmap_name,
            roadmap_id,
            roadmap_content,
            generation_prompt,
            time_commitment,
            user_id,
            final_assessment_node
        )
    )


async def _generate_content_task_impl(
    self,
    job_id: str,
    organization_id: str,
    team_id: str | None,
    structured_list: list,
    roadmap_name: str,
    roadmap_id: str,
    roadmap_content: dict,
    generation_prompt: str,
    time_commitment: str,
    user_id: str,
    final_assessment_node: dict | None
):
    async with AsyncSessionLocal() as db:
        roadmap_content_service=RoadmapContentService(
            db=db,
            email_service=BackgroundEmailService(
                provider=SMTPEmailProvider(), background_tasks=BackgroundTasks()
            ),
        )
        
        content_generation_service = ContentGenerationService(
            db=db,
            opensource_content_sources_service=OpensourceContentSourcesService(db),
            background_job_service=BackgroundJobService(db),
            roadmap_content_service=roadmap_content_service
        )
        try:
            await content_generation_service.update_overall_job_status(
                job_id=job_id,
                organization_id=organization_id,
                team_id=team_id,
                roadmap_id=roadmap_id,
                status="processing",
            )
            for entry in structured_list:
                node = entry["node"]
                topic_node = entry["topic_node"]
                assessment_node = entry["assignment_node"]

                if node["type"] == "subtopicGroup":
                    # Add parent and children in job_data
                    await content_generation_service.add_parent_job(
                        job_id,
                        organization_id,
                        team_id,
                        roadmap_id,
                        node["id"],
                        entry["child"],
                    )
                    await content_generation_service.update_parent_status(
                        job_id,
                        organization_id,
                        team_id,
                        roadmap_id,
                        node["id"],
                        "processing",
                    )

                    for child_node in entry["child"]:
                        # Mark child as processing
                        await content_generation_service.update_child_status(
                            job_id,
                            organization_id,
                            team_id,
                            roadmap_id,
                            node["id"],
                            child_node["id"],
                            "processing",
                        )

                        generation_data, final_status = {}, "pending"
                        if child_node["id"] in roadmap_content and (
                            len(roadmap_content[child_node["id"]]["links"]) != 0
                            or roadmap_content[child_node["id"]]["description"].strip()
                            != ""
                            or roadmap_content[child_node["id"]]["title"].strip() != ""
                        ):
                            child_node_content = roadmap_content[child_node["id"]]
                            generation_data = {
                                "content_present": True,
                                "content_generation_type": "manual",
                            }
                            if (
                                "generation_type" in child_node_content
                                and child_node_content["generation_type"] == "ai"
                            ):
                                generation_data["sites"] = [
                                    {"url": r["url"], "title": r["title"]}
                                    for r in roadmap_content[child_node["id"]]["links"]
                                ]
                                generation_data["content_generation_type"] = "ai"
                            final_status = "complete"
                            logger.info("Content Present for the node")
                        else:
                            # module_name = re.sub(r"^\d+\.\s*", "", node["data"]["label"])
                            node_title = child_node["data"]["label"]

                            data = GenerateNodeContent(
                                organization_id=organization_id,
                                team_id=team_id,
                                roadmap=roadmap_name,
                                node_title=node_title,
                                topic_name=topic_node['data']['label'],
                                module_name=node["data"]["label"],
                                r_id=roadmap_id,
                                m_id=node["id"],
                                n_id=child_node["id"],
                                prompt=generation_prompt,
                                time_commitment=time_commitment,
                            )

                            try:
                                response = await content_generation_service.generate_node_content(
                                    user_id=user_id, data=data
                                )
                                generation_data = {
                                    "sites": [
                                        {"url": r["url"], "title": r["title"]}  # type: ignore
                                        for r in response["content"]["links"]  # type: ignore
                                    ],
                                    "usage_metadata": response["usage_metadata"],  # type: ignore
                                }
                                final_status = "complete"
                            except Exception as gen_error:
                                logger.error(
                                    f"Error generating content for node {child_node['id']}: {gen_error}"
                                )
                                final_status = "failed"
                                generation_data = {"error": str(gen_error)}
                                await content_generation_service.update_child_status(
                                    job_id,
                                    organization_id,
                                    team_id,
                                    roadmap_id,
                                    node["id"],
                                    child_node["id"],
                                    final_status,
                                    generation_data,
                                )
                                raise

                        # Update child to complete or failed
                        await content_generation_service.update_child_status(
                            job_id,
                            organization_id,
                            team_id,
                            roadmap_id,
                            node["id"],
                            child_node["id"],
                            final_status,
                            generation_data,
                        )

                if assessment_node:
                    logger.info(f"Generation assessment for module: {assessment_node}")
                    assessment_generation_response = await generate_learning_assessment_for_module(data=GenerateAssessmentForAssessmentNode(organization_id=organization_id, team_id=team_id, roadmap_id=roadmap_id, module_id=node['id'], node_id=assessment_node['id']), user_id=user_id, db=db, roadmap_content_service=roadmap_content_service)

            if final_assessment_node:
                final_assessment_generation_response = await generate_final_assessment_for_roadmap(data=GenerateAssessmentForAssessmentNode(organization_id=organization_id, team_id=team_id, roadmap_id=roadmap_id, module_id="", node_id=final_assessment_node['id']), user_id=user_id, db=db, roadmap_content_service=roadmap_content_service)
                
            # Update overall status
            await content_generation_service.update_overall_job_status(
                job_id=job_id,
                organization_id=organization_id,
                team_id=team_id,
                roadmap_id=roadmap_id,
                status="complete",
            )
            return {
                "job_id": job_id,
                "user_id": user_id,
                "roadmap_id": roadmap_id,
                "type": "content_gen",
            }

        except Exception as e:
            logger.error(f"Error occurred while generating roadmap content: {str(e)}")
            await db.rollback()
            job = await db.scalar(
                select(BackgroundJob).where(
                    BackgroundJob.job_id == job_id,
                    BackgroundJob.organization_id == organization_id,
                    BackgroundJob.team_id == team_id,
                )
            )
            if job:
                job_data = job.job_data
                job_data["reason"] = str(e)

                job.job_data = job_data
                job.status = "failed"

                flag_modified(job, "job_data")

                await db.commit()
            raise self.retry(exc=e, countdown=0, max_retries=0)
