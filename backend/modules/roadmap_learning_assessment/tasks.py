from fastapi import BackgroundTasks
from sqlalchemy import select
import logging

from core.database import AsyncSessionLocal
from core.exception import BadRequestException, ForbiddenException
from core.time import get_current_timestamp
from modules.roadmap.model import Roadmap
from modules.roadmap_content.service import RoadmapContentService
from modules.roadmap_learning_assessment.model import RoadmapLearningAssessment, RoadmapLearningAssessmentQuestions
from modules.roadmap_learning_assessment.schema import GenerateAssessmentForAssessmentNode
from modules.roadmap_learning_assessment.service import build_topic_tree, generate_final_assessment_of_roadmap_questions
from shared.celery import celery_app, _worker_loop
from shared.email.provider import SMTPEmailProvider
from shared.email.service import BackgroundEmailService
import uuid_utils as uuid
from core.config import settings

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def generate_final_assessment_for_roadmap_task(user_id: str,
data: GenerateAssessmentForAssessmentNode,
question_count: int = 50,):
    return _worker_loop.run_until_complete(generate_final_assessment_for_roadmap(
        user_id=user_id,
        data=data,
        question_count=question_count
    ))


async def generate_final_assessment_for_roadmap(
    user_id: str,
    data: GenerateAssessmentForAssessmentNode,
    question_count: int = 50,
):
    async with AsyncSessionLocal() as db:
        roadmap_content_service = RoadmapContentService(db=db, email_service=BackgroundEmailService(
            provider=SMTPEmailProvider(), background_tasks=BackgroundTasks()
        ))

        
        roadmap = await db.scalar(
            select(Roadmap).where(
                Roadmap.roadmap_id == data.roadmap_id, Roadmap.user_id == user_id
            )
        )
        if not roadmap:
            raise ForbiddenException("Access denied")
    
        existing_assessment = await db.scalar(select(RoadmapLearningAssessment).where(RoadmapLearningAssessment.roadmap_id == data.roadmap_id, RoadmapLearningAssessment.node_id == data.node_id))
    
        if existing_assessment:
            logger.info(f"Existing assessment present with assessment_id: {existing_assessment.assessment_id}")
            return {'title': existing_assessment.title, 'assessment_url': existing_assessment.assessment_url}
    
        roadmap_title = roadmap.title
        roadmap_graph = roadmap.roadmap_graph
    
        target_node = next(
            (node for node in roadmap_graph.get("nodes", []) if node["id"] == data.node_id),
            None,
        )
    
        if not target_node or target_node.get("parentId"):
            raise BadRequestException("Invalid assessment node")
    
        modules_input = build_topic_tree(
            roadmap_graph.get("nodes", []), roadmap_graph.get("edges", [])
        )
    
        (
            questions,
            is_fallback,
            warning_msg,
        ) = await generate_final_assessment_of_roadmap_questions(
            roadmap_title=roadmap_title, modules_input=modules_input, count=question_count
        )
    
        assessment_id = str(uuid.uuid4())
        assessment_url = f"{settings.site_base_url}/assessment/roadmap-learning-assessment/{assessment_id}?r={data.roadmap_id}&n={data.node_id}"
        excel_export_url = f"/api/quizzes/{assessment_id}/export-excel"
    
        quiz = RoadmapLearningAssessment(
            assessment_id=assessment_id,
            title=f"{roadmap_title} - Final Assessment",
            roadmap_id=data.roadmap_id,
            node_id=data.node_id,
            created_by=user_id,
            # time_limit_mins=payload.time_limit_mins or 0,
            # question_time_limit_secs=payload.question_time_limit_secs or 0
            duration=len(questions),
            organization_id=data.organization_id,
            assessment_url=assessment_url,
            excel_export_url=excel_export_url,
            assessment_details={"total_questions": len(questions)},
        )
        db.add(quiz)
        await db.flush()
    
        formatted_questions = []
    
        for q_item in questions:
            options = q_item.get("options", [])
            question = RoadmapLearningAssessmentQuestions(
                assessment_id=quiz.assessment_id,
                question_text=q_item.get("question", ""),
                option_1=options[0] if 0 <= 0 < len(options) else None,
                option_2=options[1] if 0 <= 1 < len(options) else None,
                option_3=options[2] if 0 <= 2 < len(options) else None,
                option_4=options[3] if 0 <= 3 < len(options) else None,
                code_snippets=str(q_item.get("code_snippet") or "null"),
                hints_text=str(q_item.get("hints_text") or "null"),
                correct_option_text=q_item.get("answer"),
                topic=q_item.get("topic", None),
                subtopic=q_item.get("subtopic", None),
                solution_explanation=str(
                    q_item.get("solution_explanation")
                    or f"The correct option is '{q_item.get('answer')}'"
                ),
                marks=1,
                source_of_question="ai-generated",
                question_status="active",
                question_details={},
                organization_id=data.organization_id,
                created_by=user_id,
            )
            db.add(question)
            await db.flush()
    
            formatted_questions.append(question.to_dict())
    
        await db.commit()
    
        response = {
            "status": "success",
            "assessment_id": quiz.assessment_id,
            "title": quiz.title,
            "roadmap_id": quiz.roadmap_id,
            "created_by": quiz.created_by,
            "total_questions": len(formatted_questions),
            "assessment_url": assessment_url,
            "excel_export_url": excel_export_url,
            "is_fallback": is_fallback,
            "warning": warning_msg,
            "questions": formatted_questions,
        }
    
        status = response.get("status", None)
    
        if status == "success":
            node_content = {
                "title": response["title"],
                "description": response["title"],
                "links": [],
                "assessment": {"id": response["assessment_id"]},
                "created_at": get_current_timestamp().isoformat(),
                "generation_type": "ai",
            }
            await roadmap_content_service.update_node_content(
                user_id=user_id,
                organization_id=data.organization_id,
                team_id=data.team_id,
                roadmap_id=data.roadmap_id,
                node_id=data.node_id,
                new_content=node_content,
            )
    
        return response

