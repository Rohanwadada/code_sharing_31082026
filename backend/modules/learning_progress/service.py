from typing import Any

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from core.exception import BadRequestException, ForbiddenException
from core.time import get_current_timestamp
from modules.organization.service import OrganizationService, get_organization_service
from modules.roadmap.model import UserRoadmap
from modules.roadmap.service import RoadmapService, get_roadmap_service
from modules.team.service import TeamService, get_team_service
from shared.db.dependencies import get_db


class LearningProgressService:
    def __init__(
        self,
        db: AsyncSession,
        organization_service: OrganizationService,
        team_service: TeamService,
        roadmap_service: RoadmapService,
    ) -> None:
        self.db = db
        self.organization_service = organization_service
        self.team_service = team_service
        self.roadmap_service = roadmap_service

    def _get_valid_node_ids(self, roadmap_content: dict[str, Any]) -> set[str]:
        return {
            nid
            for nid, content in roadmap_content.items()
            if isinstance(content, dict) and content.get("deleted") is not True
        }

    def _enrich_progress(
        self,
        progress_data: dict[str, Any],
        roadmap_content: dict[str, Any],
        valid_node_ids: set[str],
    ) -> dict[str, Any]:
        enriched = {}
        for nid in valid_node_ids:
            entry = progress_data.get(nid)
            if entry is not None:
                enriched[nid] = {
                    **entry,
                    "content_count": len(roadmap_content[nid].get("links", [])),
                }
        return enriched

    def _compute_percentage(
        self, progress_data: dict[str, Any], valid_node_ids: set[str]
    ) -> float:
        if not valid_node_ids:
            return 0.0
        done_count = sum(
            1
            for nid in valid_node_ids
            if nid in progress_data and progress_data[nid].get("status") == "done"
        )
        return round((done_count / len(valid_node_ids) * 100), 2)

    def get_completed_content_count(
        self, learning_progress: dict, roadmap_content: dict, access_type: str
    ) -> int:
        content_completed = 0
        for key, value in learning_progress.items():
            if value["status"] == "done" and key in roadmap_content:
                if roadmap_content[key].get("deleted") is True:
                    continue
                if access_type == "all":
                    content_completed += len(roadmap_content[key]["links"])
                else:
                    content_completed += sum(
                        1
                        for content in roadmap_content[key]["links"]
                        if content["accessType"] == "public"
                    )
        return content_completed

    async def get_learning_progress(
        self,
        organization_id: str,
        team_id: str | None,
        user_id: str,
        roadmap_id: str,
    ) -> dict[str, Any]:
        await self.organization_service.get_organization_by_id(
            organization_id=organization_id
        )

        if team_id:
            await self.team_service.get_team_by_id(
                team_id=team_id,
                organization_id=organization_id,
                user_id=user_id,
            )

        user_roadmap = await self.db.scalar(
            select(UserRoadmap)
            .options(selectinload(UserRoadmap.roadmap))
            .where(UserRoadmap.user_id == user_id, UserRoadmap.roadmap_id == roadmap_id)
        )

        if not user_roadmap:
            raise ForbiddenException("Access denied")

        roadmap = user_roadmap.roadmap
        roadmap_content = roadmap.roadmap_content or {}

        user_roadmap_data = user_roadmap.user_roadmap_data
        learning_progress = user_roadmap_data.get("learning_progress", {})
        access_type = user_roadmap_data.get("premium_content_access", "public")

        content_completed = self.get_completed_content_count(
            learning_progress, roadmap_content, access_type
        )

        return {
            "message": "Learning progress fetched successfully",
            "learning_progress": learning_progress,
            "content_completed": content_completed,
        }

    async def update_learning_progress(
        self,
        organization_id: str,
        team_id: str | None,
        user_id: str,
        roadmap_id: str,
        node_id: str,
        status: str,
        additional_data: dict = {}
    ) -> dict[str, Any]:
        await self.organization_service.get_organization_by_id(
            organization_id=organization_id
        )

        if team_id:
            await self.team_service.get_team_by_id(
                team_id=team_id,
                organization_id=organization_id,
                user_id=user_id,
            )

        user_roadmap = await self.db.scalar(
            select(UserRoadmap)
            .options(selectinload(UserRoadmap.roadmap))
            .where(UserRoadmap.user_id == user_id, UserRoadmap.roadmap_id == roadmap_id)
        )

        if not user_roadmap:
            raise ForbiddenException("Access denied")

        roadmap = user_roadmap.roadmap
        roadmap_content = roadmap.roadmap_content or {}

        user_roadmap_data = user_roadmap.user_roadmap_data
        current_timestamp = get_current_timestamp()
        # check the roadmap for the node's existence and type. Only topic, subtopic topicGoroup and subtopicGroup nodes can be updated
        roadmap = user_roadmap.roadmap
        node_type = None
        for node in roadmap.roadmap_graph["nodes"]:
            if node["id"] == node_id:
                node_type = node["type"]
                break
        if node_type not in ["topic", "subtopic", "assignmentNode"]:
            raise BadRequestException(
                "Invalid node type for updating learning progress"
            )

        # if the node id present in the user_roadmap_data['learning_progress'] then update the status and timestamp
        # else add the new node_id with status and timestamp
        # learning progres data structure: {node_id: {status: 'completed', timestamp: 1234567890}}
        if node_id in user_roadmap_data["learning_progress"]:
            user_roadmap_data["learning_progress"][node_id]["status"] = status
            user_roadmap_data["learning_progress"][node_id]["updated_at"] = (
                current_timestamp.isoformat()
            )
        else:
            print("Adding new node to learning progress")
            user_roadmap_data["learning_progress"][node_id] = {
                "status": status,
                "started_at": current_timestamp.isoformat(),
                "updated_at": current_timestamp.isoformat(),
                **additional_data
            }

        # update the content count
        content_completed = self.get_completed_content_count(
            user_roadmap_data["learning_progress"],
            roadmap_content,
            user_roadmap_data["premium_content_access"],
        )
        user_roadmap_data["content_completed"] = content_completed

        print(f"Updated User Roadmap data: {user_roadmap_data}")
        # db update
        user_roadmap.user_roadmap_data = user_roadmap_data
        user_roadmap.updated_at = get_current_timestamp()

        flag_modified(user_roadmap, "user_roadmap_data")

        await self.db.commit()
        return {
            "message": "Progress updated successfully",
            "content_completed": content_completed,
        }


async def get_learning_progress_service(
    db: AsyncSession = Depends(get_db),
    organization_service: OrganizationService = Depends(get_organization_service),
    team_service: TeamService = Depends(get_team_service),
    roadmap_service: RoadmapService = Depends(get_roadmap_service),
) -> LearningProgressService:
    return LearningProgressService(
        db=db,
        organization_service=organization_service,
        team_service=team_service,
        roadmap_service=roadmap_service,
    )
