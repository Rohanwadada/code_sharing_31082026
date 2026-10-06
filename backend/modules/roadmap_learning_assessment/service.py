import asyncio
import json
import logging
import random
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Tuple

import uuid_utils as uuid
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio.session import AsyncSession

from core.config import settings
from core.exception import BadRequestException, ForbiddenException, NotFoundException
from core.time import get_current_timestamp
from modules.roadmap.model import Roadmap, UserRoadmap
from modules.roadmap_content.service import RoadmapContentService
from modules.roadmap_learning_assessment.model import (
    RoadmapLearningAssessment,
    RoadmapLearningAssessmentQuestions,
)
from modules.roadmap_learning_assessment.prompt import (
    CODING_QUESTION_ADDENDUM_PROMPT,
    FINAL_ROADMAP_CODING_QUESTION_ADDENDUM_PROMPT,
    FINAL_ROADMAP_QUIZ_SYSTEM_INSTRUCTION,
    QUIZ_GENERATION_SYSTEM_INSTRUCTION,
)
from modules.roadmap_learning_assessment.schema import (
    GenerateAssessmentForAssessmentNode,
    QuizAutoGenerateRequest,
)
from shared.llm.gemini import get_gemini_instance, log_token_usage

from langsmith import traceable


logger = logging.getLogger(__name__)


async def generate_learning_assessment_for_module(
    data: GenerateAssessmentForAssessmentNode,
    user_id: str,
    db: AsyncSession,
    roadmap_content_service: RoadmapContentService,
):
    roadmap = await db.scalar(
        select(Roadmap).where(
            Roadmap.roadmap_id == data.roadmap_id, Roadmap.user_id == user_id
        )
    )
    if not roadmap:
        roadmap = await db.scalar(
            select(Roadmap).where(Roadmap.roadmap_id == data.roadmap_id)
        )

    if not roadmap:
        raise ForbiddenException("Access denied")

    existing_assessment = await db.scalar(select(RoadmapLearningAssessment).where(RoadmapLearningAssessment.roadmap_id == data.roadmap_id, RoadmapLearningAssessment.node_id == data.node_id))

    if existing_assessment:
        logger.info(f"Existing assessment present with assessment_id: {existing_assessment.assessment_id}")
        return {'title': existing_assessment.title, 'assessment_url': existing_assessment.assessment_url}

    roadmap_graph = roadmap.roadmap_graph
    roadmap_nodes = roadmap_graph["nodes"]
    roadmap_edges = roadmap_graph["edges"]

    roadmap_content = roadmap.roadmap_content

    target_node = next(
        (node for node in roadmap_nodes if node.get("id") == data.node_id), None
    )

    if (
        not target_node
        or target_node["type"] != "assignmentNode"
        or target_node["parentId"] != data.module_id
    ):
        raise BadRequestException("Invalid node")

    target_module = next(
        (node for node in roadmap_nodes if node.get("id") == data.module_id), None
    )

    if not target_module or target_module["type"] != "subtopicGroup":
        raise BadRequestException("Invalid node")

    module_chapter_nodes = [
        node
        for node in roadmap_nodes
        if node.get("parentId", None) == data.module_id and node["type"] == "subtopic"
    ]

    target_topic_node = find_connected_node(
        roadmap_nodes, roadmap_edges, data.module_id, ["topic", "topicGroup"]
    )

    if not target_topic_node or target_topic_node["type"] not in [
        "topic",
        "topicGroup",
    ]:
        raise BadRequestException("Invalid node")

    roadmap_title = roadmap.title
    roadmap_description = roadmap.description
    serial_number, module_name = get_destructured_module_name(target_module["data"]["label"])
    topic_name = target_topic_node["data"]["label"]
    target_chapter_node_names = [node["data"]["label"] for node in module_chapter_nodes]
    target_chapter_node_contents = [
        roadmap_content.get(node["id"], {}).get("description", "")
        for node in module_chapter_nodes
    ]

    payload = QuizAutoGenerateRequest(
        roadmap_id=data.roadmap_id,
        node_id=data.node_id,
        roadmap_title=roadmap_title,
        roadmap_desc=roadmap_description,
        chapter_name=topic_name,
        module_name=module_name,
        topics=target_chapter_node_names,
        chapter_content=target_chapter_node_contents,
        count=20,
        difficulty="moderate",
        title=f"Smash it - {serial_number}",
        organization_id=data.organization_id,
    )

    response = await generate_and_save_quiz(payload=payload, user_id=user_id, db=db)

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

@traceable(
    name="Generate Final Assessment for Roadmap",
    )
