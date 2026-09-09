from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from modules.background_jobs.exception import JobNotFound
from modules.background_jobs.model import BackgroundJob
from modules.background_jobs.schema import JobType, JobUpdate
import uuid_utils as uuid

from shared.db.dependencies import get_db


class BackgroundJobService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_new_job(
        self,
        organization_id: str,
        team_id: str | None,
        job_type: JobType,
        job_data: dict = {},
        metadata: dict = {},
    ) -> BackgroundJob:
        job_id = str(uuid.uuid7())
        job = BackgroundJob(
            job_id=job_id,
            organization_id=organization_id,
            team_id=team_id,
            job_type=job_type.value,
            job_data=job_data,
            status="pending",
            metadata_=metadata,
        )

        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        return job

    async def get_job_deatils(
        self, organization_id: str, team_id: str | None, job_id: str
    ) -> BackgroundJob:
        job = await self.db.scalar(
            select(BackgroundJob).where(
                BackgroundJob.organization_id == organization_id,
                BackgroundJob.team_id == team_id,
                BackgroundJob.job_id == job_id,
            )
        )

        if not job:
            raise JobNotFound("Job not found")

        return job

    async def get_job_status(
        self, organization_id: str, team_id: str | None, job_id: str
    ) -> str:
        job = await self.db.scalar(
            select(BackgroundJob).where(
                BackgroundJob.organization_id == organization_id,
                BackgroundJob.team_id == team_id,
                BackgroundJob.job_id == job_id,
            )
        )

        if not job:
            raise JobNotFound("Job not found")

        return job.status

    async def update_job(
        self, organization_id: str, team_id: str | None, job_id: str, data: JobUpdate
    ) -> BackgroundJob:
        job = await self.db.scalar(
            select(BackgroundJob).where(
                BackgroundJob.organization_id == organization_id,
                BackgroundJob.team_id == team_id,
                BackgroundJob.job_id == job_id,
            )
        )

        if not job:
            raise JobNotFound("Job not found")

        update_data = data.model_dump(exclude_unset=True)

        if "metadata_" in update_data:
            job.metadata_ = {
                **(job.metadata_ or {}),
                **(update_data.pop("metadata_") or {}),
            }

        for field, value in update_data.items():
            setattr(job, field, value)

        flag_modified(job, "job_data")
        flag_modified(job, "metadata_")

        await self.db.commit()
        await self.db.refresh(job)
        return job


async def get_background_job_service(db: AsyncSession = Depends(get_db)):
    return BackgroundJobService(db=db)
