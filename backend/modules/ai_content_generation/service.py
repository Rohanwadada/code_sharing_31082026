import json
import logging
import re

import requests
import uuid_utils as uuid
from fastapi import Depends
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from core.config import settings
from core.exception import BadRequestException, ForbiddenException
from core.time import get_current_timestamp
from modules.ai_content_generation.prompt import (
    CONTENT_SOURCES_RECOMMENDATION_SYSTEM_PROMPT,
    NODE_CONTENT_GENERATION_SYSTEM_PROMPT_PERSONALIZED,
)
from modules.ai_content_generation.schema import (
    GenerateContentJobStatus,
    GenerateNodeContent,
    GenerateNodeContentBatch,
)
from modules.ai_content_generation.utils import filter_content_by_hostname
from modules.background_jobs.schema import JobType
from modules.background_jobs.service import (
    BackgroundJobService,
    get_background_job_service,
)
from modules.opensource_content_sources.service import (
    OpensourceContentSourcesService,
    get_opensource_content_sources_service,
)
from modules.roadmap.exceptions import RoadmapNotFound
from modules.roadmap.model import Roadmap
from modules.roadmap_content.service import (
    RoadmapContentService,
    get_roadmap_content_service,
)
from modules.roadmap_learning_assessment.schema import QuizAutoGenerateRequest
from modules.roadmap_learning_assessment.service import find_connected_node, generate_and_save_quiz, get_destructured_module_name
from shared.db.dependencies import get_db
from shared.llm.gemini import get_gemini_instance, log_token_usage

logger = logging.getLogger(__name__)


