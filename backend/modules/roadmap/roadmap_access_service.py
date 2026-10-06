import logging

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from core.config import settings
from core.exception import ForbiddenException
from core.security.hashing import hash_entity
from modules.roadmap.model import Roadmap, UserRoadmap
from modules.roadmap.schema import GrantAccessRequest
from modules.user.model import UserDetails
from shared.db.dependencies import get_db
from shared.email.dependencies import get_background_email_service, get_email_service
from shared.email.schema import EmailTemplate
from shared.email.service import BackgroundEmailService, EmailService

logger = logging.getLogger(__name__)


class RoadmapAccessService:
    def __init__(self, db: AsyncSession, email_service: BackgroundEmailService) -> None:
        self.db = db
        self.email_service = email_service

    async def grant_users_roadmap_access(
        self, granting_user_id: str, granting_user_email: str, data: GrantAccessRequest
    ):
        try:
            # user_ids: list, granting_user_id:str, roadmap_id: str, role:str, sharing_mode:str='basic_sharing'
            roadmap_id = data.roadmap_id
            notify_people = data.notify

            granting_user_roadmap = await self.db.scalar(
                select(UserRoadmap)
                .options(selectinload(UserRoadmap.roadmap))
                .where(
                    UserRoadmap.user_id == granting_user_id,
                    UserRoadmap.roadmap_id == roadmap_id,
                    UserRoadmap.role == "owner",
                )
            )
            if not granting_user_roadmap:
                raise ForbiddenException("You doesn't have permission to grant access")

            roadmap_project_id = granting_user_roadmap.roadmap.project_id
            
            access_details = data.access
            seen_emails = set()
            unique_access = []
            for a in access_details:
                e = a.email.strip().lower()
                if e not in seen_emails:
                    seen_emails.add(e)
                    unique_access.append(a)
            access_details = unique_access

            for access in access_details:
                # check user exists in db
                user_email = access.email.strip().lower()
                user_res = await self.db.execute(
                    select(UserDetails).where(
                        (func.lower(UserDetails.user_email) == user_email) |
                        (UserDetails.email == hash_entity(user_email))
                    ).limit(1)
                )
                user = user_res.scalars().first()

                access_role = access.level if hasattr(access, 'level') else "viewer"
                sharing_mode = access.sharing_mode if hasattr(access, 'sharing_mode') else "basic_sharing"

                if not user:
                    user = UserDetails(user_email=user_email)
                    self.db.add(user)
                    await self.db.flush()

                await self.add_or_update_roadmap_access(
                    user_id=user.user_id,
                    granting_user_id=granting_user_id,
                    roadmap_id=roadmap_id,
                    role=access_role,
                    sharing_mode=sharing_mode,
                )
            await self.db.commit()

            # send confirmation mails if notify people enabled
            if notify_people:
                viewer_emails = [x.email for x in access_details if x.level == "viewer"]
                editor_emails = [x.email for x in access_details if x.level == "editor"]
                if viewer_emails:
                    for email in viewer_emails:
                        assignee_user_name = email.split("@")[0]
                        assignor_user_name = granting_user_email.split("@")[0]
                        self.email_service.send_email(
                            template=EmailTemplate.ROADMAP_ACCESS_GRANTED,
                            to_emails=viewer_emails,
                            roadmap_name=granting_user_roadmap.roadmap.title,
                            roadmap_url=f"{settings.site_base_url}/project/{roadmap_project_id}/roadmap/{roadmap_id}",
                            # granted_role="viewer",
                            user_name=assignee_user_name,
                            granted_by=assignor_user_name
                        )

                if editor_emails:
                    for email in editor_emails:
                        assignee_user_name = email.split("@")[0]
                        assignor_user_name = granting_user_email.split("@")[0]
                        self.email_service.send_email(
                            template=EmailTemplate.ROADMAP_EDITOR_ACCESS_GRANTED,
                            to_emails=editor_emails,
                            roadmap_name=granting_user_roadmap.roadmap.title,
                            roadmap_url=f"{settings.site_base_url}/project/{roadmap_project_id}/roadmap/{roadmap_id}",
                            # granted_role="editor",
                            user_name=assignee_user_name,
                            granted_by=assignor_user_name
                        )
            return {
                "message": f"Access granted successfully to {len(access_details)} users"
            }
        except Exception as e:
            logger.error(
                f"Exception occurred in grant_users_roadmap_access: {str(e)}",
                exc_info=True,
            )
            raise

    async def add_or_update_roadmap_access(
        self,
        user_id: str,
        granting_user_id: str,
        roadmap_id: str,
        role: str,
        sharing_mode: str = "basic_sharing",
    ) -> bool:
        try:
            user_roadmap_res = await self.db.execute(
                select(UserRoadmap).where(
                    UserRoadmap.user_id == user_id, UserRoadmap.roadmap_id == roadmap_id
                ).limit(1)
            )
            user_roadmap = user_roadmap_res.scalars().first()

            if user_roadmap:
                print("Updating existing access")
                user_roadmap_data = user_roadmap.user_roadmap_data
                if sharing_mode in [
                    "purchase",
                    "access_shared_by_admin",
                    "collaboration",
                ]:
                    user_roadmap_data["premium_content_access"] = "all"
                else:
                    user_roadmap_data["premium_content_access"] = "none"

                # db update
                user_roadmap.role = role
                user_roadmap.sharing_mode = sharing_mode
                user_roadmap.user_roadmap_data = user_roadmap_data
                user_roadmap.status = "active"

                flag_modified(user_roadmap, "user_roadmap_data")

            else:
                print("Creating new access")
                DEFAULT_USR_ROADMAP_DATA = {
                    "learning_progress": {},
                    "premium_content_access": "all"
                    if user_id == granting_user_id
                    or sharing_mode
                    in ["purchase", "access_shared_by_admin", "collaboration"]
                    else "none",
                }
                new_access = UserRoadmap(
                    user_id=user_id,
                    granted_by=granting_user_id,
                    roadmap_id=roadmap_id,
                    role=role,
                    sharing_mode=sharing_mode,
                    user_roadmap_data=DEFAULT_USR_ROADMAP_DATA,
                )
                self.db.add(new_access)
                print("Access giving done for new user")

            await self.db.commit()
            return True
        except Exception as e:
            logger.error(
                f"Exception occurred in add_or_update_roadmap_access: {str(e)}",
                exc_info=True,
            )
            raise

    async def revoke_user_roadmap_access(
        self, user_id: str, roadmap_id: str, target_emails: list
    ) -> dict:
        try:
            revoking_user = await self.db.scalar(
                select(UserDetails).where(UserDetails.user_id == user_id)
            )
            if not revoking_user:
                raise ForbiddenException("Access Denied!!")

            revoking_user_id = user_id

            revoking_user_roadmap = await self.db.scalar(
                select(UserRoadmap).where(
                    UserRoadmap.user_id == revoking_user_id,
                    UserRoadmap.roadmap_id == roadmap_id,
                )
            )
            if (
                not revoking_user_roadmap
                or revoking_user_roadmap.role.lower() != "owner"
            ):
                raise ForbiddenException("You doesn't have permission to revoke access")

            for user_email in target_emails:
                user = await self.db.scalar(
                    select(UserDetails).where(
                        UserDetails.email == hash_entity(user_email)
                    )
                )
                # If user not present in db then it must not present in the UserRoadmp table due to db constraints
                if not user:
                    print(f"Skipping user as it is not found : {user_email}")
                    continue

                user_id = user.user_id

                user_roadmap = await self.db.scalar(
                    select(UserRoadmap).where(
                        UserRoadmap.user_id == user_id,
                        UserRoadmap.roadmap_id == roadmap_id,
                    )
                )
                if not user_roadmap:
                    print(
                        f"Skipping user : {user_email} due to no existance in UserRoadmap"
                    )
                    continue
                await self.db.delete(user_roadmap)
            await self.db.commit()
            return {"message": "Access revoked successfully", "status": 200}
        except Exception as e:
            logger.error(
                f"Exception occurred in revoke_user_roadmap_access: {str(e)}",
                exc_info=True,
            )
            raise

    async def get_shared_roadmap_data(self, roadmap_id: str):
        try:
            user_roadmaps = (
                await self.db.scalars(
                    select(UserRoadmap)
                    .options(selectinload(UserRoadmap.user))
                    .where(UserRoadmap.roadmap_id == roadmap_id)
                )
            ).all()

            all_users = []
            for user_roadmap in user_roadmaps:
                granted_user = user_roadmap.user
                all_users.append(
                    {
                        "email": granted_user.user_email,
                        "access": user_roadmap.role,
                        "mode": user_roadmap.sharing_mode,
                    }
                )
            # priority order
            access_priority = {"owner": 0, "editor": 1, "viewer": 2}
            all_users.sort(key=lambda x: access_priority.get(x["access"], 3))
            return {
                "message": "Access Sharing data fetched successfully",
                "users": all_users,
            }
        except Exception as e:
            logger.error(
                f"Exception occurred in get_shared_roadmap_data: {str(e)}",
                exc_info=True,
            )
            raise

    async def search_roadmap_by_title(
        self, user_id: str, organization_id: str, team_id: str | None, query: str
    ) -> dict:
        try:
            roadmaps = (
                await self.db.scalars(
                    select(Roadmap).where(
                        Roadmap.user_id == user_id,
                        Roadmap.organization_id == organization_id,
                        Roadmap.team_id == team_id,
                    )
                )
            ).all()

            matching_roadmaps = [
                roadmap
                for roadmap in roadmaps
                if query.lower() in roadmap.title.lower()
            ]
            print(query)
            print(matching_roadmaps)
            search_result = [
                {
                    "r_id": roadmap.roadmap_id,
                    "title": roadmap.title,
                    "owner": roadmap.user_id == user_id,
                }
                for roadmap in matching_roadmaps
            ]
            return {"message": "Search successfull", "result": search_result}
        except Exception as e:
            logger.error(
                f"Exception occurred in search_roadmap_by_title: {str(e)}",
                exc_info=True,
            )
            raise

    async def get_roadmap_by_id(self, user_id: str, roadmap_id: str) -> dict:
        try:
            user_roadmap = await self.db.scalar(
                select(UserRoadmap)
                .options(selectinload(UserRoadmap.roadmap))
                .where(
                    UserRoadmap.roadmap_id == roadmap_id, UserRoadmap.user_id == user_id
                )
            )

            if not user_roadmap or not user_roadmap.roadmap:
                raise ForbiddenException("Access denied")

            response_data = {}
            if user_roadmap.status == "blocked":
                raise ForbiddenException("Access denied")
            current_roadmap_price = (
                0
                if user_roadmap.roadmap.price["current_price"]["value"] == 0
                else user_roadmap.roadmap.price["current_price"]["value"]
            )
            premium_content_access = (
                None
                if user_roadmap.user_roadmap_data["premium_content_access"] == "none"
                else user_roadmap.user_roadmap_data["premium_content_access"]
            )
            roadmap_content_count = self.get_content_counts(
                user_roadmap.roadmap.roadmap_content
            )
            total_content_count = (
                (roadmap_content_count["premium"] + roadmap_content_count["public"])
                if premium_content_access == "all"
                else roadmap_content_count["public"]
            )
            gross_content_count = (
                roadmap_content_count["premium"] + roadmap_content_count["public"]
            )
            is_roadmap_bookmarked = (
                True
                if user_id in user_roadmap.roadmap.roadmap_metadata.get("bookmark", [])
                else False
            )
            content_generation = user_roadmap.roadmap.roadmap_metadata.get(
                "content_generation", None
            )
            prompt = user_roadmap.roadmap.roadmap_metadata.get("prompt", None)
            course_recommendation = user_roadmap.roadmap.roadmap_metadata.get(
                "course_recommendation", None
            )
            response_data = {
                "message": "roadmap retrived successfully",
                "id": user_roadmap.roadmap.roadmap_id,
                "title": user_roadmap.roadmap.title,
                "g_data": user_roadmap.roadmap.roadmap_graph,
                "status": user_roadmap.roadmap.status,
                "visibility": user_roadmap.roadmap.visibility_scope,
                "created_at": user_roadmap.roadmap.created_at,
                "updated_at": user_roadmap.roadmap.updated_at,
                "access": user_roadmap.role,
                "premium_access": premium_content_access,
                "price": current_roadmap_price,
                "total_content": total_content_count,
                "gross_content": gross_content_count,
                "is_bookmarked": is_roadmap_bookmarked,
                "level": user_roadmap.roadmap.level,
                "description": user_roadmap.roadmap.description,
                "mode": user_roadmap.roadmap.roadmap_metadata.get("mode", "manual"),
            }
            if content_generation:
                response_data["content_generation"] = {
                    "mode": content_generation["mode"],
                    "job_id": content_generation["job_id"],
                    "generation_state": content_generation["generation_state"],
                }
            if course_recommendation:
                response_data["course_recommendation"] = {
                    "mode": course_recommendation["mode"],
                    "job_id": course_recommendation["job_id"],
                }
            if (
                prompt
                and response_data["mode"] == "ai-generated"
                and user_roadmap.roadmap.user_id == user_id
            ):
                response_data["prompt"] = prompt

            return response_data
        except Exception as e:
            logger.error(
                f"Exception occurred in get_roadmap_by_id: {str(e)}",
                exc_info=True,
            )
            raise

    async def get_all_roadmap(
        self, user_id: str, organization_id: str, team_id: str | None
    ):
        try:
            all_user_roadmap = (
                await self.db.scalars(
                    select(UserRoadmap)
                    .options(selectinload(UserRoadmap.roadmap))
                    .where(UserRoadmap.user_id == user_id)
                )
            ).all()

            # filter based on team and organization
            all_user_roadmap = [
                user_roadmap
                for user_roadmap in all_user_roadmap
                if user_roadmap.roadmap.organization_id == organization_id
                and user_roadmap.roadmap.team_id == team_id
            ]

            response_data = []
            roadmap_ids = set()  # Set to track unique roadmap IDs

            # Add user-specific roadmaps
            for user_roadmap in all_user_roadmap:
                roadmap = user_roadmap.roadmap
                if roadmap.roadmap_id not in roadmap_ids:
                    roadmap_ids.add(roadmap.roadmap_id)

                    shared = (
                        await self.db.scalar(
                            select(func.count())
                            .select_from(UserRoadmap)
                            .where(
                                UserRoadmap.roadmap_id == roadmap.roadmap_id,
                                UserRoadmap.status == "active",
                            )
                        )
                        or 0
                    )

                    roadmap_data = {
                        "id": roadmap.roadmap_id,
                        "title": roadmap.title,
                        "description": roadmap.description,
                        "level": roadmap.level,
                        "status": roadmap.status,
                        "visibility": roadmap.visibility_scope,
                        "created_at": roadmap.created_at,
                        "updated_at": roadmap.updated_at,
                        "access": user_roadmap.role,
                        "mode": roadmap.roadmap_metadata.get("mode", "manual"),
                        "shared": shared > 1,
                        "project_id": roadmap.project_id
                    }
                    if roadmap_data[
                        "mode"
                    ] == "ai-generated" and roadmap.roadmap_metadata.get(
                        "has_manual_edits", False
                    ):
                        roadmap_data["has_manual_edits"] = True

                    selected_time_commitment = (
                        user_roadmap.roadmap.roadmap_metadata.get("roadmap_dsl", {})
                        .get("current", {})
                        .get("selected_time_commitment", None)
                    )
                    if selected_time_commitment:
                        roadmap_data["time_commitment_tier"] = selected_time_commitment[
                            "name"
                        ]
                    response_data.append(roadmap_data)

            return response_data
        except Exception as e:
            logger.error(
                f"Exception occurred in get_all_roadmap: {str(e)}",
                exc_info=True,
            )
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


async def get_roadmap_access_service(
    db: AsyncSession = Depends(get_db),
    email_service: BackgroundEmailService = Depends(get_background_email_service),
) -> RoadmapAccessService:
    return RoadmapAccessService(db=db, email_service=email_service)
