from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from modules.organization.model import Organization
from modules.project.df_schema import DesigCreate, FunctionCreate, OrgCreate
from modules.project.model import Designation, Function


# ── Organizations ───────────────────────────────────────────────
async def get_all_organizations(db: AsyncSession):
    result = await db.execute(select(Organization))
    return result.scalars().all()


async def create_organization_async(
    db: AsyncSession, org_in: OrgCreate
) -> tuple[bool, str, Organization | None]:
    stmt = select(Organization).where(
        Organization.organization_name == org_in.organization_name
    )
    result = await db.execute(stmt)
    existing_org = result.scalars().first()

    if existing_org:
        return (
            False,
            f"Organization name '{org_in.organization_name}' already exists.",
            None,
        )

    db_org = Organization(
        organization_name=org_in.organization_name,
        organization_details=org_in.organization_details,
        created_by=str(org_in.created_by),
        updated_by=str(org_in.created_by),
    )
    db.add(db_org)
    await db.commit()
    await db.refresh(db_org)
    return True, "Success", db_org


# ── Functions (Formerly SSL) ────────────────────────────────────
async def get_functions_by_org(db: AsyncSession, org_id: UUID):
    stmt = select(Function).where(Function.organization_id == org_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_function_async(
    db: AsyncSession, org_id: UUID, func_in: FunctionCreate
) -> tuple[bool, str, Function | None]:
    stmt = select(Organization).where(Organization.organization_id == org_id)
    result = await db.execute(stmt)
    org_exists = result.scalars().first()

    if not org_exists:
        return False, f"Organization ID {org_id} does not exist.", None

    db_func = Function(
        organization_id=org_id,
        function_name=func_in.function_name,
        function_details=func_in.function_details,
        created_by=func_in.created_by,
    )

    db.add(db_func)
    await db.commit()
    await db.refresh(db_func)

    return True, "Success", db_func


# ── Designations ────────────────────────────────────────────────
# Keep this for project_routes.py and other files that need all org designations
async def get_designations_by_org(db: AsyncSession, org_id: UUID):
    stmt = select(Designation).where(Designation.organization_id == org_id)
    result = await db.execute(stmt)
    return result.scalars().all()


# Add this for your specific function-based routes
async def get_designations_by_function(db: AsyncSession, function_id: UUID):
    stmt = select(Designation).where(Designation.function_id == function_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_designation_async(
    db: AsyncSession, function_id: UUID, desig_in: DesigCreate
) -> tuple[bool, str, Designation | None]:
    # Check if the function exists
    stmt = select(Function).where(Function.function_id == function_id)
    result = await db.execute(stmt)
    func_exists = result.scalars().first()

    if not func_exists:
        return False, f"Function ID {function_id} does not exist.", None

    # Inherit the organization_id directly from the parent function
    db_desig = Designation(
        organization_id=func_exists.organization_id,
        function_id=function_id,
        designation_name=desig_in.designation_name,
        designation_details=desig_in.designation_details,
        created_by=desig_in.created_by,
    )
    db.add(db_desig)
    await db.commit()
    await db.refresh(db_desig)
    return True, "Success", db_desig
