import logging
from typing import Any, Dict
from uuid import uuid4

from langchain_core.runnables import RunnableConfig
from sqlalchemy import select

from core.database import AsyncSessionLocal
from core.exception import AgentExecutionError, BadRequestException
from modules.doubt_solver_agent.state import DoubtSolverAgentState
from modules.roadmap.model import Roadmap

logger = logging.getLogger(__name__)


async def inject_context(
    state: DoubtSolverAgentState, config: RunnableConfig
) -> Dict[str, Any]:
    try:
        logger.info("Running inject context. . .")
        intents = state["message_intent"]
        updates = {}
        context = []
        for intent in intents[:2]:
            intent_context = None
            match intent:
                case "roadmap_or_chapter":
                    roadmap_id = config.get("configurable", {}).get("roadmap_id")
                    chapter_id = config.get("configurable", {}).get("chapter_id")
                    if not roadmap_id:
                        raise BadRequestException("roadmap not found")
                    intent_context = await get_roadmap_context(roadmap_id, chapter_id)
                case _:
                    intent_context = None
            if intent_context:
                context.append(intent_context)

        logger.info(f"Context: {context}")
        updates["context"] = context
        return updates
    except Exception as e:
        raise AgentExecutionError(
            message="Context injection failed",
            node="inject_context",
            message_id=str(uuid4()),
            original_error=str(e),
        ) from e


async def get_roadmap_context(roadmap_id: str, chapter_id: str | None = None):
    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"Roadmap ID: {roadmap_id}")
            roadmap = await db.scalar(
                select(Roadmap).where(Roadmap.roadmap_id == roadmap_id)
            )
            if not roadmap:
                raise BadRequestException("roadmap not found")

            context = f"""
    <roadmap_context>
    <roadmap_title>
    {roadmap.title}
    </roadmap_title>
    
    <structure_info>
    In roadmap_dsl, `#` denotes the `Title`\n`##` denotes `Topic`\nLine starting with `-` in dsl denotes the chapter in that Topic, here the actual content lives
    </structure_info>
    
    <roadmap_dsl>
    {roadmap.roadmap_metadata["roadmap_dsl"]["current"]["dsl"]}
    </roadmap_dsl>
    
    <roadmap_generation_prompt>
    {roadmap.roadmap_metadata["prompt"]}
    </roadmap_generation_prompt>
    </roadmap_context>
    """

            return context
        except Exception as e:
            logger.error(f"Error ocurred while getting roadmap context: {str(e)}")
            raise e


async def get_chapter_context(roadmap_id: str, chapter_id: str):
    async with AsyncSessionLocal() as db:
        try:
            roadmap = await db.scalar(
                select(Roadmap).where(Roadmap.roadmap_id == roadmap_id)
            )
            if not roadmap:
                raise BadRequestException("roadmap not found")

            context = f"""
    <roadmap_context>
    <roadmap_title>
    {roadmap.title}
    </roadmap_title>
    
    <structure_info>
    In roadmap_dsl, `#` denotes the `Title`\n`##` denotes `Topic`\nLine starting with `-` in dsl denotes the chapter in that Topic, here the actual content lives
    </structure_info>
    
    <roadmap_dsl>
    {roadmap.roadmap_metadata["roadmap_dsl"]["current"]["dsl"]}
    </roadmap_dsl>
    
    <roadmap_generation_prompt>
    {roadmap.roadmap_metadata["prompt"]}
    </roadmap_generation_prompt>
    </roadmap_context>
    """

            return context
        except Exception as e:
            logger.error(f"Error ocurred while getting roadmap context: {str(e)}")
            raise e


def get_platform_or_product_context():
    context = """
<platform_or_product_context>
# Platform
## Name: SETU
## Description: Your one stop solution for AI/ML and Data related learnings
## Site: https://www.setuschool.com
## Products
- Assesment: Asses your skills by SETU Assesment
- Daksh: Hiring platform to hire the best and cut the noise(https://dakshire.ai/)
- Shifu: Your personal learning coach(https://shifu.coach/)
## Links
- Main site: https://setuschool.com
- For enterprise: https://setuschool.com/for-enterprise-solution
- About: https://setuschool.com/about
- Privecy Policy: https://setuschool.com/privacy_policy
- Contact: https://setuschool.com/contact
- Terms and condition: https://setuschool.com/terms_condition
- Refund policy: https://setuschool.com/return_refund
</platform_or_product_context>
"""
    return context
