import json
import secrets

from fastapi import Depends
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio.session import AsyncSession

from core.exception import BadRequestException
from modules.assessment_attempt.evaluation_service import ExamEvaluationSerice, get_exam_evaluation_service
from modules.assessment.improvement_roadmap.prompt import (
    IMPROVEMENT_ROADMAP_GENERATION_SYSTEM_INSTRUCTION,
)
from modules.assessment.improvement_roadmap.schema import (
    GenerateImprovementRoadmap,
)
from modules.roadmap_learning_assessment.schema import RoadmapGenerationPromptResponse
from modules.thread.model import ChatThread
from modules.thread.schema import ChatResponse, RoadmapAgentChatRequest
from modules.thread.service import ThreadService, get_thread_service
from modules.user.model import UserDetails
from shared.db.dependencies import get_db
from shared.llm.gemini import get_gemini_instance

TIME_COMMITMENTS = {
    "tier_1": {
        "id": 1,
        "name": "Crash",
        "duration": "1-2 Hours",
        "promise": "Zero to basics, fast",
        "max_total_subtopic_count": 7,
    },
    "tier_2": {
        "id": 2,
        "name": "Essentials",
        "duration": "1 Week",
        "promise": "Must-know core skills",
        "max_total_subtopic_count": 12,
    },
    "tier_3": {
        "id": 3,
        "name": "Practical",
        "duration": "1 Month",
        "promise": "Learn by doing",
        "max_total_subtopic_count": 20,
    },
    "tier_4": {
        "id": 4,
        "name": "Advanced",
        "duration": "3 Months",
        "promise": "Beyond the basics",
        "max_total_subtopic_count": 30,
    },
    "tier_5": {
        "id": 5,
        "name": "Pro",
        "duration": "6 Months or more",
        "promise": "Industry-ready mastery",
        "max_total_subtopic_count": 45,
    },
}


