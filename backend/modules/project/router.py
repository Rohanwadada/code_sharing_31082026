from typing import Optional
import json
import logging
from uuid import UUID

from core.security.dependencies import get_current_user

from azure.storage.blob import BlobServiceClient, ContentSettings
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exception import ForbiddenException
from modules.project.schema import (
    DeleteProjectRequest,
    ProjectCreate,
    ProjectDetailsRequest,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdate,
)
from modules.project.service import (
    ProjectService,
    create_project_async,
    duplicate_project_async,
    get_all_projects_async,
    get_project_by_id_async,
    update_project_async,
    update_project_status_async,
)
from shared.db.dependencies import get_db
from shared.file_extraction import extract_jd_text
from modules.project.designation_function_router import router as designation_function_router
from modules.user.model import UserDetails
from core.security.dependencies import get_current_user

router = APIRouter(tags=["project"])

AZURE_CONNECTION_STRING = settings.azure_connection_string
CONTAINER_NAME = settings.azure_blob_container_name

if AZURE_CONNECTION_STRING:
    blob_service_client = BlobServiceClient.from_connection_string(
        AZURE_CONNECTION_STRING
    )
else:
    blob_service_client = None


def upload_to_azure_blob(file_stream, filename, content_type):
    if not blob_service_client:
        logging.error("Azure connection string is missing.")
        return None
    try:
        blob_client = blob_service_client.get_blob_client(
            container=CONTAINER_NAME, blob=filename
        )
        blob_client.upload_blob(
            file_stream,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
        return {"blob_name": filename, "blob_url": blob_client.url}
    except Exception as e:
        logging.error(f"Azure upload failed: {str(e)}")
        return None


# --- Routes ---


@router.post("/create-project", status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: str = Form(...),
    jd_file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    user: UserDetails = Depends(get_current_user)
):
    try:
        # if user.provided_role.lower() != 'admin':
        #     raise ForbiddenException("You are not allowed to create project")
            
        project_dict = json.loads(project_data)
        project_in = ProjectCreate(**project_dict)
        #change_by_rohan (Set created_by to logged-in user_id)
        if hasattr(user, 'user_id') and user.user_id:
            project_in.created_by = user.user_id

        if jd_file:
            extracted_text = await extract_jd_text(jd_file)
            project_in.jd_data = extracted_text

            upload_result = upload_to_azure_blob(
                file_stream=jd_file.file,
                filename=jd_file.filename,
                content_type=jd_file.content_type,
            )
            if upload_result and upload_result.get("blob_url"):
                project_in.jd_url = upload_result["blob_url"]
            else:
                raise HTTPException(
                    status_code=500, detail="Failed to upload JD document"
                )

        project = await create_project_async(db=db, project_in=project_in)
        return {
            "status": "success",
            "project_id": project.project_id,
            "jd_url": project.jd_url,
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400, detail="Invalid JSON format in project_data"
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        await db.rollback()
        # raise HTTPException(
        #     status_code=400, detail=f"Failed to create project: {str(e)}"
        # )
        raise e


@router.put("/projects/{project_id}", status_code=status.HTTP_200_OK)
async def update_project(
    project_id: UUID,
    project_data: str = Form(...),
    jd_file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        project_dict = json.loads(project_data)
        project_in = ProjectUpdate(**project_dict)

        if jd_file:
            extracted_text = await extract_jd_text(jd_file)
            project_in.jd_data = extracted_text

            upload_result = upload_to_azure_blob(
                file_stream=jd_file.file,
                filename=jd_file.filename,
                content_type=jd_file.content_type,
            )
            if upload_result and upload_result.get("blob_url"):
                project_in.jd_url = upload_result["blob_url"]
            else:
                raise HTTPException(
                    status_code=500, detail="Failed to upload new JD document"
                )

        project = await update_project_async(
            db=db, project_id=project_id, project_in=project_in
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        return {"status": "success", "message": "Project updated successfully"}

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400, detail="Invalid JSON format in project_data"
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Failed to update project: {str(e)}"
        )


@router.post("/projects/{project_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_project_route(project_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        duplicated_project = await duplicate_project_async(db=db, project_id=project_id)

        return {
            "status": "success",
            "message": "Project duplicated successfully",
            "project_id": duplicated_project.project_id,
            "project_name": duplicated_project.project_name,
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to duplicate project: {str(e)}"
        )


# @router.get(
#     "/get-all-projects",
#     response_model=list[ProjectResponse],
#     status_code=status.HTTP_200_OK,
# )
# async def get_projects(db: AsyncSession = Depends(get_db)):
#     try:
#         projects = await get_all_projects_async(db=db)
#         return projects
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Failed to fetch projects: {str(e)}"
#         )
# @router.get("/get-all-projects", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
# async def get_projects(
#     organization_id: Optional[UUID] = None,
#     db: AsyncSession = Depends(get_db)
# ):
#     try:
#         projects = await get_all_projects_async(db=db, organization_id=organization_id)
#         return projects
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

# #change_by_rohan
# @router.get("/get-all-projects", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
# async def get_projects(
#     organization_id: Optional[UUID] = None,
#     user_email: Optional[str] = None,
#     db: AsyncSession = Depends(get_db)
# ):
#     try:
#         projects = await get_all_projects_async(db=db, organization_id=organization_id, user_email=user_email)
#         return projects
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")
#change_by_rohan



#change_by_rohan
@router.get("/get-all-projects", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
async def get_projects(
    organization_id: str ,
    
    db: AsyncSession = Depends(get_db),
    user: UserDetails = Depends(get_current_user)
):
    try:
        current_user_id = user.user_id
        projects = await get_all_projects_async(
            db=db, 
            organization_id=organization_id, 
            current_user_id=current_user_id,
         
        )
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

@router.post(
    "/project/details", response_model=ProjectResponse, status_code=status.HTTP_200_OK
)
async def get_project_details(
    request_data: ProjectDetailsRequest, db: AsyncSession = Depends(get_db)
):
    project = await get_project_by_id_async(db=db, project_id=request_data.project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {request_data.project_id} not found",
        )
    return project


@router.delete("/delete-project", status_code=status.HTTP_200_OK)
async def delete_project(
    request_data: DeleteProjectRequest, db: AsyncSession = Depends(get_db)
):
    if not request_data.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion confirmation is required (confirm must be true)",
        )

    deleted = await ProjectService.delete_project(db, request_data.project_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {request_data.project_id} not found",
        )
    return {"status": "success", "message": "Project deleted successfully"}


@router.put("/project/{project_id}/status", status_code=status.HTTP_200_OK)
async def change_project_status(
    project_id: UUID, status_in: ProjectStatus, db: AsyncSession = Depends(get_db)
):
    prev_status, new_status = await update_project_status_async(
        db=db, project_id=project_id, status_in=status_in
    )
    if prev_status is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    prev_status_str = json.dumps(prev_status)
    new_status_str = json.dumps(new_status)

    return {
        "status": "success",
        "message": f"project status changed from {prev_status_str} to {new_status_str}",
        "previous_status": prev_status,
        "new_status": new_status,
    }


router.include_router(designation_function_router)