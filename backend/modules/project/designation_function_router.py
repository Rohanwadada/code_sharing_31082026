from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from modules.project.designation_function_service import (
    create_designation_async,
    create_function_async,
    get_designations_by_function,
    get_functions_by_org,
)
from modules.project.df_schema import DesigCreate, FunctionCreate
from shared.db.dependencies import get_db

router = APIRouter()


# ── Functions ───────────────────────────────────────────────────
@router.get("/organizations/{org_id}/functions", status_code=status.HTTP_200_OK)
async def list_functions(org_id: UUID, db: AsyncSession = Depends(get_db)):
    funcs = await get_functions_by_org(db, org_id)
    return [
        {"id": f.function_id, "name": f.function_name, "details": f.function_details}
        for f in funcs
    ]


@router.post("/organizations/{org_id}/functions", status_code=status.HTTP_201_CREATED)
async def create_function(
    org_id: UUID, body: FunctionCreate, db: AsyncSession = Depends(get_db)
):
    success, message, func = await create_function_async(db, org_id, body)

    if not success or not func:
        raise HTTPException(status_code=400, detail=message)

    return {
        "status": "success",
        "id": func.function_id,
        "name": func.function_name,
        "organization_id": func.organization_id,
    }


# ── Designations ────────────────────────────────────────────────
@router.get("/functions/{function_id}/designations", status_code=status.HTTP_200_OK)
async def list_designations(function_id: UUID, db: AsyncSession = Depends(get_db)):
    desigs = await get_designations_by_function(db, function_id)
    return [
        {
            "id": d.designation_id,
            "name": d.designation_name,
            "function_id": d.function_id,
        }
        for d in desigs
    ]


@router.post(
    "/functions/{function_id}/designations", status_code=status.HTTP_201_CREATED
)
async def create_designation(
    function_id: UUID, body: DesigCreate, db: AsyncSession = Depends(get_db)
):
    success, message, desig = await create_designation_async(db, function_id, body)
    if not success or not desig:
        raise HTTPException(status_code=400, detail=message)

    return {
        "status": "success",
        "id": desig.designation_id,
        "name": desig.designation_name,
        "function_id": desig.function_id,
        "organization_id": desig.organization_id,
    }
