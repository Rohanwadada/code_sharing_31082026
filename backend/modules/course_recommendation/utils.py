import json
import logging

from langchain_core.messages import SystemMessage
from langchain_core.messages.human import HumanMessage

from modules.course_recommendation.prompt import (
    MAX_MUTUAL_COURSE_COVERAGE_SYSTEM_PROMPT,
)
from core.exception import BadRequestException
from shared.llm.gemini import get_gemini_instance, log_token_usage
import re
import chromadb
from sentence_transformers import SentenceTransformer, CrossEncoder


logger = logging.getLogger(__name__)

chroma_client = ""
embedding_model = ""
reranker = ""
# chroma_client = chromadb.PersistentClient(path="./chroma-db-5")
# embedding_model = SentenceTransformer(
#     "nomic-ai/nomic-embed-text-v1.5", trust_remote_code=True
# )
# reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

QUERY_PREFIX = "search_query: "
DOC_PREFIX = "search_document: "


def embed_text(text: str, task_type: str = "document"):
    """
    task_type: 'document' for indexing, 'query' for searching
    """
    try:
        # Prepend the required Nomic instruction
        if task_type == "query":
            text_to_embed = QUERY_PREFIX + text
        else:
            text_to_embed = DOC_PREFIX + text

        # Nomic v1.5 specific: matryoshka_dim is optional but good for performance if needed
        # standard encoding:
        return embedding_model.encode(text_to_embed, convert_to_numpy=True).tolist()

    except Exception as e:
        logger.error(f"Error in embedding. Error : {str(e)}")
        raise


def get_course_coverage(input_data):
    try:
        logger.info("[LLM CALL]: making course coverage LLM call")
        llm = get_gemini_instance()

        # input prompt
        roadmap_name = input_data["roadmap_name"]
        courses = input_data["courses"]
        roadmap_chapters = parse_chapters_from_dsl(input_data["roadmap_dsl"])
        if len(roadmap_chapters) == 0:
            raise BadRequestException("No chapter found in roadmap")
        course_text = "\n\n".join(
            f"Course ID: {c['id']}\nCourse Content:\n{c['content']}" for c in courses
        )
        human_message = f"""
        roadmap_name: {roadmap_name}
        number of chapters: {len(roadmap_chapters)}
        \nchapters (indexed in order):
        {json.dumps(roadmap_chapters)}
        \nCourses:
        {course_text}
        """

        # logger.info(f'[HUMAN MESSAGE]: {human_message}')
        messages = [
            SystemMessage(content=MAX_MUTUAL_COURSE_COVERAGE_SYSTEM_PROMPT),
            HumanMessage(content=human_message),
        ]
        response = llm.invoke(messages)
        log_token_usage(response, "Course Recommendation Coverage")
        # logger.info(f"[RESPONSE]: {response}")
        result = json.loads(response.content.strip("`").lstrip("json").strip())  # type: ignore
        logger.info(f"[RESPONSE]: {result}")
        usage_metadata = response.usage_metadata
        return result, roadmap_chapters, usage_metadata
    except Exception as e:
        logger.error(f"Error in getting course coverage: {str(e)}")
        raise


def parse_chapters_from_dsl(roadmap_dsl: str) -> list[str]:
    """Extract roadmap chapters: lines starting with `-`. Remove trailing [numbers]. Preserve order."""
    chapters = []
    for line in roadmap_dsl.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("-"):
            chapter_text = s.lstrip("-").strip()
            if chapter_text:
                # Remove trailing bracketed number patterns: [1], [2], [1 or 2], etc.
                chapter_text = re.sub(r"\s*\[[^\]]*\]\s*$", "", chapter_text)
                chapters.append(chapter_text)
    return chapters


def calculate_course_coverage(coverage_result: dict, total_chapters: int):
    courses = coverage_result["results"]

    # 1. Sort by coverage size in descending order
    courses_sorted = sorted(
        courses, key=lambda c: len(c["chapters_covered"]), reverse=True
    )

    covered_global = set()  # tracks chapters already covered by previous courses
    final_results = []

    for course in courses_sorted:
        course_id = course["course_id"]
        covered_list = course["chapters_covered"]
        covered_set = set(covered_list)

        # Find new chapters this course contributes
        new_coverage = covered_set - covered_global

        if not new_coverage:
            # Course adds no new unique chapters → skip
            continue

        # Add newly covered chapters to the global set
        covered_global.update(new_coverage)

        # Compute percentage
        coverage_percentage = (len(new_coverage) / total_chapters) * 100

        final_results.append(
            {
                "course_id": course_id,
                "effective_chapters_contributed": sorted(new_coverage),
                "actual_chapters_contributed": sorted(covered_list),
                "effective_contribution_count": len(new_coverage),
                "actual_contribution_count": len(covered_list),
                "coverage_percentage": round(coverage_percentage, 2),
            }
        )

    return {
        "total_chapters": total_chapters,
        "total_covered": len(covered_global),
        "coverage_percentage_overall": round(
            len(covered_global) / total_chapters * 100, 2
        ),
        "courses": final_results,
    }
