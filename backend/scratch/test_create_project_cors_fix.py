import asyncio
import sys

sys.path.insert(0, r"c:\Users\Admin\Downloads\code_sharing_31082026\backend")

from core.database import AsyncSessionLocal
from sqlalchemy import select
from modules.organization.model import Organization
from modules.project.schema import ProjectCreate, ProjectType, ProjectMandate
from modules.project.service import create_project_async

async def test():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Organization))
        orgs = res.scalars().all()
        org_name = orgs[0].organization_name if orgs else "Default Org"
        print(f"Using organization name: '{org_name}'")

        try:
            p_schema = ProjectCreate(
                project_name="CORS Test Project",
                organization_name=org_name,
                project_type=ProjectType.SKILL_GAP_ASSESSMENT,
                project_mandate=ProjectMandate.SELF,
                hiring_goal="1"
            )
            created = await create_project_async(db=db, project_in=p_schema)
            await db.commit()
            print("Successfully created project! ID:", created.project_id)
        except Exception as e:
            print("Error creating project:", e)

if __name__ == "__main__":
    asyncio.run(test())
