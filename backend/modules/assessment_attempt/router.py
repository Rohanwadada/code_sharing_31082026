"""
/user-result: user_email(can be found from token) : user_info, already given exam details
/get-exam/{assessment_id}: user_details from token,  assessment_id: assessment_details, instructions(static as of now)
/allocate-exam : user_email(can be found from token), assessment_id : questions with a strict format given by qverse team
/evaluate-exam: frontend will format the data: success response
/get-result, /get-summary-submission/{allocation_id}:  user_info(from token)
/get-detailed-submission/{allocation_id}: status

-----------
# Tables
- allocated_exams
- submissions

when calling /get-exam --> send identifier to know which assessment table to query, same for /allocate-exam

Allocation table should store the assessment table identifier along with question --> needed for evaluation because it needs which question table to query

get result and detailed result will only read from submission table

So only /get-exam and /allocate-exam only have to decide which assessment table to call and based on that it will be decided which question table to call

two type of assessment are there in system right now
- skill-gap assessment
- roadmap assessment

"""

from fastapi import APIRouter, Depends, Request

from core.security.dependencies import get_current_user
from modules.assessment_attempt.allocation_service import (
    ExamAllocationService,
    get_exam_allocation_service,
)
from modules.assessment_attempt.evaluation_service import (
    ExamEvaluationSerice,
    get_exam_evaluation_service,
)
from modules.assessment_attempt.exam_service import ExamService, get_exam_service
from modules.assessment_attempt.schema import (
    AllocateExam,
    EvaluateExamPayload,
    ExamDetails,
    ExamDetailsRequest,
)
from modules.user.model import UserDetails

router = APIRouter(prefix="/exam", tags=["exam"])


@router.post("/details")
async def get_exam_details_route(
    data: ExamDetailsRequest,
    user: UserDetails = Depends(get_current_user),
    exam_service: ExamService = Depends(get_exam_service),
) -> ExamDetails:
    response = await exam_service.get_exam_details(
        user=user,
        organization_id=data.organization_id,
        project_id=data.project_id,
        assessment_id=data.assessment_id,
        assessment_type=data.assessment_type,
        roadmap_id=data.roadmap_id,
    )

    return response


@router.post("/allocate")
async def allocate_exam_route(
    request: Request,
    data: AllocateExam,
    user: UserDetails = Depends(get_current_user),
    exam_allocation_service: ExamAllocationService = Depends(
        get_exam_allocation_service
    ),
):
    response = await exam_allocation_service.allocate_exam(
        user=user, data=data, user_agent_string=request.headers.get("user-agent", "")
    )

    return response


@router.post("/evaluate")
async def evaluate_exam_route(
    data: EvaluateExamPayload,
    user: UserDetails = Depends(get_current_user),
    exam_evaluation_service: ExamEvaluationSerice = Depends(
        get_exam_evaluation_service
    ),
):
    response = await exam_evaluation_service.evaluate_exam(user=user,  payload=data)

    return response


@router.get("/get-result/{allocation_id}")
async def get_exam_result(
    allocation_id: str,
    user: UserDetails = Depends(get_current_user),
    exam_evaluation_service: ExamEvaluationSerice = Depends(
        get_exam_evaluation_service
    ),
):
    response = await exam_evaluation_service.get_submission_by_allocation_id(
        user=user, allocation_id=allocation_id
    )

    return response


async def get_exam_detailed_result(): ...
