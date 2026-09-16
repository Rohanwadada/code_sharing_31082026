import io
import logging
from typing import Optional

from pypdf import PdfReader
from langchain_core.messages import HumanMessage, SystemMessage

from shared.llm.gemini import get_gemini_instance, log_token_usage
from modules.prompt_sharing.prompt import ROADMAP_PROMPT_GENERATION_SYSTEM_PROMPT
from modules.prompt_sharing.schema import GenerateRoadmapPromptResponse

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
        who_is_this_for: str = "Organization",
        what_to_create: str = "roadmap",
        role_description_text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
    ) -> GenerateRoadmapPromptResponse:
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
