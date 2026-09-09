import logging
from typing import Literal

from fastapi import Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from core.exception import BadRequestException
from core.time import get_current_timestamp
from modules.artifact.exception import ArtifactNotFound
from modules.artifact.model import ArtifactRepository
from modules.artifact.schema import ArtifactUpdate
from modules.roadmap.model import Roadmap
from modules.roadmap.roadmap_access_service import (
    RoadmapAccessService,
    get_roadmap_access_service,
)
from modules.roadmap_agent.utils import pseudo_stream_text
from modules.thread.service import ThreadService, get_thread_service
from shared.db.dependencies import get_db
from shared.sse_stream import publish_content_block, stream_to_redis

logger = logging.getLogger(__name__)


class ArtifactService:
    def __init__(
        self,
        db: AsyncSession,
        thread_service: ThreadService,
        roadmap_access_service: RoadmapAccessService,
    ) -> None:
        self.db = db
        self.thread_service = thread_service
        self.roadmap_access_service = roadmap_access_service

    async def create_artifact(
        self,
        organization_id: str,
        team_id: str | None,
        project_id: str,
        thread_id: str,
        user_id: str,
        artifact_title: str,
        artifact_description: str,
        artifact_data: dict,
        artifact_metadata: dict = {},
    ):
        new_artifact = ArtifactRepository(
            thread_id=thread_id,
            organization_id=organization_id,
            team_id=team_id,
            project_id=project_id,
            title=artifact_title,
            description=artifact_description,
            artifact_data=artifact_data,
            artifact_type="roadmap",
            artifact_metadata=artifact_metadata,
        )

        self.db.add(new_artifact)
        await self.db.commit()
        await self.db.refresh(new_artifact)
        return {"artifact_id": new_artifact.artifact_id}

    async def update_artifact(
        self,
        organization_id: str,
        team_id: str | None,
        thread_id: str,
        user_id: str,
        artifact_id: str,
        data: ArtifactUpdate,
    ):
        try:
            artifact = await self.db.scalar(
                select(ArtifactRepository).where(
                    ArtifactRepository.artifact_id == artifact_id,
                    ArtifactRepository.organization_id == organization_id,
                    ArtifactRepository.team_id == team_id,
                    ArtifactRepository.thread_id == thread_id,
                )
            )

            if not artifact:
                raise ArtifactNotFound("Invalid artifact")

            artifact_data = artifact.artifact_data
            artifact_metadata = artifact.artifact_metadata

            if data.title:
                artifact.title = data.title
            if data.description:
                artifact.description = data.description

            if data.graph:
                artifact_data["graph"] = data.graph
                artifact.artifact_data = artifact_data
                flag_modified(artifact, "artifact_data")
            if data.meta:
                artifact.artifact_metadata = {**artifact_metadata, **data.meta}
                flag_modified(artifact, "artifact_metadata")

            await self.db.commit()
            return {"status": "success"}
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error occurred in create_artifact: {str(e)}")
            raise e

    async def get_artifact_by_id(
        self,
        organization_id: str,
        team_id: str | None,
        thread_id: str,
        user_id: str,
        artifact_id: str,
    ):
        try:
            artifact = await self.db.scalar(
                select(ArtifactRepository).where(
                    ArtifactRepository.artifact_id == artifact_id,
                    ArtifactRepository.organization_id == organization_id,
                    ArtifactRepository.team_id == team_id,
                    ArtifactRepository.thread_id == thread_id,
                )
            )

            if not artifact:
                raise ArtifactNotFound("Invalid artifact")

            response = {
                "title": artifact.title,
                "description": artifact.description,
                "type": artifact.artifact_type,
                "data": artifact.artifact_data,
                "meta": artifact.artifact_metadata,
            }

            return response

        except Exception as e:
            logger.error(f"Error occurred in create_artifact: {str(e)}")
            raise e

    async def get_latest_roadmap_artifact(
        self, organization_id: str, team_id: str | None, thread_id: str
    ) -> ArtifactRepository:

        artifact = await self.db.scalar(
            select(ArtifactRepository)
            .where(
                ArtifactRepository.organization_id == organization_id,
                ArtifactRepository.team_id == team_id,
                ArtifactRepository.thread_id == thread_id,
            )
            .order_by(ArtifactRepository.created_at.desc())
        )

        if not artifact:
            raise ValueError("No roadmap artifact found in this thread")

        return artifact

    async def save_roadmap_artifact(
        self,
        organization_id: str,
        team_id: str | None,
        thread_id: str,
        user_id: str,
        artifact_id: str,
        source: Literal["chat", "artifact"],
        message_id: str | None = None,
    ):
        try:
            artifact = await self.db.scalar(
                select(ArtifactRepository).where(
                    ArtifactRepository.artifact_id == artifact_id,
                    ArtifactRepository.organization_id == organization_id,
                    ArtifactRepository.team_id == team_id,
                    ArtifactRepository.thread_id == thread_id,
                )
            )

            if not artifact:
                raise ArtifactNotFound("Invalid artifact")
            if (
                artifact.artifact_metadata.get("generation_status", "incomplete")
                == "incomplete"
            ):
                raise BadRequestException(
                    "Roadmap Generation Incomplete. Please open the roadmap and then save"
                )

            (
                status,
                saved_roadmap_id,
                saved_roadmap_title,
            ) = await self.check_artifact_already_saved(
                artifact_id=artifact_id, user_id=user_id
            )

            print(f"Check status: {status}::{saved_roadmap_id}::{source}")
            if status:
                if source == "chat" and saved_roadmap_id:
                    print("Request from chat and roadmap already exists")
                    print(f"Existing Roadmap ID: {saved_roadmap_id}")
                    await self.stream_message_for_start_learning(
                        organization_id=organization_id,
                        team_id=team_id,
                        thread_id=thread_id,
                        user_id=user_id,
                        message_id=str(message_id),
                        roadmap_id=saved_roadmap_id,
                        previosly_saved=True,
                    )
                    return {
                        "status": "success",
                        "slug": saved_roadmap_id,
                        "title": saved_roadmap_title,
                    }
                else:
                    raise BadRequestException("Roadmap already saved")

            roadmap_id, roadmap_title = await self.create_roadmap_from_artifact(
                artifact=artifact,
                thread_id=thread_id,
                user_id=user_id,
                organization_id=organization_id,
                team_id=team_id,
            )

            if source == "chat":
                await self.stream_message_for_start_learning(
                    organization_id=organization_id,
                    team_id=team_id,
                    thread_id=thread_id,
                    user_id=user_id,
                    message_id=str(message_id),
                    roadmap_id=roadmap_id,
                )

            # update the artifact metadata and store the saved key as true
            artifact_metadata = artifact.artifact_metadata or {}
            artifact.artifact_metadata = {**artifact_metadata, "saved": True}
            flag_modified(artifact, "artifact_metadata")

            await self.db.commit()

            return {
                "status": "success",
                "slug": roadmap_id,
                "title": roadmap_title,
            }
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error occurred in create_artifact: {str(e)}", exc_info=True)
            raise e

    async def check_artifact_already_saved(self, artifact_id: str, user_id: str):
        try:
            roadmap = await self.db.scalar(
                select(Roadmap)
                .where(Roadmap.user_id == user_id)
                .where(
                    text("roadmap_metadata->>'artifact_id' = :aid").bindparams(
                        aid=artifact_id
                    )
                )
            )

            logger.info(f"Roadmaps: {roadmap}")

            if not roadmap:
                return False, None, None
            return True, roadmap.roadmap_id, roadmap.title
        except Exception as e:
            logger.error(f"Error occurred in create_artifact: {str(e)}")
            raise e

    async def create_roadmap_from_artifact(
        self,
        artifact: ArtifactRepository,
        thread_id: str,
        user_id: str,
        organization_id: str,
        team_id: str | None,
    ):
        try:
            artifact_id = artifact.artifact_id
            artifact_data = artifact.artifact_data
            artifact_metadata = artifact.artifact_metadata
            artifact_version_tag = artifact_metadata.get("version", {}).get(
                "version_tag", 0
            )
            roadmap_title, roadmap_description = (
                f"{artifact.title}(Version {artifact_version_tag + 1:02d})",
                artifact.title,
            )
            price, level = 999, "beginner"

            roadmap_graph, roadmap_content = (
                artifact_data.get("graph", {"nodes": [], "edges": []}),
                {},
            )
            roadmap_price = {
                "previous_prices": [],
                "current_price": {
                    "value": float(price),
                    "effective_from": str(get_current_timestamp()),
                },
            }
            """
            generation mode
            dsl
            generation_status
            thread_id
            artifact_id
            generation_prompt
            selected_time_commitment
            usage_metadata
            """
            roadmap_metadata = {
                "content_count": {"public": 0, "premium": 0},
                "mode": "ai-generated",
                "prompt": artifact_data["prompt"],
                "roadmap_dsl": {
                    "current": {
                        "dsl": artifact_data["dsl"],
                        "roadmap_creation_usage_metadata": artifact_metadata.get(
                            "usage_metadata", {}
                        ),
                        "query_validation_usage_metadata": artifact_metadata.get(
                            "query_validation_usage_metadata", {}
                        ),
                        "selected_time_commitment": artifact_data["time_commitment"],
                        "timestamp": str(get_current_timestamp()),
                    }
                },
                "generation_status": artifact_metadata["generation_status"],
                "thread_id": thread_id,
                "artifact_id": artifact_id,
            }

            # create new roadmap
            new_roadmap = Roadmap(
                user_id=user_id,
                organization_id=organization_id,
                team_id=team_id,
                project_id=artifact.project_id,
                title=roadmap_title,
                description=roadmap_description,
                roadmap_graph=roadmap_graph,
                roadmap_content=roadmap_content,
                level=level,
                price=roadmap_price,
                status="draft",
                visibility_scope="private",
                roadmap_metadata=roadmap_metadata,
            )
            self.db.add(new_roadmap)
            # db.session.commit()
            await self.db.flush()
            await self.db.refresh(new_roadmap)

            roadmap_id = new_roadmap.roadmap_id
            await self.roadmap_access_service.add_or_update_roadmap_access(
                user_id=user_id,
                granting_user_id=user_id,
                roadmap_id=new_roadmap.roadmap_id,
                role="owner",
                sharing_mode="owner_sharing",
            )
            await self.db.commit()

            return roadmap_id, roadmap_title
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error occurred in create_roadmap_from_artifact: {str(e)}")
            raise e

    async def stream_message_for_start_learning(
        self,
        organization_id: str,
        team_id: str | None,
        thread_id: str,
        user_id: str,
        message_id: str,
        roadmap_id: str,
        previosly_saved: bool = False,
    ):
        try:
            message = (
                "Your roadmap is already saved!. Whenever you're ready, let's dive in"
                if previosly_saved
                else "Shifu Saved! This is yours now. Whenever you're ready, let's dive in"
            )
            content = [
                {
                    "type": "text",
                    "data": {"text": message},
                }
            ]

            first_chunk = True

            for chunk in pseudo_stream_text(content[0]["data"]["text"]):
                text_content = [{"type": "text", "data": {"text": chunk}}]

                await publish_content_block(
                    message_id=str(message_id),
                    thread_id=thread_id,
                    user_id=user_id,
                    role="assistant",
                    content=text_content,
                    overwrite=first_chunk,
                )
                first_chunk = False

            action_message_blocks = [
                {
                    "type": "action",
                    "interaction_id": "post_roadmap_action_cta",
                    "layout": "post_roadmap_action_cta",
                    "data": {
                        "title": None,
                        "options": [
                            {
                                "id": "start_learning",
                                "label": "Start Learning",
                                "action": "START_LEARNING",
                                "value": "start_learning",
                                "roadmap_id": roadmap_id,
                            }
                        ],
                    },
                }
            ]

            await publish_content_block(
                message_id=str(message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=action_message_blocks,
            )

            content.extend(action_message_blocks)

            await self.thread_service.save_conversation_to_db(
                organization_id=organization_id,
                team_id=team_id,
                message_id=str(message_id),
                thread_id=thread_id,
                user_id=user_id,
                role="assistant",
                content=content,
                mode="overwrite",
            )

            # send sse closing signal
            redis_channel_id = f"thread:{thread_id}:{user_id}"
            await stream_to_redis(channel=redis_channel_id, message="[DONE]")

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error occurred in create_roadmap_from_artifact: {str(e)}")
            raise e

    async def get_all_saved_roadmap_artifact(
        self, user_id: str, organization_id: str, team_id: str | None
    ):
        try:
            all_user_roadmap = (
                await self.db.scalars(
                    select(Roadmap).where(
                        Roadmap.user_id == user_id,
                        Roadmap.organization_id == organization_id,
                        Roadmap.team_id == team_id,
                        Roadmap.roadmap_metadata["thread_id"].is_not(None),
                        Roadmap.roadmap_metadata["artifact_id"].is_not(None),
                    )
                )
            ).all()

            response_data = []
            roadmap_ids = set()

            for roadmap in all_user_roadmap:
                is_saved_roadmap = (
                    "artifact_id" in roadmap.roadmap_metadata
                    and "thread_id" in roadmap.roadmap_metadata
                )
                if is_saved_roadmap and roadmap.roadmap_id not in roadmap_ids:
                    roadmap_ids.add(roadmap.roadmap_id)
                    roadmap_data = {
                        "slug": roadmap.roadmap_id,
                        "project_id": roadmap.project_id,
                        "title": roadmap.title,
                        "created_at": roadmap.created_at,
                        "updated_at": roadmap.updated_at,
                    }
                    response_data.append(roadmap_data)

            return {"roadmaps": response_data}
        except Exception as e:
            print(e)
            raise


async def get_artifact_service(
    db: AsyncSession = Depends(get_db),
    thread_service: ThreadService = Depends(get_thread_service),
    roadmap_access_service: RoadmapAccessService = Depends(get_roadmap_access_service),
) -> ArtifactService:
    return ArtifactService(
        db=db,
        thread_service=thread_service,
        roadmap_access_service=roadmap_access_service,
    )
