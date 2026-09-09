import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from modules.permission.repository import PermissionRepository
from modules.permission.schema import PermissionBulkCreate, PermissionCreate
from modules.permission.service import PermissionService


async def seed_permissions() -> None:
    permissions = PermissionBulkCreate(
        permissions=[
            PermissionCreate(
                permission_key="org:view",
                description="View organization details",
            ),
            PermissionCreate(
                permission_key="org:create",
                description="Create new organizations",
            ),
            PermissionCreate(
                permission_key="org:edit",
                description="Edit organization details",
            ),
            PermissionCreate(
                permission_key="org:delete",
                description="Delete organizations",
            ),
            PermissionCreate(
                permission_key="org:list",
                description="List all organizations",
            ),
            PermissionCreate(
                permission_key="team:view",
                description="View team details",
            ),
            PermissionCreate(
                permission_key="team:create",
                description="Create new teams",
            ),
            PermissionCreate(
                permission_key="team:edit",
                description="Edit team details",
            ),
            PermissionCreate(
                permission_key="team:delete",
                description="Delete teams",
            ),
            PermissionCreate(
                permission_key="team:list",
                description="List all teams",
            ),
            PermissionCreate(
                permission_key="member:add",
                description="Add members to organization or team",
            ),
            PermissionCreate(
                permission_key="member:remove",
                description="Remove members from organization or team",
            ),
            PermissionCreate(
                permission_key="member:view",
                description="View member details",
            ),
            PermissionCreate(
                permission_key="member:list",
                description="List all members",
            ),
            PermissionCreate(
                permission_key="role:create",
                description="Create new roles",
            ),
            PermissionCreate(
                permission_key="role:edit",
                description="Edit role details",
            ),
            PermissionCreate(
                permission_key="role:delete",
                description="Delete roles",
            ),
            PermissionCreate(
                permission_key="role:list",
                description="List all roles",
            ),
            PermissionCreate(
                permission_key="role:assign",
                description="Assign roles to users",
            ),
            PermissionCreate(
                permission_key="role:assignmentDelete",
                description="Remove role assignments from users",
            ),
            PermissionCreate(
                permission_key="roadmap:create",
                description="Create new roadmaps",
            ),
            PermissionCreate(
                permission_key="roadmap:view",
                description="View roadmap details",
            ),
            PermissionCreate(
                permission_key="roadmap:edit",
                description="Edit roadmap details",
            ),
            PermissionCreate(
                permission_key="roadmap:delete",
                description="Delete roadmaps",
            ),
            PermissionCreate(
                permission_key="roadmap:assign",
                description="Assign roadmaps to users or teams",
            ),
            PermissionCreate(
                permission_key="content:create",
                description="Create new content",
            ),
            PermissionCreate(
                permission_key="content:view",
                description="View content details",
            ),
            PermissionCreate(
                permission_key="content:edit",
                description="Edit content details",
            ),
            PermissionCreate(
                permission_key="content:delete",
                description="Delete content",
            ),
            PermissionCreate(
                permission_key="assignment:create",
                description="Create new assignments",
            ),
            PermissionCreate(
                permission_key="assignment:view",
                description="View assignment details",
            ),
            PermissionCreate(
                permission_key="assignment:delete",
                description="Delete assignments",
            ),
        ],
    )

    from core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        repo = PermissionRepository(db=db)
        service = PermissionService(repo=repo)

        created = await service.create_permissions_bulk(data=permissions)

        print(f"Created {len(created)} permissions:")
        for p in created:
            print(f"  - {p.permission_key} ({p.module})")


if __name__ == "__main__":
    asyncio.run(seed_permissions())
