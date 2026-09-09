import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.database import AsyncSessionLocal
from modules.permission.repository import PermissionRepository
from modules.role.repository import RoleRepository
from modules.role.schema import RoleCreate, RoleScope


async def seed_platform_role(role_name: str, user_id: str, created_by: str) -> None:
    async with AsyncSessionLocal() as db:
        perm_repo = PermissionRepository(db=db)
        role_repo = RoleRepository(db=db)

        all_permissions = await perm_repo.get_permissions()
        permission_keys = [p.permission_key for p in all_permissions]

        data = RoleCreate(
            organization_id=None,
            name=role_name,
            scope=RoleScope.PLATFORM,
            permission_keys=permission_keys,
        )

        role = await role_repo.create_role(data=data, created_by=created_by)

        await role_repo.add_permissions(
            role_id=role.role_id,
            permission_keys=permission_keys,
        )

        assignment = await role_repo.assign_role(
            user_id=user_id,
            role_id=role.role_id,
            organization_id=None,
            team_id=None,
        )

        print(f"Role '{role.name}' created with id: {role.role_id}")
        print(f"  Scope: {role.scope}, Permissions: {len(permission_keys)}")
        print(f"  Assigned to user: {assignment.user_id}")


if __name__ == "__main__":
    asyncio.run(
        seed_platform_role(
            role_name="platform-admin",
            user_id="user-63guDTKWa3oXwUuhXqZpqA",
            created_by="user-63guDTKWa3oXwUuhXqZpqA",
        )
    )
