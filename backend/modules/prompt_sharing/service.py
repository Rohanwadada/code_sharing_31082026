import json
import logging
import io
import re
from typing import Optional, Dict, Any, Tuple
from pypdf import PdfReader
from langchain_core.messages import HumanMessage, SystemMessage

from shared.llm.gemini import get_gemini_instance, log_token_usage
from modules.prompt_sharing.prompt import ROADMAP_PROMPT_GENERATION_SYSTEM_PROMPT
from modules.prompt_sharing.schema import (
    GenerateRoadmapPromptResponse,
    CompetencyItem,
    SubCompetencyItem,
)

logger = logging.getLogger(__name__)


class PromptSharingService:
    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extract plain text from uploaded PDF bytes using pypdf."""
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text_pages = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_pages.append(extracted)
            return "\n".join(text_pages)
        except Exception as e:
            logger.error(f"Error extracting PDF text: {str(e)}")
            return ""

    def parse_llm_output(self, text: str) -> Dict[str, Any]:
        """Parse structured text output into sections: PROMPT, KEY_INSIGHT, COMPETENCIES, ASSESSMENT_SUMMARY."""
        prompt_val = ""
        key_insight_val = ""
        competencies_val = []
        assessment_summary_val = {}

        # Parse PROMPT:
        prompt_match = re.search(r'PROMPT:\s*(.*?)(?=\n\n[A-Z_]+:|\n[A-Z_]+:|$)', text, re.DOTALL)
        if prompt_match:
            prompt_val = prompt_match.group(1).strip()

        # Parse KEY_INSIGHT:
        insight_match = re.search(r'KEY_INSIGHT:\s*(.*?)(?=\n\n[A-Z_]+:|\n[A-Z_]+:|$)', text, re.DOTALL)
        if insight_match:
            key_insight_val = insight_match.group(1).strip()

        # Parse COMPETENCIES:
        comp_match = re.search(r'COMPETENCIES:\s*(.*?)(?=\n\n[A-Z_]+:|\n[A-Z_]+:|$)', text, re.DOTALL)
        if comp_match:
            comp_json_str = comp_match.group(1).strip()
            # Clean possible markdown code blocks ```json ... ```
            comp_json_str = re.sub(r'^```(json)?', '', comp_json_str, flags=re.MULTILINE)
            comp_json_str = re.sub(r'```$', '', comp_json_str, flags=re.MULTILINE).strip()
            try:
                raw_comps = json.loads(comp_json_str)
                if isinstance(raw_comps, list):
                    for item in raw_comps:
                        sub_comps = []
                        for sub in item.get("sub_competencies", []):
                            sub_comps.append(
                                SubCompetencyItem(
                                    name=sub.get("name", "General"),
                                    score=sub.get("score", 70),
                                    status=sub.get("status", "Can Do Better"),
                                )
                            )
                        competencies_val.append(
                            CompetencyItem(
                                name=item.get("name", "Core Competency"),
                                score=item.get("score", 70),
                                status=item.get("status", "Can Do Better"),
                                sub_competencies=sub_comps,
                            )
                        )
            except Exception as parse_err:
                logger.warning(f"Could not parse competencies JSON: {parse_err}")

        # Parse ASSESSMENT_SUMMARY:
        summary_match = re.search(r'ASSESSMENT_SUMMARY:\s*(.*?)$', text, re.DOTALL)
        if summary_match:
            summary_lines = summary_match.group(1).strip().split('\n')
            for line in summary_lines:
                if ':' in line:
                    k, v = line.split(':', 1)
                    assessment_summary_val[k.strip()] = v.strip()

        # Fallback if PROMPT section was not parsed cleanly
        if not prompt_val:
            prompt_val = text.strip()
            if "Please CREATE ROADMAP" not in prompt_val:
                prompt_val += " Please CREATE ROADMAP with recommended topics, resources, and milestones to help me upskill and improve."

        return {
            "prompt": prompt_val,
            "key_insight": key_insight_val,
            "competencies": competencies_val,
            "assessment_summary": assessment_summary_val,
            "raw_output": text,
        }

    async def generate_roadmap_prompt(
        self,
        who_is_this_for: str = "Organization",
        what_to_create: str = "roadmap",
        role_description_text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
    ) -> GenerateRoadmapPromptResponse:
        """Core service method to generate roadmap prompt using Gemini LLM."""
        input_details = []
        input_details.append(f"Target Audience: {who_is_this_for}")
        input_details.append(f"Creation Goal: {what_to_create}")

        if role_description_text and role_description_text.strip():
            input_details.append(f"Role / Job Description Text:\n{role_description_text.strip()}")

        if file_bytes:
            pdf_text = self.extract_text_from_pdf(file_bytes)
            if pdf_text:
                input_details.append(f"Extracted Document Text (from uploaded file):\n{pdf_text[:4000]}")

        user_content = "\n\n".join(input_details)
        if not user_content.strip():
            user_content = "Analyze default General Software Engineer role description and competencies."

        messages = [
            SystemMessage(content=ROADMAP_PROMPT_GENERATION_SYSTEM_PROMPT),
            HumanMessage(content=f"Please analyze the following details and generate the structured roadmap prompt:\n\n{user_content}"),
        ]

        llm = get_gemini_instance(model="gemini-2.5-flash", temperature=0.2)
        response = await llm.ainvoke(messages)
        log_token_usage(response, feature_name="Roadmap Prompt Generation")

        raw_text = response.content if isinstance(response.content, str) else str(response.content)
        parsed = self.parse_llm_output(raw_text)

        return GenerateRoadmapPromptResponse(
            prompt=parsed["prompt"],
            key_insight=parsed["key_insight"],
            competencies=parsed["competencies"],
            assessment_summary=parsed["assessment_summary"],
            raw_output=parsed["raw_output"],
        )


def get_prompt_sharing_service() -> PromptSharingService:
    return PromptSharingService()