class ContentGenerationService:
    def __init__(
        self,
        db: AsyncSession,
        roadmap_content_service: RoadmapContentService,
        opensource_content_sources_service: OpensourceContentSourcesService,
        background_job_service: BackgroundJobService,
    ) -> None:
        self.db = db
        self.roadmap_content_service = roadmap_content_service
        self.opensource_content_sources_service = opensource_content_sources_service
        self.background_job_service = background_job_service

    async def generate_node_content(self, user_id: str, data: GenerateNodeContent):
        roadmap_name = data.roadmap
        serial_number, module_name = get_destructured_module_name(data.module_name)
        topic_name = data.topic_name
        node_title = data.node_title
        roadmap_id = data.r_id
        module_id = data.m_id
        node_id = data.n_id

        roadmap = await self.db.scalar(
            select(Roadmap).where(
                Roadmap.roadmap_id == roadmap_id,
                Roadmap.organization_id == data.organization_id,
            )
        )
        if not roadmap:
            raise RoadmapNotFound("Roadmap not found")

        roadmap_content = roadmap.roadmap_content

        #  check for already present content
        content = roadmap_content.get(node_id)
        
        if content:
            if content.get("deleted", False):
                raise BadRequestException("node is deleted")
        
            if (
                content.get("links")
                or content.get("description", "").strip()
                or content.get("title", "").strip()
            ):
                raise BadRequestException("content already generated")

        # Get the roadmap generation prompt
        roadmap_generation_prompt = ""
        roadmap_generation_time_commitment = None
        if data.prompt is None:

            generation_mode = roadmap.roadmap_metadata.get("mode", "manual")
            if generation_mode == "ai-generated":
                roadmap_generation_prompt = roadmap.roadmap_metadata.get("prompt", "")
                roadmap_generation_time_commitment = (
                    roadmap.roadmap_metadata.get("roadmap_dsl", {})
                    .get("current", {})
                    .get("selected_time_commitment", {})
                )
        else:
            roadmap_generation_prompt = data.prompt
            roadmap_generation_time_commitment = json.loads(data.time_commitment)  # type: ignore

        query = f"User Prompt: {roadmap_generation_prompt} \nRoadmap: {roadmap_name}\nModule Name: {module_name}\nNode Title: {node_title}"

        if (
            roadmap_generation_time_commitment
            and roadmap_generation_time_commitment.get("duration", None)
        ):
            query += f"time_commitment: {roadmap_generation_time_commitment.get('duration', None)}"
        gemini = get_gemini_instance(temperature=0.2)
        message = [
            SystemMessage(content=NODE_CONTENT_GENERATION_SYSTEM_PROMPT_PERSONALIZED),
            HumanMessage(content=query),
        ]
        response = gemini.invoke(message)

        # Log exact token counts to terminal:
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            input_t = response.usage_metadata.get('input_tokens', 0)
            output_t = response.usage_metadata.get('output_tokens', 0)
            total_t = response.usage_metadata.get('total_tokens', 0)
            logger.info(f"[GEMINI LOG - Content Generation] Input: {input_t} tokens | Output: {output_t} tokens | Total: {total_t} tokens")
            print(f"[GEMINI LOG - Content Generation] Input: {input_t} tokens | Output: {output_t} tokens | Total: {total_t} tokens")

        result = response.content.strip("`").lstrip("json").strip()  # type: ignore

        # get recommended external content links and change the number based on the time commitment
        content_link_limit = (
            3
            if roadmap_generation_time_commitment
            and roadmap_generation_time_commitment.get("id", 999) >= 3
            else 2
        )
        recommended_external_content_links = (
            await self.get_recommended_external_content_links(
                roadmap_name=roadmap_name,
                module_name=module_name,
                chapter_name=node_title,
                limit=content_link_limit,
            )
        )

        node_content = {
            "title": node_title,
            "description": result,
            "links": []
            if not recommended_external_content_links
            else [
                {
                    "id": str(uuid.uuid4()),
                    "title": res["title"],
                    "url": res["link"],
                    "type": "article",
                    "accessType": "public",
                    "downloadable": False,
                    "generation_type": "ai",
                }
                for res in recommended_external_content_links  # type: ignore
            ],
            "created_at": get_current_timestamp().isoformat(),
            "generation_type": "ai",
            "usage_metadata": response.usage_metadata,
        }

        node_index_in_module = self.get_node_index(roadmap.roadmap_graph.get("nodes", []), module_id, node_id)
        assessment_generation_response = await generate_and_save_quiz(
            payload=QuizAutoGenerateRequest(
                roadmap_id=roadmap_id,
                node_id=node_id,
                roadmap_title=roadmap_name,
                roadmap_desc=roadmap_name,
                chapter_name=topic_name,
                module_name=module_name,
                topics=[node_title],
                chapter_content=[result],
                count=5,
                difficulty="moderate",
                title=f"Crack it - {serial_number}.{node_index_in_module}",
                organization_id=data.organization_id,
            ),
            user_id=user_id,
            db=self.db,
        )

        node_content = {
            **node_content,
            "assessment": {"name": assessment_generation_response["title"], "url": assessment_generation_response["assessment_url"]},
        }

        await self.roadmap_content_service.update_node_content(
            user_id=user_id,
            organization_id=data.organization_id,
            team_id=data.team_id,
            roadmap_id=roadmap_id,
            node_id=node_id,
            new_content=node_content,
        )
        # logger.info(response)
        return {"content": node_content, "usage_metadata": response.usage_metadata}

    async def generate_roadmap_content_batch(
        self,
        user_id: str,
        data: GenerateNodeContentBatch,
    ):
        organization_id = data.organization_id
        team_id = data.team_id
        roadmap_id = data.roadmap_id
        is_retry = data.retry

        # accure LOCK on row for atomic update
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
        content_gen_meta = roadmap_metadata.get("content_generation")

        # generation state defaults to `partial_generation`
        generation_state = "partial_generation"

        if content_gen_meta:
            last_job_id = content_gen_meta.get("job_id")
            if last_job_id:
                job_status = await self.background_job_service.get_job_status(
                    job_id=last_job_id, organization_id=organization_id, team_id=team_id
                )
                # if previously any job created and still not `complete` or `failed`
                if job_status in ["pending", "processing"]:
                    raise BadRequestException(
                        "A generation job is currently in progress"
                    )

            current_db_state = content_gen_meta.get("generation_state")

            if is_retry:
                # if retry called then it means previous job failed so the `generation_state` stay intact
                generation_state = current_db_state

                # if content generation successful but still retry called
                if job_status == "complete":  # type: ignore
                    raise BadRequestException("Job is already successful. Cannot retry")
            else:
                # moving forward if current state is `partial_generation` that means have to switch to `complete_generation`
                if current_db_state == "partial_generation":
                    # only move to 'complete_generation' if the `partial_generation` actually finished successfully
                    if job_status != "complete":  # type: ignore
                        raise BadRequestException(
                            "Cannot proceed to full generation. Previous step failed or incomplete"
                        )

                    generation_state = "complete_generation"

                elif current_db_state == "complete_generation":
                    raise BadRequestException(
                        "Content generation already present/failed. Please retry"
                    )
        else:
            # calling first time but as retry. block it man
            if is_retry:
                raise ForbiddenException(
                    "Retry not allowed. No previous generation found."
                )

        # structured list generation and job submission begins
        nodes = roadmap.roadmap_graph["nodes"]
        edges = roadmap.roadmap_graph["edges"]
        roadmap_content = roadmap.roadmap_content

        # group subtopics by parent module
        child_by_parent = {}
        for node in nodes:
            if (
                node["type"] == "subtopic" or node["type"] == "assignmentNode"
            ) and "parentId" in node:
                child_by_parent.setdefault(node["parentId"], []).append(node)
                

        # filter top level nodes
        top_level_nodes = [
            node
            for node in nodes
            if node["type"] == "subtopicGroup"
            or (node["type"] == "subtopic" and "parentId" not in node)
        ]
        top_level_nodes.sort(key=lambda n: n["position"]["y"])

        # structured list for content generation order
        structured_list = []
        total_content_node = 0
        for node in top_level_nodes:
            if node["type"] == "subtopicGroup":
                children = sorted(
                    child_by_parent.get(node["id"], []),
                    key=lambda n: n["position"]["y"],
                )

                # get the assignmentNode and remove it from list and send it's details separately
                assignment_node = next(
                    (child for child in reversed(children)
                     if child.get("type") == "assignmentNode"),
                    None
                )
                
                if assignment_node is not None:
                    children.remove(assignment_node)

                # get the topic node of a node  and send it to job list data
                topic_node = find_connected_node(nodes=nodes, edges=edges, node_id=node['id'], target_node_types=['topic', 'topicGroup'])
                
                structured_list.append({"node": node, "child": children, "topic_node": topic_node, "assignment_node": assignment_node})
                total_content_node += len(children)
            # elif node["type"] == "subtopic":
            #     structured_list.append({"node": node})
            #     total_content_node += 1

        final_assessment_node = next(
            (node for node in nodes if node["type"] == 'assignmentNode' and node.get('parentId', None) is None),
            None,
        )

        logger.info(f"[Generation State] : {generation_state}")
        logger.info(f"[Structured List] : {structured_list}")

        # return {"list": structured_list}, 200

        if generation_state == "partial_generation":
            # only first module for `partial_generation`
            structured_list = structured_list[:1]

            # node count recalculate for the slice
            total_content_node = 0
            for val in structured_list:
                if "child" in val:
                    total_content_node += len(val["child"])
                # elif val["node"]["type"] == "subtopic":
                #     total_content_node += 1

        # create job_id and submit celery job but do not commit because it will release lock[importat]

        job = await self.background_job_service.create_new_job(
            organization_id=organization_id,
            team_id=team_id,
            job_type=JobType.CONTENT_GENERATION_BATCH,
            job_data={"job_status": [], "total_content_node": total_content_node},
            metadata={"roadmap_id": roadmap_id},
        )
        if not job:
            raise BadRequestException("Something went wrong. Please try again later")
        job_id = job.job_id
        logger.info(f"[JOB ID]: {job_id}")

        roadmap_generation_prompt = roadmap_metadata.get("prompt", "")
        roadmap_generation_time_commitment = (
            roadmap_metadata.get("roadmap_dsl", {})
            .get("current", {})
            .get("selected_time_commitment", {})
        )

        task_data = {
            "job_id": job_id,
            "organization_id": organization_id,
            "team_id": team_id,
            "structured_list": structured_list,
            "roadmap_name": roadmap.title,
            "roadmap_id": roadmap_id,
            "roadmap_content": roadmap_content,
            "generation_prompt": roadmap_generation_prompt,
            "time_commitment": json.dumps(roadmap_generation_time_commitment),
            "user_id": user_id,
            "final_assessment_node": final_assessment_node if generation_state == 'complete_generation' else None
        }

        celery_task_id = str(uuid.uuid7())

        from modules.ai_content_generation.tasks import generate_content_task

        task_signature = generate_content_task.s(**task_data).set(
            task_id=celery_task_id
        )

        content_generation_details = {
            "mode": "ai",
            "job_id": job_id,
            "celery_task_id": celery_task_id,
            "generation_state": generation_state,
            "retry_count": 0,
        }

        if is_retry and content_gen_meta:
            past_jobs = content_gen_meta.get("past_jobs", [])
            past_jobs.append(
                {
                    "mode": content_gen_meta.get("mode"),
                    "job_id": content_gen_meta.get("job_id"),
                    "celery_task_id": content_gen_meta.get("celery_task_id"),
                    "generation_state": content_gen_meta.get(
                        "generation_state"
                    ),  #  track which state it was
                }
            )
            content_generation_details["past_jobs"] = past_jobs
            content_generation_details["retry_count"] = (
                content_gen_meta.get("retry_count", 0) + 1
            )

        # final commit and release lock
        roadmap_metadata["content_generation"] = content_generation_details

        roadmap.roadmap_metadata = roadmap_metadata
        flag_modified(roadmap, "roadmap_metadata")

        await self.db.commit()
        task_signature.apply_async()  #  calling it after db commit, this ensure no issue in db so submit to worker

        return {"list": structured_list, "job_id": job_id}

    async def get_recommended_external_content_links(
        self,
        roadmap_name: str,
        module_name: str,
        chapter_name: str,
        limit: int = 2,
    ) -> list:
        try:
            allowed_sources = await self.opensource_content_sources_service.get_opensource_content_sources()
            recommended_content_sources = self.get_recommended_content_sources(
                roadmap_name=roadmap_name,
                module_name=module_name,
                chapter_name=chapter_name,
                allowed_sources=allowed_sources,
            )

            content_source_str = " OR ".join(recommended_content_sources)

            # begin web search
            sanitized_roadmap_name = re.sub(
                r"\s*\broadmap\b\s*", " ", roadmap_name, flags=re.IGNORECASE
            ).strip()
            web_search_query = (
                f"{sanitized_roadmap_name}-{module_name}-{chapter_name} site: {content_source_str}"
                # if len(sanitized_roadmap_name) < 30
                # else f"{node_title} site:{content_source_str}"
            )

            web_search_result, status = self.get_web_search_data(query=web_search_query)

            if status != 200:
                raise Exception(str(web_search_result))

            filtered_content = filter_content_by_hostname(
                data=web_search_result["organic"],  # type: ignore
                allowed_hostnames=recommended_content_sources,
                limit=limit,
            )

            logger.info(f"Final content: {filtered_content}")

            return filtered_content
        except Exception as e:
            logger.error(
                f"Error occured in get_recommended_external_content_links : {str(e)}",
                exc_info=True,
            )
            raise e

    def get_recommended_content_sources(
        self,
        roadmap_name: str,
        module_name: str,
        chapter_name: str,
        allowed_sources: list,
    ):
        """
        1.Make the llm call with allowed domains and chapter context
        2. Return a valid list of recommended domains
        3. Post validate these domains are in the allowed domains or not
        4 Return the final recommended domains
        """
        try:
            human_message = f"""
    roadmap_name: {roadmap_name},
    module_name: {module_name},
    chapter_name: {chapter_name},
    domain_list: {allowed_sources}
            """

            llm = get_gemini_instance(temperature=0.2)
            message = [
                SystemMessage(content=CONTENT_SOURCES_RECOMMENDATION_SYSTEM_PROMPT),
                HumanMessage(content=human_message),
            ]
            response = llm.invoke(message)
            log_token_usage(response, "External Web Search Links")
            logger.info(response)
            result = json.loads(response.content.strip("`").lstrip("json").strip())  # type: ignore

            recommended_sources = [
                allowed_sources[idx]
                for idx in result.get("selected_domain_indices", [])
                if idx < len(allowed_sources)
            ]
            logger.info(
                f"LLM recommended domains for chapter : {chapter_name} is : {recommended_sources}"
            )

            return recommended_sources
        except Exception as e:
            logger.info(
                f"Exception occured in get_recommended_content_sources: {str(e)}"
            )
            raise

    def get_web_search_data(self, query: str, num_result: int = 10):
        try:
            serper_url = "https://google.serper.dev/search"
            payload = json.dumps({"q": query, "num": num_result})

            headers = {
                "X-API-KEY": settings.serper_api_key,
                "Content-Type": "application/json",
            }

            response = requests.post(serper_url, headers=headers, data=payload)

            # Handle non-200 responses
            if response.status_code != 200:
                logger.error(
                    f"Non-200 response from Serper API. "
                    f"Status: {response.status_code}, Body: {response.text}"
                )
                return {
                    "error": "Failed to fetch data from Serper API",
                    "status_code": response.status_code,
                    "response_text": response.text,
                }, response.status_code

            # Successful response
            return response.json(), 200
            # return DUMMY_SERPER_RESPONSE, 200

        except requests.exceptions.RequestException as e:
            # Handles network errors, timeouts, etc.
            logger.error(f"Request error while fetching data: {str(e)}")
            return {"error": "Network or request error occurred"}, 500

        except Exception as e:
            # Catch-all for any other exceptions
            logger.error(f"Unexpected error occurred: {str(e)}")
            return {"error": "Unexpected error occurred"}, 500

    async def add_parent_job(
        self,
        job_id: str,
        organization_id: str,
        team_id: str | None,
        roadmap_id: str,
        parent_node_id: str,
        child_nodes: list,
        node_title: str | None = None,
    ):
        """Add a parent node entry with all children pending."""
        job = await self.background_job_service.get_job_deatils(
            job_id=job_id, organization_id=organization_id, team_id=team_id
        )

        parent_entry = {
            "node_id": parent_node_id,
            "node_title": node_title,
            "status": "pending",
            "children": [
                {
                    "node_id": c["id"],
                    "node_title": c["data"]["label"],
                    "status": "pending",
                }
                for c in child_nodes
            ],
        }
        job_data = job.job_data
        job_data["job_status"].append(parent_entry)

        job.job_data = job_data

        flag_modified(job, "job_data")

        await self.db.commit()

    async def update_child_status(
        self,
        job_id: str,
        organization_id: str,
        team_id: str | None,
        roadmap_id: str,
        parent_node_id: str,
        child_node_id: str,
        new_status: str,
        generation_data: dict = {},
    ):
        """Update a child node status and recompute parent & overall job status."""
        try:
            job = await self.background_job_service.get_job_deatils(
                job_id=job_id, organization_id=organization_id, team_id=team_id
            )

            job_data = job.job_data

            parent_status = "processing"
            for parent in job_data["job_status"]:
                if parent["node_id"] == parent_node_id:
                    for child in parent["children"]:
                        if child["node_id"] == child_node_id:
                            child["status"] = new_status
                            child["generation_data"] = generation_data
                            break

                    # Update parent status based on children
                    child_statuses = [c["status"] for c in parent["children"]]
                    if all(s == "complete" for s in child_statuses):
                        parent["status"] = "complete"
                    elif any(s == "processing" for s in child_statuses):
                        parent["status"] = "processing"
                    elif any(s == "failed" for s in child_statuses):
                        parent["status"] = "failed"
                    else:
                        parent["status"] = "pending"
                    parent_status = parent["status"]
                    break

            # db update
            job.job_data = job_data

            flag_modified(job, "job_data")

            await self.db.commit()
            return parent_status

        except Exception as e:
            logger.error(f"Error occurred while child node status: {str(e)}")
            raise

    async def update_parent_status(
        self,
        job_id: str,
        organization_id: str,
        team_id: str | None,
        roadmap_id: str,
        parent_node_id: str,
        new_status: str,
        generation_data: dict | None = None,
    ):
        """Update a parent node status directly and overall job status."""
        try:
            job = await self.background_job_service.get_job_deatils(
                job_id=job_id, organization_id=organization_id, team_id=team_id
            )

            job_data = job.job_data

            for parent in job_data["job_status"]:
                if parent["node_id"] == parent_node_id:
                    parent["status"] = new_status
                    if generation_data:
                        parent["generation_data"] = generation_data
                    break

            # db update
            job.job_data = job_data

            flag_modified(job, "job_data")

            await self.db.commit()
        except Exception as e:
            logger.error(f"Error occurred while updating parent node status: {str(e)}")
            raise

    async def update_overall_job_status(
        self,
        job_id: str,
        organization_id: str,
        team_id: str | None,
        roadmap_id: str,
        status: str,
    ):
        try:
            job = await self.background_job_service.get_job_deatils(
                job_id=job_id, organization_id=organization_id, team_id=team_id
            )

            job_data = job.job_data
            job_status = (
                status
                if status
                else (
                    "failed"
                    if any(p["status"] == "failed" for p in job_data["job_status"])
                    else (
                        "processing"
                        if any(
                            p["status"] == "processing" for p in job_data["job_status"]
                        )
                        else (
                            "complete"
                            if all(
                                p["status"] == "complete"
                                for p in job_data["job_status"]
                            )
                            else "pending"
                        )
                    )
                )
            )

            # db update
            job.status = job_status

            flag_modified(job, "job_data")

            await self.db.commit()
        except Exception as e:
            logger.error(f"Error occurred while updating overall job: {str(e)}")
            await self.db.rollback()
            raise

    async def get_content_generation_job_status(self, data: GenerateContentJobStatus):
        try:
            roadmap_id = data.roadmap_id
            organization_id = data.organization_id
            team_id = data.team_id
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
            job_status = job_data["job_status"]
            total_content_node = job_data["total_content_node"]
            total_completed_nodes = 0
            for node in job_status:
                if "children" in node:
                    for child in node["children"]:
                        if child["status"] == "complete":
                            total_completed_nodes += 1
                elif node["status"] == "complete":
                    total_completed_nodes += 1
            completion_in_percentage = (
                total_completed_nodes * 100
            ) / total_content_node
            roadmap_metadata = roadmap.roadmap_metadata
            content_counts = self.get_content_counts(roadmap.roadmap_content)
            total_content_count = content_counts["public"] + content_counts["premium"]
            generation_state = roadmap_metadata["content_generation"][
                "generation_state"
            ]

            response = {
                "job_status": job_status,
                "overall_status": overall_status,
                "percentage": completion_in_percentage,
                "total_content_node": total_content_node,
                "total_completed_node": total_completed_nodes,
                "total_content_count": total_content_count,
                "generation_state": generation_state,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
            }

            return response
        except Exception as e:
            logger.error(f"Error occurred while fetching status: {str(e)}")
            raise

    def get_content_counts(self, contents: dict) -> dict:
        print(f"[CONTENT]: {contents}")
        content_counts = {"public": 0, "premium": 0}
        for node_id, content in contents.items():
            if content.get("deleted") is True:
                continue
            links = content.get("links", [])
            for link in links:
                content_counts[link["accessType"]] += 1

        return content_counts

    def get_node_index(self, nodes: list[dict], module_id: str, node_id: str):
        # Get all nodes belonging to this module
        module_nodes = [
            node for node in nodes
            if node.get("parentId") == module_id
        ]
    
        # Sort vertically by y position
        module_nodes.sort(key=lambda node: node["position"]["y"])
    
        # Find the requested node
        for index, node in enumerate(module_nodes):
            if node["id"] == node_id:
                return index + 1
    
        return None

async def get_content_generation_service(
    db: AsyncSession = Depends(get_db),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
    opensource_content_sources_service: OpensourceContentSourcesService = Depends(
        get_opensource_content_sources_service
    ),
    background_job_service: BackgroundJobService = Depends(get_background_job_service),
) -> ContentGenerationService:
    return ContentGenerationService(
        db=db,
        roadmap_content_service=roadmap_content_service,
        opensource_content_sources_service=opensource_content_sources_service,
        background_job_service=background_job_service,
    )
