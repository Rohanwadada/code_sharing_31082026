import logging
from typing import Any

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm.strategy_options import selectinload

from core.config import settings
from core.exception import BadRequestException, ForbiddenException
from modules.roadmap.exceptions import RoadmapNotFound
from modules.roadmap.model import Roadmap, UserRoadmap
from modules.roadmap_content.schema import (
    PushContentUpdateRequest,
    RemoveNodeContent,
    RestoreNodeContent,
)
from modules.roadmap_learning_assessment.model import RoadmapLearningAssessment
from shared.db.dependencies import get_db
from shared.email.dependencies import get_background_email_service
from shared.email.schema import EmailTemplate
from shared.email.service import BackgroundEmailService

logger = logging.getLogger(__name__)


class RoadmapContentService:
    def __init__(self, db: AsyncSession, email_service: BackgroundEmailService) -> None:
        self.db = db
        self.email_service = email_service

    async def get_roadmap_content(
        self, organization_id: str, team_id: str | None, user_id: str, roadmap_id: str
    ) -> dict:
        # await self.organization_service.get_organization_by_id(
        #     organization_id=organization_id
        # )

        # if team_id:
        #     await self.team_service.get_team_by_id(
        #         team_id=team_id, organization_id=organization_id, user_id=user_id
        #     )

        # roadmap = await self.roadmap_service.get_by_id(roadmap_id=roadmap_id)

        roadmap = await self.db.scalar(
            select(Roadmap).where(
                Roadmap.roadmap_id == roadmap_id,
                Roadmap.organization_id == organization_id,
                Roadmap.team_id == team_id,
            )
        )
        if not roadmap:
            raise BadRequestException("Roadmap not found")

        roadmap_content = roadmap.roadmap_content
        content_count = {"public": 0, "premium": 0}
        for node_id, node_content in roadmap_content.items():
            for link in node_content.get("links", []):
                content_count[link["accessType"]] += 1

        return {"content_count": content_count}

    async def get_node_content(
        self,
        organization_id: str,
        team_id: str | None,
        user_id: str,
        roadmap_id: str,
        node_id: str,
    ) -> dict:
        # await self.organization_service.get_organization_by_id(
        #     organization_id=organization_id
        # )

        # if team_id:
        #     await self.team_service.get_team_by_id(
        #         team_id=team_id, organization_id=organization_id, user_id=user_id
        #     )

        # roadmap = await self.roadmap_service.get_by_id(roadmap_id=roadmap_id)

        roadmap = await self.db.scalar(
            select(Roadmap).where(
                Roadmap.roadmap_id == roadmap_id,
                Roadmap.organization_id == organization_id,
                Roadmap.team_id == team_id,
            )
        )
        if not roadmap:
            raise BadRequestException("Roadmap not found")

        user_roadmap = await self.db.scalar(
            select(UserRoadmap)
            .options(selectinload(UserRoadmap.roadmap))
            .where(UserRoadmap.roadmap_id == roadmap_id, UserRoadmap.user_id == user_id)
        )

        if not user_roadmap:
            raise ForbiddenException("You doesn't have permission to view the content")

        premium_content_access = (
            user_roadmap.user_roadmap_data.get("premium_content_access", "none")
            if user_roadmap
            else "none"
        )

        roadmap_content = roadmap.roadmap_content or {}

        node_content = roadmap_content.get(node_id, None)
        if node_content:
            # node_content = roadmap_content[node_id]
            # remove the links from the content if the user doesn't have access to premium content
            print(premium_content_access)
            if premium_content_access == "none":
                for link in node_content.get("links", []):
                    if link["accessType"] == "premium":
                        del link["url"]
        else:
            node_content = {}

        #  fetch the assessment details if it is present
        assessment_id = node_content.get('assessment', {}).get("id", None)
        if assessment_id:
            assessment = await self.db.scalar(select(RoadmapLearningAssessment).where(RoadmapLearningAssessment.assessment_id==assessment_id))
            if assessment:
                assessment_data = {}
                if node_id in user_roadmap.user_roadmap_data and user_roadmap.user_roadmap_data[node_id].get(assessment, None) is not None:
                    assessment_data = user_roadmap.user_roadmap_data[node_id]['assessment']
                node_content = {**node_content, "assessment": {"name": assessment.title, "url": assessment.assessment_url, **assessment_data}}

        return {"message": "Content fetched successfully", "content": node_content}

    async def update_node_content(
        self,
        organization_id: str,
        team_id: str | None,
        user_id: str,
        roadmap_id: str,
        node_id: str,
        new_content: dict[str, Any],
    ) -> dict:
        # await self.organization_service.get_organization_by_id(
        #     organization_id=organization_id
        # )

        # if team_id:
        #     await self.team_service.get_team_by_id(
        #         team_id=team_id, organization_id=organization_id, user_id=user_id
        #     )

        # roadmap = await self.roadmap_service.get_by_id(roadmap_id=roadmap_id)

        roadmap = await self.db.scalar(
            select(Roadmap).where(
                Roadmap.roadmap_id == roadmap_id,
                Roadmap.organization_id == organization_id,
                Roadmap.team_id == team_id,
            )
        )
        if not roadmap:
            raise BadRequestException("Roadmap not found")

        updated_roadmap_content = roadmap.roadmap_content

        if node_id in roadmap.roadmap_content:
            updated_roadmap_content[node_id].update(new_content)
        else:
            updated_roadmap_content[node_id] = new_content

        flag_modified(roadmap, "roadmap_content")
        await self.db.commit()
        await self.db.refresh(roadmap)
        return roadmap.roadmap_content

    async def remove_node_content(
        self,
        organization_id: str,
        team_id: str | None,
        user_id: str,
        roadmap_id: str,
        data: RemoveNodeContent,
    ) -> dict:
        # await self.organization_service.get_organization_by_id(
        #     organization_id=organization_id
        # )

        # if team_id:
        #     await self.team_service.get_team_by_id(
        #         team_id=team_id, organization_id=organization_id, user_id=user_id
        #     )

        # roadmap = await self.roadmap_service.get_by_id(roadmap_id=roadmap_id)

        roadmap = await self.db.scalar(
            select(Roadmap).where(
                Roadmap.roadmap_id == roadmap_id,
                Roadmap.organization_id == organization_id,
                Roadmap.team_id == team_id,
            )
        )
        if not roadmap:
            raise BadRequestException("Roadmap not found")

        roadmap.roadmap_content = roadmap.roadmap_content or {}

        for node_id in data.nodes:
            if node_id in roadmap.roadmap_content:
                roadmap.roadmap_content[node_id]["deleted"] = True
        flag_modified(roadmap, "roadmap_content")

        await self.db.commit()
        await self.db.refresh(roadmap)

        return roadmap.roadmap_content

    async def restore_node_content(
        self,
        organization_id: str,
        team_id: str | None,
        roadmap_id: str,
        user_id: str,
        data: RestoreNodeContent,
    ) -> dict:
        # await self.organization_service.get_organization_by_id(
        #     organization_id=organization_id
        # )

        # if team_id:
        #     await self.team_service.get_team_by_id(
        #         team_id=team_id,
        #         organization_id=organization_id,
        #         user_id=user_id,
        #     )

        # roadmap = await self.roadmap_service.get_by_id(roadmap_id=roadmap_id)

        roadmap = await self.db.scalar(
            select(Roadmap).where(
                Roadmap.roadmap_id == roadmap_id,
                Roadmap.organization_id == organization_id,
                Roadmap.team_id == team_id,
            )
        )
        if not roadmap:
            raise BadRequestException("Roadmap not found")

        roadmap.roadmap_content = roadmap.roadmap_content or {}

        for node_id in data.nodes:
            node_content = roadmap.roadmap_content.get(node_id)

            if (
                node_content
                and isinstance(node_content, dict)
                and node_content.get("deleted") is True
            ):
                node_content.pop("deleted", None)

            flag_modified(roadmap, "roadmap_content")
            await self.db.commit()
            await self.db.refresh(roadmap)

        return roadmap.roadmap_content

    async def push_roadmap_content_update(
        self,
        roadmap_id: str,
        organization_id: str,
        team_id: str | None,
        user_id: str,
        data: PushContentUpdateRequest,
    ):
        try:
            query = select(Roadmap).where(
                Roadmap.roadmap_id == roadmap_id,
                Roadmap.organization_id == organization_id,
            )
            if team_id:
                query = select(Roadmap).where(
                    Roadmap.roadmap_id == roadmap_id,
                    Roadmap.organization_id == organization_id,
                    Roadmap.team_id == team_id,
                )

            existing_roadmap = await self.db.scalar(query)

            print(existing_roadmap)
            if not existing_roadmap:
                raise RoadmapNotFound("Roadmap not found")

            node_details = data.node_details

            user_roadmaps = (
                await self.db.scalars(
                    select(UserRoadmap)
                    .options(selectinload(UserRoadmap.user))
                    .where(UserRoadmap.roadmap_id == roadmap_id)
                )
            ).all()
            email_recipients = []
            for recipient in user_roadmaps:
                if recipient.role != "owner":
                    email_recipients.append(recipient.user.user_email)
            print(email_recipients)
            if len(email_recipients) == 0:
                raise BadRequestException("No recepient present")

            self.email_service.send_email(
                template=EmailTemplate.ROADMAP_CONTENT_UPDATE,
                to_emails=email_recipients,
                roadmap_name=existing_roadmap.title,
                roadmap_url=f"{settings.site_base_url}/roadmap/{roadmap_id}",
                node_details=node_details,
            )
            return {"message": "Update email delivered successfully"}
        except Exception as e:
            logger.error(
                f"Exception occured in push_roadmap_content_update: {str(e)}",
                exc_info=True,
            )
            raise


async def get_roadmap_content_service(
    db: AsyncSession = Depends(get_db),
    email_service: BackgroundEmailService = Depends(get_background_email_service),
):
    return RoadmapContentService(db=db, email_service=email_service)
