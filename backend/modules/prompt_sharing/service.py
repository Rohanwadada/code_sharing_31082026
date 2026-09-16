import io
import json
import logging
from typing import Optional

from pypdf import PdfReader
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.llm.gemini import get_gemini_instance, log_token_usage
from modules.prompt_sharing.prompt import ROADMAP_PROMPT_GENERATION_SYSTEM_PROMPT
from modules.prompt_sharing.schema import GenerateRoadmapPromptResponse
from modules.project.model import Project

logger = logging.getLogger(__name__)

FALLBACK_SUFFIX = " Please CREATE ROADMAP with recommended topics, resources, and milestones to help me upskill and improve."


def _extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(
            page.extract_text() for page in reader.pages if page.extract_text()
        )
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        return ""


class PromptSharingService:
    async def generate_roadmap_prompt(
        self,
        db: Optional[AsyncSession] = None,
        who_is_this_for: str = "Organization",
        what_to_create: str = "roadmap",
        role_description_text: Optional[str] = None,
        project_id: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
    ) -> GenerateRoadmapPromptResponse:
        # If role description is not provided and project_id is given, load from Project table
        if (not role_description_text or not role_description_text.strip()) and project_id and db:
            try:
                stmt = select(Project).where(Project.project_id == project_id)
                res = await db.execute(stmt)
                proj = res.scalars().first()
                if proj:
                    info_parts = []
                    if proj.project_name:
                        info_parts.append(f"Role / Project Name: {proj.project_name}")
                    if proj.hiring_goal:
                        info_parts.append(f"Hiring Goal / Objective: {proj.hiring_goal}")
                    if proj.project_details and isinstance(proj.project_details, dict):
                        jd_data = proj.project_details.get("jd_data")
                        if jd_data:
                            if isinstance(jd_data, dict):
                                info_parts.append(f"Job Description Details: {json.dumps(jd_data)}")
                            else:
                                info_parts.append(f"Job Description: {str(jd_data)}")
                    if info_parts:
                        role_description_text = "\n".join(info_parts)
            except Exception as e:
                logger.warning("Failed to fetch project details for prompt generation: %s", e)

        # Build user input
        parts = [
            f"Target: {who_is_this_for}",
            f"Goal: {what_to_create}",
        ]
        if role_description_text and role_description_text.strip():
            parts.append(role_description_text.strip())
        if file_bytes:
            pdf_text = _extract_pdf_text(file_bytes)
            if pdf_text:
                parts.append(pdf_text[:4000])

        user_content = "\n\n".join(parts)

        messages = [
            SystemMessage(content=ROADMAP_PROMPT_GENERATION_SYSTEM_PROMPT),
            HumanMessage(content=user_content),
        ]

        llm = get_gemini_instance(model="gemini-2.5-flash", temperature=0.2)
        response = await llm.ainvoke(messages)
        log_token_usage(response, feature_name="Roadmap Prompt Generation")

        generated = response.content.strip() if isinstance(response.content, str) else ""

        # Guarantee the mandatory ending phrase exists
        if "CREATE ROADMAP" not in generated:
            generated += FALLBACK_SUFFIX

        return GenerateRoadmapPromptResponse(prompt=generated)


def get_prompt_sharing_service() -> PromptSharingService:
    return PromptSharingService()