class ImprovementRoadmapGenerationService:
    def __init__(
        self,
        db: AsyncSession,
        exam_evaluation_service: ExamEvaluationSerice,
        thread_service: ThreadService,
    ) -> None:
        self.db = db
        self.exam_evaluation_service = exam_evaluation_service
        self.thread_service = thread_service

    async def generate_roadmap_from_assessment(
        self, user: UserDetails, payload: GenerateImprovementRoadmap
    ):
        try:
            allocation_id = payload.allocation_id
            organization_id = payload.organization_id
            team_id = payload.team_id
            project_id = payload.project_id

            # existing_thread = ChatThread.query.filter(
            #     ChatThread.thread_metadata["ref_assessment_id"].as_string()
            #     == str(assessment_id)
            # ).first()

            existing_thread = await self.db.scalar(
                select(ChatThread).where(
                    ChatThread.user_id == user.user_id,
                    ChatThread.thread_metadata["ref_assessment_id"].as_string()
                    == str(allocation_id)
                )
            )

            if existing_thread:
                raise BadRequestException("Roadmap for this assessment already present")

            data = await self.exam_evaluation_service.get_submission_by_allocation_id(
                user=user, allocation_id=allocation_id
            )
            prompt_response = self.generate_roadmap_generation_prompt(
                assessment_data=data
            )

            thread_title = f"{data['exam_name']}_Roadmap_{secrets.token_urlsafe(6)}"

            result = await self.initiate_roadmap_generation(
                user_id=user.user_id,
                orgnization_id=organization_id,
                team_id=team_id,
                project_id=project_id,
                assessment_id=allocation_id,
                data={**prompt_response, "thread_title": thread_title},
            )
            # logger.info({**data, **prompt_response, **result})
            response = {"t_id": result.thread_id}
            # response = {**result, **data, **prompt_response}
            return response
        except Exception as e:
            print(str(e))
            raise

    # def get_assessment_data(self, assessment_id: str) -> dict:
    #     URL = f"{os.getenv('SETUSCHOOL_API_ENDPOINT')}/get-detailed-submission/{assessment_id}"

    #     payload = {}
    #     headers = {
    #         "Accept": "*/*",
    #         "Accept-Language": "en-US,en;q=0.9",
    #         "Connection": "keep-alive",
    #         "Origin": "https://setuschool.com",
    #         "Referer": "https://setuschool.com/",
    #         "Sec-Fetch-Dest": "empty",
    #         "Sec-Fetch-Mode": "cors",
    #         "Sec-Fetch-Site": "same-site",
    #         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    #         "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    #         "sec-ch-ua-mobile": "?0",
    #         "sec-ch-ua-platform": '"Windows"',
    #     }

    #     response = requests.request("GET", URL, headers=headers, data=payload)
    #     print(response.text)
    #     response.raise_for_status()

    #     return response.json()

    def format_assessment_data_to_text(self, data: dict) -> str:
        """Formats the raw SetuSchool detailed submission response into a clean text profile."""
        exam_name = data.get("exam_name", "Assessment")
        submission = data.get("submission", {})
        obtained_marks = submission.get("obtained_marks", 0)
        total_marks = submission.get("total_marks", 0)
        total_questions = submission.get("total_questions", 0)

        correct_percentage = submission.get("correct_percentage")
        if correct_percentage is None:
            correct_percentage = submission.get("obtained_percentage", 0.0)

        try:
            if isinstance(correct_percentage, str):
                correct_percentage = float(correct_percentage.replace("%", "").strip())
        except Exception:
            correct_percentage = 0.0

        user_email = data.get("user_email", "")

        lines = []
        lines.append(f"Domain: {exam_name}")
        lines.append(
            f"Overall Score: {correct_percentage}% out of {total_questions} questions (obtained marks: {obtained_marks} out of {total_marks})"
        )
        if user_email:
            lines.append(f"Student Email: {user_email}")
        lines.append("")
        lines.append("Competencies:")

        capabilities = submission.get("capabilities", {})
        if isinstance(capabilities, dict):
            for idx, (cap_name, cap_data) in enumerate(capabilities.items(), 1):
                if not isinstance(cap_data, dict):
                    continue
                cap_score = cap_data.get("Percentage-Of-Correct-Answer", 0.0)
                cap_status = cap_data.get("Status", "N/A")
                lines.append(
                    f"{idx}. {cap_name} (Score: {cap_score}%, Status: {cap_status})"
                )

                sub_comps = cap_data.get("Sub-Competencies", {})
                if isinstance(sub_comps, dict):
                    for sub_name, sub_data in sub_comps.items():
                        if not isinstance(sub_data, dict):
                            continue
                        sub_score = sub_data.get("Percentage-Of-Correct-Answer", 0.0)
                        sub_status = sub_data.get("Status", "N/A")
                        lines.append(
                            f"   - {sub_name} (Score: {sub_score}%, Status: {sub_status})"
                        )
                elif isinstance(sub_comps, list):
                    for sub_item in sub_comps:
                        if isinstance(sub_item, dict):
                            sub_name = sub_item.get("name", "")
                            sub_score = sub_item.get(
                                "Percentage-Of-Correct-Answer", 0.0
                            )
                            sub_status = sub_item.get("Status", "N/A")
                            lines.append(
                                f"   - {sub_name} (Score: {sub_score}%, Status: {sub_status})"
                            )
                lines.append("")
        return "\n".join(lines)

    # @traceable(name="assessment_roadmap_prompt")
    def generate_roadmap_generation_prompt(self, assessment_data: dict) -> dict:
        try:
            llm = get_gemini_instance()
            structured_llm = llm.with_structured_output(
                RoadmapGenerationPromptResponse, strict=True
            )

            formatted_assessment_data = self.format_assessment_data_to_text(
                data=assessment_data
            )

            messages = [
                SystemMessage(
                    content=IMPROVEMENT_ROADMAP_GENERATION_SYSTEM_INSTRUCTION
                ),
                HumanMessage(
                    content=f"""
                    <assessment_result>
                    {formatted_assessment_data}
                    </assessment_result>
                    <time_commitment>
                    {json.dumps(TIME_COMMITMENTS)}
                    </time_commitment>
                    """
                ),
            ]

            response = structured_llm.invoke(messages)

            result = RoadmapGenerationPromptResponse.model_validate(response)

            return result.model_dump()
        except Exception as e:
            print(str(e))
            raise

    async def initiate_roadmap_generation(
        self,
        user_id: str,
        orgnization_id: str,
        team_id: str | None,
        project_id: str,
        assessment_id: str,
        data: dict,
    ) -> ChatResponse:
        try:
            payload = RoadmapAgentChatRequest(
                organization_id=orgnization_id,
                team_id=team_id,
                project_id=project_id,
                assessment_id=assessment_id,
                thread_title=data.get("thread_title", "Objective Assessment Roadmap"),
                message=data["prompt"],
                prompt={"text": data["prompt"], "edited": False},
                time_commitment=data["time_commitment"],
                generate_from_prompt=True,
            )

            response = await self.thread_service.start_roadmap_generation_thread(
                user_id=user_id, data=payload
            )
            return response
        except Exception as e:
            print(str(e))
            raise

    async def get_improvement_roadmaps(
        self, user_id: str, assessment_id: str
    ) -> dict:
        try:
            existing_thread = await self.db.scalar(
                select(ChatThread).where(
                    ChatThread.user_id == user_id,
                    ChatThread.thread_metadata["ref_assessment_id"].as_string()
                    == str(assessment_id)
                )
            )

            response = {}
            if existing_thread:
                response = {"t_id": existing_thread.thread_id}
            else:
                response = {"t_id": None}

            return response
        except Exception as e:
            print(str(e))
            raise

    # def create_new_user(user_email: str) -> UserDetails:
    #     try:
    #         new_user = UserDetails(user_email=user_email, email=user_email)
    #         db.session.add(new_user)
    #         db.session.commit()

    #         return new_user
    #     except Exception as e:
    #         print(str(e))
    #         raise


async def get_improvent_roadmap_generation_service(
    db: AsyncSession = Depends(get_db),
    exam_evaluation_service: ExamEvaluationSerice=Depends(get_exam_evaluation_service),
    thread_service: ThreadService = Depends(get_thread_service)
) -> ImprovementRoadmapGenerationService:
    return ImprovementRoadmapGenerationService(db=db, exam_evaluation_service=exam_evaluation_service, thread_service=thread_service)
