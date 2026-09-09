import logging

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from core.database import AsyncSessionLocal
from core.exception import BadRequestException
from modules.background_jobs.model import BackgroundJob
from modules.background_jobs.schema import JobUpdate
from modules.background_jobs.service import BackgroundJobService
from modules.course_recommendation.utils import (
    calculate_course_coverage,
    chroma_client,
    embed_text,
    get_course_coverage,
    parse_chapters_from_dsl,
    reranker,
)
from modules.roadmap.model import Roadmap
from shared.celery import celery_app, _worker_loop

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def course_recommendation_task(
    self,
    job_id: str,
    organization_id: str,
    team_id: str | None,
    roadmap_id: str,
    user_id: str,
):
    return _worker_loop.run_until_complete(
        _course_recommendation_task_impl(
            self, job_id, organization_id, team_id, roadmap_id, user_id
        )
    )


async def _course_recommendation_task_impl(
    self,
    job_id: str,
    organization_id: str,
    team_id: str | None,
    roadmap_id: str,
    user_id: str,
):
    async with AsyncSessionLocal() as db:
        background_job_service = BackgroundJobService(db)

        try:
            # update job status
            await background_job_service.update_job(
                organization_id=organization_id,
                team_id=team_id,
                job_id=job_id,
                data=JobUpdate(status="processing"),
            )

            # Recommendation process begins
            # Load roadmap
            roadmap = await db.scalar(
                select(Roadmap).where(Roadmap.roadmap_id == roadmap_id)
            )
            if not roadmap:
                raise BadRequestException("Roadmap not found")

            roadmap_dsl = roadmap.roadmap_metadata["roadmap_dsl"]["current"]["dsl"]

            query_embedding = embed_text(roadmap_dsl, task_type="query")

            # Load Chroma collection
            collection = chroma_client.get_collection(
                "ey_coursera_courses_recommendation"
            )
            if not collection:
                raise BadRequestException("Collection not found")

            # ANN RETRIEVAL ON SUPER CHUNKS ONLY
            ann_results = collection.query(
                query_embeddings=query_embedding,
                n_results=25,
                where={"type": "super"},  # filter only fast chunks
            )

            if not ann_results["documents"] or not ann_results["documents"][0]:
                return {"recommendations": []}, 200

            documents = ann_results["documents"][0]
            metadatas = ann_results["metadatas"][0]
            ids = ann_results["ids"][0]
            distances = ann_results["distances"][0]
            # logger.info(f'[DOCUMENTS]-1: {super_documents}')

            # CROSS-ENCODER RERANKING ON SUPER CHUNKS
            pairs = [[roadmap_dsl, doc] for doc in documents]
            ce_scores = reranker.predict(pairs)

            reranked = sorted(
                zip(ce_scores, distances, documents, metadatas, ids),
                key=lambda x: x[0],
                reverse=True,
            )

            # SCORE + COVERAGE + FILTERING
            MIN_SCORE_THRESHOLD = -4.0
            TARGET_COVERAGE = 0.90  # 90%
            BATCH_SIZE = 5

            # Filter out low-score courses first
            candidate_courses = [
                {
                    "score": float(score),
                    "distance": float(distance),
                    "doc": doc,
                    "meta": meta,
                    "id": cid,
                }
                for score, distance, doc, meta, cid in reranked
                # if score >= MIN_SCORE_THRESHOLD
            ][:15]

            final_courses = []  # selected courses
            overall_covered_chapters = set()
            roadmap_chapters = parse_chapters_from_dsl(roadmap_dsl)
            total_chapters = len(roadmap_chapters)
            all_coverage_results = []
            batch_token_usage_data = []

            for i in range(0, len(candidate_courses), BATCH_SIZE):
                batch = candidate_courses[i : i + BATCH_SIZE]

                # Prepare batch for LLM
                batch_courses = [
                    {"id": c["meta"]["course_id"], "content": c["doc"]} for c in batch
                ]

                # Call LLM for this batch
                batch_coverage_result, _, batch_usage_metadata = get_course_coverage(
                    {
                        "roadmap_name": roadmap.title,
                        "courses": batch_courses,
                        "roadmap_dsl": roadmap_dsl,
                    }
                )
                # store the token usage of the batch
                batch_token_usage_data.append(
                    {
                        "batch_id": i // BATCH_SIZE,
                        "usage_metadata": batch_usage_metadata,
                    }
                )

                if not batch_coverage_result:
                    logger.warning("[ERROR]: Batch coverage result came None. Exiting")
                    break

                all_coverage_results.extend(batch_coverage_result["results"])

                # Merge batch coverage with previous selections
                for course_cov in batch_coverage_result["results"]:
                    new_chapters = (
                        set(course_cov["chapters_covered"]) - overall_covered_chapters
                    )
                    if new_chapters:
                        overall_covered_chapters.update(new_chapters)

                # Recalculate overall coverage percentage
                overall_coverage_pct = (
                    len(overall_covered_chapters) / total_chapters * 100
                )
                logger.info(
                    f"[BATCH COVERAGE] After batch {i // BATCH_SIZE + 1}, coverage = {overall_coverage_pct:.2f}%"
                )

                if overall_coverage_pct >= TARGET_COVERAGE * 100:
                    logger.info("[STOP] Target coverage reached.")
                    break

            # Final stats for all selected courses
            if not all_coverage_results:
                return {
                    "recommendations": final_courses,
                    "coverage_stats": {},
                    "coverage_result": {},
                    "roadmap_chapters": roadmap_chapters,
                }, 200

            merged_coverage_result = {"results": all_coverage_results}

            coverage_stats = calculate_course_coverage(
                coverage_result=merged_coverage_result, total_chapters=total_chapters
            )

            recommended_courses = coverage_stats["courses"]
            # logger.info(f"[RECOMMENDED COURSES]: {recommended_courses}")

            for course in recommended_courses:
                course_id = course["course_id"]
                course_details = next(
                    (
                        item
                        for item in candidate_courses
                        if item["meta"]["course_id"] == course_id
                    ),
                    None,
                )
                course_details["doc"] = course_details["doc"][0:600]
                course_details["effective_chapters_covered"] = [
                    roadmap_chapters[index]
                    for index in course["effective_chapters_contributed"]
                ]
                course_details["actual_chapters_covered"] = [
                    roadmap_chapters[index]
                    for index in course["actual_chapters_contributed"]
                ]
                course.update(course_details)
            coverage_stats["courses"] = sorted(
                coverage_stats["courses"],
                key=lambda x: x["coverage_percentage"],
                reverse=True,
            )

            # Recommendation process begins

            # save the result to db
            job_data = {}
            job_data["course_recommendation_data"] = coverage_stats
            job_data["llm_usage_metadata"] = batch_token_usage_data

            await background_job_service.update_job(
                organization_id=organization_id,
                team_id=team_id,
                job_id=job_id,
                data=JobUpdate(status="complete", job_data=job_data),
            )

            return {
                "job_id": job_id,
                "user_id": user_id,
                "roadmap_id": roadmap_id,
                "type": "course_recommend",
            }

        except Exception as e:
            logger.error(f"Error in recommendation pipeline: {str(e)}")
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

                # db update
                job.job_data = job_data
                job.status = "failed"

                flag_modified(job, "job_data")

                await db.commit()
            raise self.retry(exc=e, countdown=0, max_retries=0)
