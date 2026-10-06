from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
import uuid_utils as uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.security.hashing import hash_entity
from core.time import get_current_timestamp
from modules.assessment.assessment_access.model import UserAssessmentAccess
from modules.assessment.assessment_access.schema import (
    AccessGrantItem,
    AccessGrantRequest,
    AccessGrantResponse,
)
from modules.assessment.model import AssessmentFormation, ProjectAssessmentMap
from modules.assessment_attempt.encryption import encrypt_allocation_id
from modules.assessment_attempt.model import AllocatedExams, Submissions
from modules.user.model import UserDetails
from shared.email.schema import EmailTemplate
from shared.email.service import BackgroundEmailService
from core.exception import BadRequestException
from core.config import settings


async def grant_assessment_access(
    db: AsyncSession, user: UserDetails, request: AccessGrantRequest, email_service: BackgroundEmailService
) -> AccessGrantResponse:
    """
    Grants access to specified candidate(s) for a particular assessment ID.
    Performs database insertion / updates into user_assessment_access table.
    """
    granted_count = 0
    existing_count = 0
    access_records: List[AccessGrantItem] = []
    user_id = user.user_id

    assessment = await db.scalar(select(AssessmentFormation).where(AssessmentFormation.assessment_formation_id == request.assessment_id))
    
    if not assessment:
        raise BadRequestException("Invalid assessment")

    new_emails = []
    seen_candidate_emails = set()
    
    for candidate in request.candidates:
        email = candidate.email.strip()
        email_lower = email.lower()
        user_name = candidate.name
        
        if email_lower in seen_candidate_emails:
            continue
        seen_candidate_emails.add(email_lower)

        # Check existing access entry using limit(1) to avoid MultipleResultsFound
        access_res = await db.execute(
            select(UserAssessmentAccess)
            .where(
                UserAssessmentAccess.assessment_id == str(request.assessment_id),
                func.lower(func.trim(UserAssessmentAccess.user_email)) == email_lower
            )
            .order_by(UserAssessmentAccess.granted_at.desc())
            .limit(1)
        )
        access_entry = access_res.scalars().first()

        now = get_current_timestamp()
        if access_entry:
            access_entry.access_status = "GRANTED"
            access_entry.granted_at = now
            access_entry.granted_by = user_id or access_entry.granted_by
            if user_name:
                access_entry.user_name = user_name
            existing_count += 1
            record = access_entry
        else:
            new_access_id = str(uuid.uuid4())
            record = UserAssessmentAccess(
                access_id=new_access_id,
                assessment_id=str(request.assessment_id),
                user_email=email,
                user_name=user_name or "Candidate",
                organization_id=request.organization_id,
                access_status="GRANTED",
                granted_by=user_id,
                granted_at=now,
                access_details={},
            )
            db.add(record)
            granted_count += 1
            new_emails.append(candidate) # for mailing

        await db.flush()
        access_records.append(
            AccessGrantItem(
                access_id=str(record.access_id),
                assessment_id=str(record.assessment_id),
                user_email=record.user_email,
                access_status=record.access_status,
                granted_at=record.granted_at,
            )
        )

    await db.commit()

    # send email
    for email in new_emails:
        assessment_name = assessment.assessment_formation_name
        assessment_url = assessment.assessment_details.get("exam_url", 'https://example.com')
        assignee_user_name = email.name or email.email.split("@")[0]
        assignor_user_name = user.user_email.split("@")[0]
        
        email_service.send_email(
            template=EmailTemplate.ASSESSMENT_ACCESS_GRANTED,
            to_emails=[email.email],
            assessment_name=assessment_name,
            assessment_url=assessment_url,
            user_name=assignee_user_name,
            assigned_by=assignor_user_name
        )

    return AccessGrantResponse(
        status="success",
        message=f"Access successfully granted for {granted_count + existing_count} candidate(s) to assessment {request.assessment_id}",
        granted_count=granted_count,
        existing_count=existing_count,
        access_records=access_records,
    )


async def get_user_assessment(db: AsyncSession, user: UserDetails):
    try:
        user_assessments = (await db.scalars(select(UserAssessmentAccess).where(UserAssessmentAccess.user_email == user.user_email).order_by(UserAssessmentAccess.granted_at.desc()))).all()

        response = []
        for assessment_access in user_assessments:
            assessment = await db.scalar(select(AssessmentFormation).where(AssessmentFormation.assessment_formation_id == assessment_access.assessment_id))
            if not assessment:
                continue

            assessment_project = await db.scalar(select(ProjectAssessmentMap).where(ProjectAssessmentMap.assessment_formation_id == assessment_access.assessment_id))

            if not assessment_project:
                continue

            submissions = (await db.scalars(
                    select(Submissions)
                    .join(
                        AllocatedExams,
                        Submissions.allocation_id == AllocatedExams.allocation_id,
                    )
                    .where(
                        AllocatedExams.exam_id == assessment.assessment_formation_id,
                        AllocatedExams.user_id == user.user_id
                    )
                )).all()

            assessment_data = {
                "assessment_id": assessment.assessment_formation_id,
                "assessment_name": assessment.assessment_formation_name,
                "assessment_url": assessment.assessment_details.get("exam_url", None),
                "submissions": [{"result":f"{settings.site_base_url}/assessment/result/{encrypt_allocation_id(submission.allocation_id)}"} for submission in submissions],
                "granted_at": assessment_access.granted_at
            }

            if assessment.created_by == user.user_id and user.provided_role.lower() == 'admin':
                assessment_data = {**assessment_data, "owner": True, "project_id": assessment_project.project_id}

            response.append(assessment_data)

        return response
    except Exception as e:
        raise e