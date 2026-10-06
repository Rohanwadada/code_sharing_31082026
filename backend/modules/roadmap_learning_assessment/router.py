import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.security.dependencies import get_current_user
from modules.roadmap_content.service import (
    RoadmapContentService,
    get_roadmap_content_service,
)
from modules.roadmap_learning_assessment.schema import (
    AssessmentResponse,
    GenerateAssessmentForAssessmentNode,
    GenerateAssessmentForAssessmentNodeResponse,
)
from modules.roadmap_learning_assessment.service import (
    generate_final_assessment_for_roadmap,
    generate_learning_assessment_for_module,
)
from modules.user.model import UserDetails
from shared.db.dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning-assessment", tags=["roadmap learning assessment"])

"""
{
    "topics": [
        "Text Preprocessing Techniques",
        "Tokenization Strategies",
        "Embeddings and Vector Databases"
    ],
    "count": 20,
    "user_id": "rohan@setuschool.com",
    "roadmap_id": "62Ebb37E339440c0AE55d8F4378e4AC29C3A3f3504767DF7ce958B0123a87fd8",
    "roadmap_title": "LLM Engineer Proficiency Roadmap(Version 01)",
    "roadmap_desc": "LLM Engineer Proficiency Roadmap",
    "chapter_name": "1. Data Preparation & Representation",
    "module_name": "LLM Engineer Proficiency Roadmap(Version 01)",
    "difficulty": "moderate",
    "custom_settings": {},
    "title": "",
    "time_limit_mins": 0,
    "question_time_limit_secs": 0,
    "frontend_base_url": "http://localhost:5173"
}

{
    "topics": [
        "Role and Responsibilities of a Product Manager"
    ],
    "count": 5,
    "user_id": "rohan@setuschool.com",
    "roadmap_id": "f9E67a0ad45aE14d100dF1bAD682Cc4f10a3a6417E571782e17496bd156d5EC9",
    "roadmap_title": "Product Management Career Transformation(Version 01)",
    "roadmap_desc": "Product Management Career Transformation",
    "chapter_name": "1. Introduction to Product Management",
    "module_name": "Product Management Career Transformation(Version 01)",
    "difficulty": "moderate",
    "custom_settings": {},
    "title": "",
    "time_limit_mins": 0,
    "question_time_limit_secs": 0,
    "frontend_base_url": "http://localhost:5173"
}
-----
Actual --> In this module
Roadmao Title --> Roadmap Title
Topic  --> Chapter Name
Module --> Module 
Chapter --> Topic
"""


@router.post("/generate")
async def generate_learning_assessment_for_module_route(
    data: GenerateAssessmentForAssessmentNode,
    type: str = Query(...),
    user: UserDetails = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    roadmap_content_service: RoadmapContentService = Depends(
        get_roadmap_content_service
    ),
):    
    response = {}
    if type == 'final_assessment':
        response = await generate_final_assessment_for_roadmap(
            data=data, user_id=user.user_id, db=db, roadmap_content_service=roadmap_content_service
        )
    else:
        response = await generate_learning_assessment_for_module(
            data=data, user_id=user.user_id, db=db, roadmap_content_service=roadmap_content_service
        )
    title = response.get('title') or 'Assessment'
    url = response.get('assessment_url') or ''
    return GenerateAssessmentForAssessmentNodeResponse(status='success', assessment=AssessmentResponse(name=title, url=url))