async def generate_final_assessment_for_roadmap(
    user_id: str,
    data: GenerateAssessmentForAssessmentNode,
    db: AsyncSession,
    roadmap_content_service: RoadmapContentService,
    question_count: int = 50,
):
    roadmap = await db.scalar(
        select(Roadmap).where(
            Roadmap.roadmap_id == data.roadmap_id, Roadmap.user_id == user_id
        )
    )
    if not roadmap:
        roadmap = await db.scalar(
            select(Roadmap).where(Roadmap.roadmap_id == data.roadmap_id)
        )
    if not roadmap:
        raise ForbiddenException("Access denied")

    existing_assessment = await db.scalar(
        select(RoadmapLearningAssessment).where(
            RoadmapLearningAssessment.roadmap_id == data.roadmap_id,
            RoadmapLearningAssessment.node_id == data.node_id,
        )
    )

    if existing_assessment:
        logger.info(
            f"Existing assessment present with assessment_id: {existing_assessment.assessment_id}"
        )
        return {
            "title": existing_assessment.title,
            "assessment_url": existing_assessment.assessment_url,
        }

    roadmap_title = roadmap.title or "Roadmap"
    roadmap_graph = roadmap.roadmap_graph or {}

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
    org_id = (
        str(data.organization_id)
        if data.organization_id and str(data.organization_id).strip()
        else None
    )

    assessment_url = f"{settings.site_base_url}/assessment/roadmap-learning-assessment/{assessment_id}?r={data.roadmap_id}&n={data.node_id}"
    excel_export_url = f"/api/quizzes/{assessment_id}/export-excel"

    quiz = RoadmapLearningAssessment(
        assessment_id=assessment_id,
        title=f"{roadmap_title} - Final Assessment",
        roadmap_id=data.roadmap_id,
        node_id=data.node_id,
        created_by=user_id,
        duration=len(questions),
        organization_id=org_id,
        assessment_url=assessment_url,
        excel_export_url=excel_export_url,
        assessment_details={"total_questions": len(questions)},
    )
    db.add(quiz)
    await db.flush()

    formatted_questions = []

    for q_item in questions:
        options = q_item.get("options", [])
        raw_code = q_item.get("code_snippet") or q_item.get("code_snippets")
        raw_hint = q_item.get("hints_text")
        code_snip_val = (
            str(raw_code).strip()
            if (raw_code and str(raw_code).strip().lower() not in ["null", "none", "nan", "undefined", ""])
            else None
        )
        hint_val = (
            str(raw_hint).strip()
            if (raw_hint and str(raw_hint).strip().lower() not in ["null", "none", "nan", "undefined", ""])
            else None
        )

        question = RoadmapLearningAssessmentQuestions(
            assessment_id=quiz.assessment_id,
            question_text=q_item.get("question", ""),
            option_1=options[0] if 0 < len(options) else None,
            option_2=options[1] if 1 < len(options) else None,
            option_3=options[2] if 2 < len(options) else None,
            option_4=options[3] if 3 < len(options) else None,
            code_snippets=code_snip_val,
            hints_text=hint_val,
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
            organization_id=org_id,
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

    try:
        node_content = {
            "title": response["title"],
            "description": response["title"],
            "links": [],
            "assessment": {"id": response["assessment_id"], "name": response["title"], "url": response["assessment_url"]},
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
    except Exception as e:
        logger.warning(f"Could not update node content: {e}")

    return response


async def generate_and_save_quiz(
    payload: QuizAutoGenerateRequest, user_id: str, db: AsyncSession
):
    """Unified API: Generates AI questions, saves Quiz & Questions to DB, creates Exam & Excel URLs, saves URLs in DB."""
    try:
        selected_topics = payload.topics or []  # chapter names
        roadmap_id = payload.roadmap_id
        node_id = payload.node_id
        roadmap_title = payload.roadmap_title or "General Roadmap"
        chapter_name = payload.chapter_name or "General Chapter"
        module_name = payload.module_name or "General Module"
        title = payload.title or f"{chapter_name} Quiz"
        frontend_base_url = (settings.site_base_url).rstrip("/")

        # rm_obj = await db.scalar(select(Roadmap).where(Roadmap.roadmap_id == payload.roadmap_id, Roadmap.user_id == user_id))

        # if not roadmap_id:
        #     raise ForbiddenException("Access denied")

        # # Calculate count mirroring QuizAdmin's autoSetQuestionCount rules
        # count = calculate_smart_count(selected_topics, payload.count, rm_obj)

        questions, is_fallback, warning_msg = generate_quiz_questions(
            selected_topics=selected_topics,
            count=payload.count,
            roadmap_title=roadmap_title,
            chapter_name=chapter_name,
            module_name=module_name,
            chapter_content=payload.chapter_content,
        )

        assessment_id = str(uuid.uuid4())
        assessment_url = f"{frontend_base_url}/assessment/roadmap-learning-assessment/{assessment_id}?r={roadmap_id}&n={node_id}"
        excel_export_url = f"/api/quizzes/{assessment_id}/export-excel"

        quiz = RoadmapLearningAssessment(
            assessment_id=assessment_id,
            title=title,
            roadmap_id=roadmap_id,
            node_id=node_id,
            created_by=user_id,
            # time_limit_mins=payload.time_limit_mins or 0,
            # question_time_limit_secs=payload.question_time_limit_secs or 0
            duration=len(questions),
            organization_id=payload.organization_id,
            assessment_url=assessment_url,
            excel_export_url=excel_export_url,
            assessment_details={"total_questions": len(questions)},
        )
        db.add(quiz)
        await db.flush()

        formatted_questions = []

        for q_item in questions:
            options = q_item.get("options", [])
            raw_code = q_item.get("code_snippet") or q_item.get("code_snippets")
            raw_hint = q_item.get("hints_text")
            code_snip_val = (
                str(raw_code).strip()
                if (raw_code and str(raw_code).strip().lower() not in ["null", "none", "nan", "undefined", ""])
                else None
            )
            hint_val = (
                str(raw_hint).strip()
                if (raw_hint and str(raw_hint).strip().lower() not in ["null", "none", "nan", "undefined", ""])
                else None
            )

            question = RoadmapLearningAssessmentQuestions(
                assessment_id=quiz.assessment_id,
                question_text=q_item.get("question", ""),
                option_1=options[0] if 0 <= 0 < len(options) else None,
                option_2=options[1] if 0 <= 1 < len(options) else None,
                option_3=options[2] if 0 <= 2 < len(options) else None,
                option_4=options[3] if 0 <= 3 < len(options) else None,
                code_snippets=code_snip_val,
                hints_text=hint_val,
                correct_option_text=q_item.get("answer"),
                topic=q_item.get("topic", chapter_name),
                subtopic=q_item.get("subtopic", module_name),
                solution_explanation=str(
                    q_item.get("solution_explanation")
                    or f"The correct option is '{q_item.get('answer')}'"
                ),
                marks=1,
                source_of_question="ai-generated",
                question_status="active",
                question_details={},
                organization_id=payload.organization_id,
                created_by=user_id,
            )
            db.add(question)
            await db.flush()

            formatted_questions.append(question.to_dict())

            # formatted_questions.append({
            #     "id": str(question.id),
            #     "question": q_item.get("question", ""),
            #     "options": opts_list,
            #     "answer": correct_ans,
            #     "topic": q_item.get("topic", chapter_name),
            #     "subtopic": q_item.get("subtopic", chapter_name),
            #     "topic_priority": q_item.get("topic_priority", "Must Know"),
            #     "complexity": q_item.get("complexity", "moderate"),
            #     "chapter_name": chapter_name,
            #     "key_competency": "null",
            #     "sub_competency": "null",
            #     "code_snippet": str(q_item.get("code_snippet") or "null"),
            #     "hints_text": str(q_item.get("hints_text") or "null"),
            #     "solution_explanation": str(q_item.get("solution_explanation") or f"The correct option is '{correct_ans}'")
            # })

        await db.commit()

        return {
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
    except Exception as e:
        logger.error(f"Exception occcurred: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def partition_modules_for_batches(modules_input: list[dict], total_batches: int) -> list[list[dict]]:
    """
    Partitions the curriculum modules/chapters evenly across batches.
    - If num_modules >= total_batches: divides modules into balanced slices.
    - If num_modules < total_batches: divides chapters across batches so each batch focuses on a distinct curriculum slice.
    """
    if not modules_input or total_batches <= 1:
        return [modules_input] * total_batches

    num_mods = len(modules_input)
    if num_mods >= total_batches:
        batches = []
        k, m = divmod(num_mods, total_batches)
        start = 0
        for i in range(total_batches):
            end = start + k + (1 if i < m else 0)
            batches.append(modules_input[start:end])
            start = end
        return batches
    else:
        # Fewer modules than batches -> split chapters across batches
        all_flattened_chapters = []
        for mod in modules_input:
            mod_name = getattr(mod, "module_name", None) or (
                mod.get("module_name") if isinstance(mod, dict) else "Module"
            )
            chapters = getattr(mod, "chapters", None) or (
                mod.get("chapters", []) if isinstance(mod, dict) else []
            )
            for ch in chapters:
                all_flattened_chapters.append((mod_name, ch))

        if len(all_flattened_chapters) >= total_batches:
            k, m = divmod(len(all_flattened_chapters), total_batches)
            batches = []
            start = 0
            for i in range(total_batches):
                end = start + k + (1 if i < m else 0)
                batch_ch_items = all_flattened_chapters[start:end]
                mod_map = {}
                for m_name, ch_obj in batch_ch_items:
                    if m_name not in mod_map:
                        mod_map[m_name] = []
                    mod_map[m_name].append(ch_obj)
                batch_mods = [
                    {"module_name": m_name, "chapters": chs}
                    for m_name, chs in mod_map.items()
                ]
                batches.append(batch_mods)
                start = end
            return batches
        else:
            # Fallback: cycle through modules
            batches = []
            for i in range(total_batches):
                batches.append([modules_input[i % num_mods]])
            return batches


@traceable(name="Final Assessment Batch")
async def _generate_single_final_assessment_batch(
    roadmap_title: str,
    total_modules: int,
    total_chapters: int,
    curriculum_tree: str,
    batch_count: int,
    batch_idx: int,
    total_batches: int,
) -> tuple[list[dict], dict | None]:
    """Generates a small batch of questions (e.g. 10 questions) in parallel and logs token usage."""
    easy_count = max(1, int(round(batch_count * 0.30)))
    complex_count = max(1, int(round(batch_count * 0.30)))
    medium_count = max(1, batch_count - easy_count - complex_count)

    print(f"\n{'='*20} [BATCH {batch_idx}/{total_batches}] CURRICULUM TREE INPUT {'='*20}\n{curriculum_tree}\n{'='*65}\n")

    system_instruction = FINAL_ROADMAP_QUIZ_SYSTEM_INSTRUCTION.format(
        count=batch_count,
        roadmap_name=roadmap_title,
        total_modules=total_modules,
        total_chapters=total_chapters,
        curriculum_tree=curriculum_tree,
        easy_count=easy_count,
        medium_count=medium_count,
        complex_count=complex_count,
    )

    # Check if the curriculum covers technical/coding topics and enforce coding questions
    curriculum_topics = [line.strip() for line in curriculum_tree.split('\n') if line.strip()]
    if topic_is_coding_related(curriculum_topics):
        coding_count = max(1, round(batch_count * 0.45))
        mcq_count = max(0, batch_count - coding_count)
        coding_ratio_percent = round((coding_count / batch_count) * 100) if batch_count > 0 else 45
        coding_addendum = FINAL_ROADMAP_CODING_QUESTION_ADDENDUM_PROMPT.format(
            roadmap_name=roadmap_title,
            count=batch_count,
            coding_count=coding_count,
            mcq_count=mcq_count,
            coding_ratio_percent=coding_ratio_percent,
        )
        system_instruction = system_instruction + "\n\n" + coding_addendum
        logger.info(f"[Batch {batch_idx}/{total_batches}] Technical roadmap detected — enforcing {coding_count}/{batch_count} coding questions (~{coding_ratio_percent}%)")

    try:
        chat = get_gemini_instance()
        response = await chat.ainvoke(system_instruction)
        token_usage = log_token_usage(response, f"Final Roadmap Assessment [Batch {batch_idx}/{total_batches}]")
        content = response.content.strip() if hasattr(response, "content") else str(response).strip()
        parsed = clean_and_parse_json(content)

        # Support both {"questions": [...]} and [...] outputs
        if isinstance(parsed, dict):
            q_list = parsed.get("questions") or parsed.get("data") or parsed.get("items") or []
            if isinstance(q_list, list) and len(q_list) > 0:
                return q_list, token_usage
        elif isinstance(parsed, list) and len(parsed) > 0:
            return parsed, token_usage

        logger.warning(f"Final Assessment Batch {batch_idx}/{total_batches} returned non-list or empty response.")
        return [], token_usage
    except Exception as e:
        logger.error(f"Error in Final Assessment Batch {batch_idx}/{total_batches}: {e}", exc_info=True)
        return [], None


@traceable(name="Generate Final Assessment Questions")
async def generate_final_assessment_of_roadmap_questions(
    roadmap_title: str, modules_input: list[dict], count: int = 50
):

    curriculum_tree, all_modules, all_chapters, chapter_details = (
        format_curriculum_tree(modules_input)
    )

    # Split generation into chunks of 10 questions each
    batch_size = 10
    total_batches = (count + batch_size - 1) // batch_size
    module_partitions = partition_modules_for_batches(modules_input, total_batches)
    tasks = []

    print(f"\n=======================================================")
    print(f"[FINAL ROADMAP ASSESSMENT] Starting batch generation for {count} questions across {total_batches} parallel batches (batch_size={batch_size})...")
    print(f"[FINAL ROADMAP ASSESSMENT] Partitioned {len(modules_input)} total curriculum modules across {total_batches} dedicated batch streams.")
    print(f"=======================================================")

    for i in range(total_batches):
        batch_count = min(batch_size, count - (i * batch_size))
        batch_mods_subset = module_partitions[i]
        batch_tree, b_mods, b_chaps, _ = format_curriculum_tree(batch_mods_subset)

        tasks.append(
            _generate_single_final_assessment_batch(
                roadmap_title=roadmap_title,
                total_modules=len(b_mods) or 1,
                total_chapters=len(b_chaps) or 1,
                curriculum_tree=batch_tree,
                batch_count=batch_count,
                batch_idx=i + 1,
                total_batches=total_batches,
            )
        )

    # Execute all batches in parallel
    results = await asyncio.gather(*tasks)


    all_generated = []
    total_input_tokens = 0
    total_output_tokens = 0
    total_tokens = 0

    for batch_questions, token_usage in results:
        all_generated.extend(batch_questions)
        if token_usage:
            total_input_tokens += token_usage.get("input_tokens", 0)
            total_output_tokens += token_usage.get("output_tokens", 0)
            total_tokens += token_usage.get("total_tokens", 0)

    # Output aggregated token consumption in console
    print(f"\n=======================================================")
    print(f"[FINAL ROADMAP ASSESSMENT - TOKEN USAGE REPORT]")
    print(f"Roadmap Title:                {roadmap_title}")
    print(f"Total Questions Generated:    {len(all_generated)} / {count}")
    print(f"Total Input Tokens Consumed:  {total_input_tokens:,}")
    print(f"Total Output Tokens Consumed: {total_output_tokens:,}")
    print(f"Total Tokens Consumed:        {total_tokens:,}")
    print(f"=======================================================\n")

    easy_count = max(1, int(round(count * 0.30)))
    complex_count = max(1, int(round(count * 0.30)))
    formatted_questions = []

    # Map AI generated questions
    for i, q in enumerate(all_generated):
        if len(formatted_questions) >= count:
            break

        opts = list(q.get("options", []))
        ans = q.get("answer", "")
        if ans and ans not in opts:
            if len(opts) < 4:
                opts.append(ans)
            else:
                opts[0] = ans
        random.shuffle(opts)

        mod_tag = q.get("topic") or (
            all_modules[i % len(all_modules)] if all_modules else "General Module"
        )
        ch_tag = q.get("subtopic") or (
            all_chapters[i % len(all_chapters)] if all_chapters else "General Chapter"
        )
        c_val = q.get("complexity") or (
            "easy"
            if i < easy_count
            else ("complex" if i >= (count - complex_count) else "moderate")
        )
        p_val = q.get("topic_priority") or (
            "Must Know" if i < int(count * 0.7) else "Good to Know"
        )

        code_snip = q.get("code_snippet")
        if not code_snip or str(code_snip).strip().lower() in ["null", "none", "nan", "undefined", ""]:
            m = re.search(
                r"```(?:[a-zA-Z]*\n)?(.*?)```", str(q.get("question", "")), re.DOTALL
            )
            code_snip = m.group(1).strip() if m else None
        else:
            code_snip = str(code_snip).strip()

        raw_hint = q.get("hints_text")
        hint_val = (
            str(raw_hint).strip()
            if (raw_hint and str(raw_hint).strip().lower() not in ["null", "none", "nan", "undefined", ""])
            else None
        )

        sol_val = q.get("solution_explanation")
        if not sol_val or "This option is correct because" not in str(sol_val):
            sol_val = f"The correct option is '{ans}'. This option is correct because it directly satisfies the core architecture principles of {mod_tag}."

        formatted_questions.append(
            {
                "id": f"gen-{len(formatted_questions) + 1}",
                "question": q.get("question", ""),
                "options": opts,
                "answer": ans,
                "topic": mod_tag,
                "subtopic": ch_tag,
                "topic_priority": p_val,
                "complexity": c_val,
                "chapter_name": ch_tag,
                "key_competency": None,
                "sub_competency": None,
                "code_snippet": code_snip,
                "hints_text": hint_val,
                "solution_explanation": str(sol_val),
            }
        )

    # Top up remaining questions if AI generated fewer than requested count
    p_schedule, c_schedule = build_schedules(count)
    while len(formatted_questions) < count:
        idx = len(formatted_questions)
        topic_name = all_chapters[idx % len(all_chapters)] if all_chapters else "Core Architecture"
        mod_name = all_modules[idx % len(all_modules)] if all_modules else "System Design"
        c_val = c_schedule[idx] if idx < len(c_schedule) else "moderate"
        p_val = p_schedule[idx] if idx < len(p_schedule) else "Must Know"

        sample_code = f"def handle_{topic_name.lower().replace(' ', '_')}_pipeline(context: dict):\n    # Production execution strategy for {topic_name}\n    return execute_workflow(context)"
        opts = [
            f"Implement distributed idempotent processing and health monitoring for {topic_name}",
            f"Execute blocking sequential synchronous polling for {topic_name}",
            f"Disable retry handlers and execute unbuffered writes for {topic_name}",
            f"Rely on client-side caching without server validation for {topic_name}",
        ]
        ans = opts[0]
        random.shuffle(opts)

        formatted_questions.append(
            {
                "id": f"gen-{idx + 1}",
                "question": f"In an enterprise production workload, how should the engineering team architect {topic_name} to guarantee high availability and fault tolerance under high traffic?",
                "options": opts,
                "answer": ans,
                "topic": mod_name,
                "subtopic": topic_name,
                "topic_priority": p_val,
                "complexity": c_val,
                "chapter_name": topic_name,
                "key_competency": None,
                "sub_competency": None,
                "code_snippet": sample_code,
                "hints_text": f"Consider distributed resilience patterns for {topic_name}.",
                "solution_explanation": f"The correct option is '{ans}'. This option is correct because distributed idempotent processing guarantees fault tolerance and data consistency for {topic_name}.",
            }
        )

    is_fallback = (len(all_generated) < count)
    warning_msg = "Generated with hybrid fallback due to AI capacity limit." if is_fallback else None

    return formatted_questions, is_fallback, warning_msg


def calculate_smart_count(
    selected_topics: list, count_param: int, rm_obj: Roadmap
) -> int:
    if count_param and count_param > 0:
        return max(1, min(50, count_param))

    if rm_obj and rm_obj.roadmap_graph and "nodes" in rm_obj.roadmap_graph:
        nodes = rm_obj.roadmap_graph.get("nodes", [])
        topic_groups = {}
        module_groups = {}
        for n in nodes:
            ntype = n.get("type")
            nid = n.get("id")
            if ntype in ["topicGroup", "milestone", "week"]:
                topic_groups[nid] = []
            elif ntype in ["subtopicGroup", "topicGroup"]:
                module_groups[nid] = []

        for n in nodes:
            ntype = n.get("type")
            if ntype in ["subtopic", "topic", "learningAnchor", "checkpoint"]:
                nlabel = (
                    n.get("data", {}).get("label")
                    or n.get("name")
                    or n.get("title", "")
                )
                parent_id = n.get("parentId")
                if parent_id in module_groups and nlabel:
                    module_groups[parent_id].append(nlabel)
                if parent_id in topic_groups and nlabel:
                    topic_groups[parent_id].append(nlabel)

        # Rule 1: Whole Topic selected -> 25 questions default
        for t_chapters in topic_groups.values():
            if t_chapters and all(c in selected_topics for c in t_chapters):
                return 25

        # Rule 2: Whole Module selected -> 20 questions default
        for m_chapters in module_groups.values():
            if m_chapters and all(c in selected_topics for c in m_chapters):
                return 20

    # Rule 3: Individual Chapters selected -> 5 questions default
    num_topics = len(selected_topics)
    if num_topics >= 6:
        return 25
    elif num_topics >= 3:
        return 20
    return 5


def generate_quiz_questions(
    selected_topics: List[str],
    count: int,
    roadmap_title: str = "General Roadmap",
    chapter_name: str = "General Chapter",
    module_name: str = "General Module",
    topic_types: Dict[str, str] | None = None,
    topic_to_chapter_map: Dict[str, str] | None = None,
    chapter_content: list[str] = [],
) -> Tuple[List[Dict[str, Any]], bool, Any]:

    topics_to_use = selected_topics if selected_topics else ["General"]
    topic_types = topic_types or {}
    topic_to_chapter_map = topic_to_chapter_map or {}

    p_schedule, c_schedule = build_schedules(count)

    # Distribute count evenly across topics into small per-topic requests
    # Small requests (1-3 questions) prevent Gemini token truncation!
    num_topics = len(topics_to_use)
    base_per_topic = count // num_topics
    rem_per_topic = count % num_topics

    group_tasks = []
    for idx_t, t_item in enumerate(topics_to_use):
        val = base_per_topic + (1 if idx_t < rem_per_topic else 0)
        if val <= 0:
            continue

        easy_count = max(0, int(round(val * 0.3)))
        complex_count = max(0, int(round(val * 0.3)))
        medium_count = val - easy_count - complex_count

        topic_distribution_str = (
            f"Generate exactly {val} questions on the topic: '{t_item}'."
        )
        difficulty_distribution_str = (
            f"- Easy difficulty: {easy_count} questions\n"
            f"- Medium difficulty: {medium_count} questions\n"
            f"- Complex difficulty: {complex_count} questions"
        )

        if chapter_content and chapter_content[idx_t].strip():
            alignment_instructions = (
                f"Base questions on topic '{t_item}' using the Chapter Content text below:\n\n"
                f"--- BEGIN CHAPTER CONTENT ---\n{chapter_content[idx_t].strip()}\n--- END CHAPTER CONTENT ---\n"
            )
        else:
            alignment_instructions = f"Base questions on the topic '{t_item}' and standard production best practices."

        system_instruction = QUIZ_GENERATION_SYSTEM_INSTRUCTION.format(
            count=val,
            roadmap_name=roadmap_title,
            chapter_name=chapter_name,
            module_name=module_name,
            topic_distribution=topic_distribution_str,
            difficulty_distribution=difficulty_distribution_str,
            alignment_instructions=alignment_instructions,
            topics_list=t_item,
        )

        # logger.info(f"[SYSTEM INSTRUCTION]: {system_instruction}")

        if topic_is_coding_related([t_item]):
            coding_count = max(1, round(val * 0.5))
            mcq_count = max(0, val - coding_count)
            coding_ratio_percent = round((coding_count / val) * 100) if val > 0 else 50
            coding_addendum = CODING_QUESTION_ADDENDUM_PROMPT.format(
                count=val,
                coding_count=coding_count,
                mcq_count=mcq_count,
                coding_ratio_percent=coding_ratio_percent,
                topics_list=t_item,
            )
            system_instruction = system_instruction + "\n\n" + coding_addendum

        group_tasks.append((t_item, val, system_instruction))

    all_generated = []
    llm_success = True

    try:
        chat = get_gemini_instance()

        def _fetch_topic_questions(task_info):
            t_item, target_val, g_sys_inst = task_info
            q_list = []
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    response = chat.invoke(g_sys_inst)
                    log_token_usage(response, f"Roadmap Module Quiz ({t_item})")
                    content = response.content.strip()  # type: ignore
                    parsed = clean_and_parse_json(content)
                    if parsed and isinstance(parsed, list) and len(parsed) > 0:
                        q_list = parsed
                        break
                except Exception as llm_err:
                    print(
                        f"Attempt {attempt + 1}/{max_retries} Gemini AI error ({t_item}): {llm_err}"
                    )
            return t_item, q_list

        with ThreadPoolExecutor(max_workers=min(len(group_tasks), 5)) as executor:
            group_results = list(executor.map(_fetch_topic_questions, group_tasks))

        for t_item, questions_list in group_results:
            for q in questions_list:
                opts = list(q.get("options", []))
                ans = q.get("answer", "")
                if ans and ans not in opts:
                    if len(opts) < 4:
                        opts.append(ans)
                    else:
                        opts[0] = ans
                random.shuffle(opts)

                all_generated.append(
                    {
                        "question": q.get("question"),
                        "options": opts,
                        "answer": ans,
                        "topic": t_item,
                        "subtopic": t_item,
                        "code_snippet": q.get("code_snippet") or "null",
                        "hints_text": q.get("hints_text") or "null",
                        "solution_explanation": q.get("solution_explanation")
                        or f"The correct option is '{ans}'.",
                    }
                )

        if not all_generated:
            llm_success = False

    except Exception as e:
        print(f"Gemini AI initialization error: {e}")
        llm_success = False

    warning_msg = None
    if not llm_success:
        warning_msg = "Gemini AI Server is currently busy or rate-limited. Generated structured technical questions."

    formatted_questions = []

    # Map AI generated questions first
    for i, q in enumerate(all_generated):
        if len(formatted_questions) >= count:
            break
        p_val = p_schedule[i] if i < len(p_schedule) else "Must Know"
        c_val = c_schedule[i] if i < len(c_schedule) else "moderate"
        subtopic_val = q.get("topic") or topics_to_use[i % len(topics_to_use)]
        parent_chapter = topic_to_chapter_map.get(subtopic_val.strip()) or (
            chapter_name
            if (chapter_name and chapter_name != "General Chapter")
            else "Core Topic"
        )

        q_text = q.get("question", "")
        ans = q.get("answer", "")

        code_snip = q.get("code_snippet")
        if not code_snip or code_snip == "null" or code_snip is None:
            m = re.search(r"```(?:[a-zA-Z]*\n)?(.*?)```", q_text, re.DOTALL)
            code_snip = m.group(1).strip() if m else "NaN"

        hint_val = q.get("hints_text")
        if not hint_val or hint_val == "null":
            hint_val = (
                f"Consider key architectural principles of {subtopic_val}."
                if c_val == "complex"
                else "NaN"
            )

        sol_val = q.get("solution_explanation")
        if not sol_val or "This option is correct because" not in sol_val:
            sol_val = f"The correct option is '{ans}'. This option is correct because it directly addresses the core requirements and constraints of {subtopic_val}."

        formatted_questions.append(
            {
                "id": f"gen-{len(formatted_questions) + 1}",
                "question": q_text,
                "options": q["options"],
                "answer": ans,
                "topic": parent_chapter,
                "subtopic": subtopic_val,
                "topic_priority": p_val,
                "complexity": c_val,
                "chapter_name": parent_chapter,
                "key_competency": "null",
                "sub_competency": "null",
                "code_snippet": code_snip,
                "hints_text": hint_val,
                "solution_explanation": sol_val,
            }
        )

    # Top up remaining questions if AI generated fewer than requested count
    while len(formatted_questions) < count:
        idx = len(formatted_questions)
        topic = topics_to_use[idx % len(topics_to_use)]
        c_val = c_schedule[idx] if idx < len(c_schedule) else "moderate"
        p_val = p_schedule[idx] if idx < len(p_schedule) else "Must Know"
        parent_ch = topic_to_chapter_map.get(topic.strip()) or (
            chapter_name if chapter_name else "Core Topic"
        )

        sample_code = f"def handle_{topic.lower().replace(' ', '_')}_operation(payload: dict):\n    # Optimized handler for {topic}\n    return process_data(payload)"
        opts = [
            f"Asynchronous pipeline processing with indexed caching for {topic}",
            f"Sequential blocking file scans for {topic}",
            f"Unbuffered polling without index lookup for {topic}",
            f"Static DNS routing table updates for {topic}",
        ]
        ans = opts[0]
        random.shuffle(opts)

        formatted_questions.append(
            {
                "id": f"gen-{idx + 1}",
                "question": f"In a high-throughput production environment, an engineering team must evaluate trade-offs for {topic}. Which architecture strategy optimizes execution latency while satisfying strict SLA constraints?",
                "options": opts,
                "answer": ans,
                "topic": parent_ch,
                "subtopic": topic,
                "topic_priority": p_val,
                "complexity": c_val,
                "chapter_name": parent_ch,
                "key_competency": "null",
                "sub_competency": "null",
                "code_snippet": sample_code,
                "hints_text": f"Consider key architectural principles of {topic}.",
                "solution_explanation": f"The correct option is '{ans}'. This option is correct because async pipeline processing optimizes latency for {topic}.",
            }
        )

    return formatted_questions, (not llm_success), warning_msg


def build_topic_tree(nodes, edges):
    """
    Convert React Flow nodes/edges into:

    [
        {
            "module_name": "Topic 1",
            "chapters": [
                {
                    "chapter_name": "Module 1",
                    "subtopics": ["Subtopic 1", "Subtopic 2"]
                }
            ]
        }
    ]
    """

    # Convert nodes list into lookup by ID
    node_by_id = {node["id"]: node for node in nodes}

    # Find topic -> module relationships from edges
    topic_modules = {}

    for edge in edges:
        source_id = edge["source"]
        target_id = edge["target"]

        source = node_by_id.get(source_id)
        target = node_by_id.get(target_id)

        if not source or not target:
            continue

        # Adjust these type names if your ReactFlow types differ
        if (
            source["type"] in ["topic", "topicGroup"]
            and target["type"] == "subtopicGroup"
        ):
            topic_modules.setdefault(source_id, []).append(target_id)

    result = []

    for topic_id, module_ids in topic_modules.items():
        topic_node = node_by_id[topic_id]

        topic_name = topic_node["data"].get("label", topic_node["data"].get("name"))

        modules = []

        for module_id in module_ids:
            module_node = node_by_id[module_id]

            module_name = module_node["data"].get(
                "label", module_node["data"].get("name")
            )

            # Find subtopics whose parentId is this module
            subtopics = []

            for node in nodes:
                if node.get("parentId") == module_id and node["type"] == "subtopic":
                    subtopic_name = node["data"].get("label", node["data"].get("name"))

                    if subtopic_name is not None:
                        subtopics.append(subtopic_name)

            modules.append(
                {
                    "chapter_name": re.sub(r"^\d+\.\s*", "", module_name),
                    "subtopics": subtopics,
                }
            )

        result.append({"module_name": topic_name, "chapters": modules})

    return result


def format_curriculum_tree(
    modules_input: list[dict],
) -> Tuple[str, List[str], List[str], List[Dict[str, Any]]]:
    tree_lines = []
    all_modules = []
    all_chapters = []
    chapter_details = []

    for idx_m, mod in enumerate(modules_input, 1):
        mod_name = getattr(mod, "module_name", None) or (
            mod.get("module_name") if isinstance(mod, dict) else f"Module {idx_m}"
        )
        all_modules.append(mod_name)
        tree_lines.append(f"MODULE {idx_m}: {mod_name}")

        chapters = getattr(mod, "chapters", None) or (
            mod.get("chapters", []) if isinstance(mod, dict) else []
        )
        for ch in chapters:
            ch_name = getattr(ch, "chapter_name", None) or (
                ch.get("chapter_name") if isinstance(ch, dict) else "General Chapter"
            )
            subtopics = getattr(ch, "subtopics", None) or (
                ch.get("subtopics", []) if isinstance(ch, dict) else []
            )
            all_chapters.append(ch_name)
            chapter_details.append(
                {
                    "module_name": mod_name,
                    "chapter_name": ch_name,
                    "subtopics": subtopics,
                }
            )

            subtopics_str = ", ".join(subtopics) if subtopics else "General Concepts"
            tree_lines.append(f"  - Chapter: {ch_name}")
            tree_lines.append(f"    Subtopics: {subtopics_str}")

    curriculum_text = (
        "\n".join(tree_lines)
        if tree_lines
        else "MODULE 1: General Core Module\n  - Chapter: General Concepts"
    )
    return curriculum_text, all_modules, all_chapters, chapter_details


def build_schedules(count: int) -> Tuple[List[str], List[str]]:
    must_c = int(round(count * 0.70))
    good_c = int(round(count * 0.15))
    sug_c = count - must_c - good_c
    p_schedule = (
        (["Must Know"] * must_c)
        + (["Good to Know"] * good_c)
        + (["Suggested Learning"] * sug_c)
    )

    easy_c = int(round(count * 0.30))
    complex_c = int(round(count * 0.30))
    med_c = count - easy_c - complex_c
    c_schedule = (
        (["easy"] * easy_c) + (["moderate"] * med_c) + (["complex"] * complex_c)
    )

    return p_schedule, c_schedule


def topic_is_coding_related(topics_list: List[str]) -> bool:
    if not topics_list:
        return True
    coding_keywords = {
        "python",
        "js",
        "javascript",
        "ts",
        "typescript",
        "java",
        "c++",
        "cpp",
        "c#",
        "golang",
        "go",
        "sql",
        "react",
        "node",
        "express",
        "flask",
        "django",
        "api",
        "apis",
        "algorithm",
        "algorithms",
        "data structure",
        "data structures",
        "prompting",
        "prompt",
        "llm",
        "llms",
        "agent",
        "agents",
        "code",
        "coding",
        "query",
        "function",
        "class",
        "async",
        "concurrency",
        "refactoring",
        "git",
        "bash",
        "shell",
        "docker",
        "pandas",
        "numpy",
        "framework",
        "backend",
        "frontend",
        "vector",
        "json",
        "rest",
        "fastapi",
        "sqlalchemy",
        "pydantic",
        "microservice",
        "task",
        "tasks",
    }
    combined = " ".join(topics_list).lower()
    return any(kw in combined for kw in coding_keywords)


def clean_and_parse_json(content: str) -> List[Dict[str, Any]]:
    if not content:
        raise ValueError("Empty content")
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    try:
        return json.loads(content)
    except Exception:
        pass

    match = re.search(r"\[\s*\{.*\}\s*\]", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass

    return json.loads(content)


def find_connected_node(nodes, edges, node_id, target_node_types):
    for edge in edges:
        if edge["source"] == node_id:
            other_node_id = edge["target"]
        elif edge["target"] == node_id:
            other_node_id = edge["source"]
        else:
            continue

        node = next(
            (
                node
                for node in nodes
                if node["id"] == other_node_id and node["type"] in target_node_types
            ),
            None,
        )

        if node:
            return node

    return None


async def get_assessment_details(
    user_id: str,
    organization_id: str,
    roadmap_id: str,
    assessment_id: str,
    db: AsyncSession,
):
    assessment = await db.scalar(
        select(RoadmapLearningAssessment).where(
            RoadmapLearningAssessment.assessment_id == assessment_id,
            RoadmapLearningAssessment.roadmap_id == roadmap_id,
            RoadmapLearningAssessment.organization_id == organization_id,
        )
    )

    if not assessment:
        raise NotFoundException("Invalid assessment")

    user_roadmap = await db.scalar(
        select(UserRoadmap).where(
            UserRoadmap.roadmap_id == roadmap_id,
            UserRoadmap.user_id == user_id,
            UserRoadmap.status == "active",
        )
    )

    if not user_roadmap:
        raise ForbiddenException("Access denied!!")

    assessment_details = assessment.assessment_details or {}
    # assessment_questions = (await db.scalars(select(RoadmapLearningAssessmentQuestions).where(RoadmapLearningAssessmentQuestions.assessment_id == assessment_id))).all()

    total_questions = assessment_details["total_questions"]
    exam_duration = assessment.duration

    assessment_info = {
        "exam_name": assessment.title,
        "exam_type": assessment_details.get("exam_type", "MCQ"),
        "exam_status": assessment_details.get("exam_status", "active"),
        "exam_description": assessment_details.get("exam_description", "active"),
        "exam_instruction": [
            f"You have {total_questions} questions to complete in {exam_duration} minutes.",
            f"Complete the test in one attempt—start only when you can dedicate {exam_duration} minutes without interruptions.",
            " Think through the scenarios and choose the best options.",
            "Remember, it’s just a test—relax and enjoy the process!",
        ],
        "exam_duration": exam_duration,
        "appearence_limit": assessment_details.get("appearance_limit", 1),
        "number_of_competencies": 0,
        "number_of_total_question": total_questions,
        "allocation_type": {"mode": "static", "shuffle": True},
    }

    return assessment_info


def get_destructured_module_name(label: str):
    match = re.match(r"^(\d+)\.\s*(.*)$", label)

    serial_number, module_name = 0, ''
    if match:
        serial_number = int(match.group(1))
        module_name = match.group(2)

    return serial_number, module_name
    
""" def find_connected_node(nodes, edges, node_id, target_node_type):
    edge = next(
        (
            edge for edge in edges
            if edge["source"] == node_id or edge["target"] == node_id
        ),
        None
    )

    if not edge:
        return None

    other_node_id = (
        edge["target"]
        if edge["source"] == node_id
        else edge["source"]
    )

    return next(
        (
            node for node in nodes
            if node["id"] == other_node_id
            and node["type"] == target_node_type
        ),
        None
    ) """
