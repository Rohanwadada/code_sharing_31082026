import logging
from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from modules.project_wizard.model import ProjectWizardSession
from modules.project_wizard.schema import SaveWizardStepRequest
from modules.project.model import Project

logger = logging.getLogger(__name__)


class ProjectWizardService:
    async def save_or_update_step_state(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: SaveWizardStepRequest,
        organization_id: Optional[UUID] = None,
    ) -> ProjectWizardSession:
        project_id = request.project_id

        # 1. If project_id is not provided, create a draft Project record
        if not project_id:
            step_info = (
                request.step_payload.data if request.step_payload else (request.step_data or {})
            )
            p_name = step_info.get("project_name") or "Draft Project"
            p_mandate = step_info.get("project_mandate") or "team"
            h_goal = str(step_info.get("hiring_goal") or "")
            jd = str(step_info.get("jd_filename") or step_info.get("jd_url") or "")
            f_id = step_info.get("function_id")
            d_id = step_info.get("designation_id")

            new_proj = Project(
                project_name=p_name,
                organization_id=str(organization_id) if organization_id else None,
                created_by=str(user_id),
                hiring_goal=h_goal,
                jd_url=jd,
                function_id=str(f_id) if f_id else None,
                designation_id=str(d_id) if d_id else None,
                project_status={"status": "draft", "stage": request.current_step},
                project_details={
                    "project_mandate": p_mandate,
                    "is_draft": True,
                },
            )
            db.add(new_proj)
            await db.flush()
            project_id = new_proj.project_id

        # 2. Look up existing wizard session for (user_id, project_id)
        stmt = select(ProjectWizardSession).where(
            ProjectWizardSession.project_id == str(project_id),
            ProjectWizardSession.user_id == str(user_id),
        )
        res = await db.execute(stmt)
        session = res.scalars().first()

        final_route = request.last_route.replace("{projectId}", str(project_id))

        # Build / merge step_data
        if not session:
            initial_step_data = {}
            if request.step_key and request.step_payload:
                initial_step_data[request.step_key] = {
                    "route": request.step_payload.route or final_route,
                    "is_completed": request.step_payload.is_completed if request.step_payload.is_completed is not None else True,
                    "data": request.step_payload.data or {},
                }
            elif request.step_data:
                initial_step_data = dict(request.step_data)

            session = ProjectWizardSession(
                user_id=str(user_id),
                project_id=str(project_id),
                current_step=request.current_step,
                last_route=final_route,
                is_completed=False,
                step_data=initial_step_data,
            )
            db.add(session)
        else:
            session.current_step = request.current_step
            session.last_route = final_route

            merged = dict(session.step_data or {})
            if request.step_key and request.step_payload:
                merged[request.step_key] = {
                    "route": request.step_payload.route or final_route,
                    "is_completed": request.step_payload.is_completed if request.step_payload.is_completed is not None else True,
                    "data": request.step_payload.data or {},
                }
            elif request.step_data:
                merged.update(request.step_data)

            session.step_data = merged
            session.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(session)
        return session

    async def get_wizard_session(
        self, db: AsyncSession, project_id: UUID, user_id: UUID
    ) -> Optional[ProjectWizardSession]:
        stmt = select(ProjectWizardSession).where(
            ProjectWizardSession.project_id == str(project_id),
            ProjectWizardSession.user_id == str(user_id),
        )
        res = await db.execute(stmt)
        session = res.scalars().first()

        # If no session exists yet, but the project exists, auto-initialize session from project details
        if not session:
            p_stmt = select(Project).where(Project.project_id == str(project_id))
            p_res = await db.execute(p_stmt)
            proj = p_res.scalars().first()
            if proj:
                session = ProjectWizardSession(
                    user_id=str(user_id),
                    project_id=str(project_id),
                    current_step="step_1_project_details",
                    last_route=f"/project/{project_id}/assessment/assessment-types",
                    is_completed=False,
                    step_data={
                        "step_1_project_details": {
                            "route": "/project/create-project",
                            "is_completed": True,
                            "data": {
                                "project_name": proj.project_name,
                                "hiring_goal": proj.hiring_goal,
                                "jd_url": proj.jd_url,
                            },
                        }
                    },
                )
                db.add(session)
                await db.commit()
                await db.refresh(session)

        return session

    async def complete_wizard_session(
        self, db: AsyncSession, project_id: UUID, user_id: UUID
    ) -> Optional[ProjectWizardSession]:
        session = await self.get_wizard_session(db, project_id, user_id)
        if session:
            session.is_completed = True
            session.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(session)
        return session

    async def delete_wizard_session(
        self, db: AsyncSession, project_id: UUID, user_id: UUID
    ) -> bool:
        session = await self.get_wizard_session(db, project_id, user_id)
        if session:
            await db.delete(session)
            await db.commit()
            return True
        return False


def get_project_wizard_service() -> ProjectWizardService:
    return ProjectWizardService()
