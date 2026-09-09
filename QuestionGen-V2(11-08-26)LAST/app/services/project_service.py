# import re
# from typing import Optional
# from uuid import UUID
# from datetime import datetime, timezone
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import delete, select
# from sqlalchemy.orm.attributes import flag_modified

# # all necessary models
# from app.models.projects import Project
# from app.models.users import User
# from app.models.project_hiring_managers import ProjectHiringManager
# from app.models.project_hiring_sponsors import ProjectHiringSponsor
# from app.schemas.projects import ProjectCreate, ProjectStatus, ProjectUpdate
# from app.models.organizations import Organization
# from app.models.functions import Function 
# from app.models.designations import Designation

# async def create_project_async(db: AsyncSession, project_in: ProjectCreate) -> Project:
#     org_stmt = select(Organization).where(Organization.organization_name == project_in.organization_name)
#     org_result = await db.execute(org_stmt)
#     org = org_result.scalars().first()
    
#     if not org:
#         raise ValueError(f"Organization '{project_in.organization_name}' not found.")
        
#     status_data = project_in.project_status.model_dump(exclude_unset=True) if hasattr(project_in.project_status, 'model_dump') else (project_in.project_status or {})
    
#     if not status_data.get("status") or status_data.get("status") == "draft":
#         is_fully_filled = bool(
#             project_in.hiring_goal and 
#             project_in.jd_url and 
#             project_in.function_name and 
#             project_in.designation_name
#         )
#         status_data["status"] = "active" if is_fully_filled else "draft"
        
#     is_active = status_data.get("status") == "active"

#     func_id = None
#     if project_in.function_name:
#         func_stmt = select(Function).where(Function.function_name == project_in.function_name, Function.organization_id == org.organization_id)
#         func_result = await db.execute(func_stmt)
#         func = func_result.scalars().first()
#         if func:
#             func_id = func.function_id
#         elif is_active:
#             new_func = Function(
#                 organization_id=org.organization_id,
#                 function_name=project_in.function_name,
#                 created_by=project_in.created_by
#             )
#             db.add(new_func)
#             await db.flush() 
#             func_id = new_func.function_id
            
#     desig_id = None
#     if project_in.designation_name:
#         desig_stmt = select(Designation).where(Designation.designation_name == project_in.designation_name, Designation.organization_id == org.organization_id)
#         desig_result = await db.execute(desig_stmt)
#         desig = desig_result.scalars().first()
#         if desig:
#             desig_id = desig.designation_id
#         elif is_active:
#             new_desig = Designation(
#                 organization_id=org.organization_id,
#                 function_id=func_id,
#                 designation_name=project_in.designation_name,
#                 created_by=project_in.created_by
#             )
#             db.add(new_desig)
#             await db.flush()
#             desig_id = new_desig.designation_id

#     project_details = {
#         "approval_managers": project_in.approval_managers,
#         "hiring_managers": project_in.hiring_managers, 
#         "hiring_sponsors": project_in.hiring_sponsors, 
#         "jd_data": project_in.jd_data
#     }

#     db_project = Project(
#         project_name=project_in.project_name,
#         organization_id=org.organization_id,
#         function_id=func_id,
#         designation_id=desig_id,
#         hiring_goal=project_in.hiring_goal,
#         jd_url=project_in.jd_url,
#         project_status=status_data, 
#         created_by=project_in.created_by,
#         project_details=project_details
#     )
    
#     db.add(db_project)
#     await db.flush() 

#     if project_in.hiring_managers:
#         hm_stmt = select(User).where(User.user_email.in_(project_in.hiring_managers))
#         hm_result = await db.execute(hm_stmt)
#         hm_users = hm_result.scalars().all()
#         hm_records = [ProjectHiringManager(project_id=db_project.project_id, user_id=user.user_id) for user in hm_users]
#         if hm_records:
#             db.add_all(hm_records)

#     if project_in.hiring_sponsors:
#         hs_stmt = select(User).where(User.user_email.in_(project_in.hiring_sponsors))
#         hs_result = await db.execute(hs_stmt)
#         hs_users = hs_result.scalars().all()
#         hs_records = [ProjectHiringSponsor(project_id=db_project.project_id, user_id=user.user_id, created_by=db_project.created_by) for user in hs_users]
#         if hs_records:
#             db.add_all(hs_records)

#     await db.commit()
#     await db.refresh(db_project)
#     return db_project


# async def update_project_async(db: AsyncSession, project_id: UUID, project_in: ProjectUpdate) -> Optional[Project]:
#     stmt = select(Project).where(Project.project_id == project_id)
#     result = await db.execute(stmt)
#     db_project = result.scalars().first()
    
#     if not db_project:
#         return None

#     update_data = project_in.model_dump(exclude_unset=True)

#     if "organization_name" in update_data:
#         org_result = await db.execute(select(Organization).where(Organization.organization_name == update_data["organization_name"]))
#         org = org_result.scalars().first()
#         if org:
#             db_project.organization_id = org.organization_id
            
#     current_status = dict(db_project.project_status) if db_project.project_status else {"status": "draft"}
#     final_status = current_status.get("status")

#     if "project_status" in update_data and update_data["project_status"] is not None:
#         status_update = update_data["project_status"]
#         final_status = status_update.get("status", final_status)
#         if status_update.get("resume_date") and isinstance(status_update["resume_date"], datetime):
#             status_update["resume_date"] = status_update["resume_date"].isoformat()
#         if status_update.get("status") != "paused":
#             status_update.pop("pause_type", None)
#             status_update.pop("resume_date", None)
#         db_project.project_status = status_update
        
#     is_active = final_status == "active"

#     if "function_name" in update_data:
#         func_name = update_data["function_name"]
#         if func_name:
#             func_result = await db.execute(select(Function).where(Function.function_name == func_name, Function.organization_id == db_project.organization_id))
#             func = func_result.scalars().first()
#             if func:
#                 db_project.function_id = func.function_id
#             elif is_active:
#                 new_func = Function(
#                     organization_id=db_project.organization_id,
#                     function_name=func_name,
#                     created_by=db_project.created_by
#                 )
#                 db.add(new_func)
#                 await db.flush()
#                 db_project.function_id = new_func.function_id
#         else:
#             db_project.function_id = None
            
#     if "designation_name" in update_data:
#         desig_name = update_data["designation_name"]
#         if desig_name:
#             desig_result = await db.execute(select(Designation).where(Designation.designation_name == desig_name, Designation.organization_id == db_project.organization_id))
#             desig = desig_result.scalars().first()
#             if desig:
#                 db_project.designation_id = desig.designation_id
#             elif is_active:
#                 new_desig = Designation(
#                     organization_id=db_project.organization_id,
#                     function_id=db_project.function_id,
#                     designation_name=desig_name,
#                     created_by=db_project.created_by
#                 )
#                 db.add(new_desig)
#                 await db.flush()
#                 db_project.designation_id = new_desig.designation_id
#         else:
#             db_project.designation_id = None

#     standard_fields = ["project_name", "hiring_goal", "jd_url"]
#     for field in standard_fields:
#         if field in update_data:
#             setattr(db_project, field, update_data[field])

#     current_details = dict(db_project.project_details or {})
#     details_fields = ["approval_managers", "hiring_managers", "hiring_sponsors", "jd_data"]
    
#     details_updated = False
#     for field in details_fields:
#         if field in update_data:
#             current_details[field] = update_data[field]
#             details_updated = True
            
#     if details_updated:
#         db_project.project_details = current_details

#     if "hiring_managers" in update_data:
#         await db.execute(delete(ProjectHiringManager).where(ProjectHiringManager.project_id == project_id))
#         if update_data["hiring_managers"]:
#             hm_result = await db.execute(select(User).where(User.user_email.in_(update_data["hiring_managers"])))
#             hm_users = hm_result.scalars().all()
#             hm_records = [ProjectHiringManager(project_id=project_id, user_id=user.user_id) for user in hm_users]
#             if hm_records:
#                 db.add_all(hm_records)

#     if "hiring_sponsors" in update_data:
#         await db.execute(delete(ProjectHiringSponsor).where(ProjectHiringSponsor.project_id == project_id))
#         if update_data["hiring_sponsors"]:
#             hs_result = await db.execute(select(User).where(User.user_email.in_(update_data["hiring_sponsors"])))
#             hs_users = hs_result.scalars().all()
#             hs_records = [ProjectHiringSponsor(project_id=project_id, user_id=user.user_id, created_by=db_project.created_by) for user in hs_users]
#             if hs_records:
#                 db.add_all(hs_records)

#     await db.commit()
#     await db.refresh(db_project)
#     return db_project

# async def auto_resume_paused_projects(db: AsyncSession):
#     current_time = datetime.now(timezone.utc)
#     stmt = select(Project).where(Project.project_status["status"].astext == "paused")
#     result = await db.execute(stmt)
#     paused_projects = result.scalars().all()
    
#     for project in paused_projects:
#         status_data = dict(project.project_status)
#         resume_date_str = status_data.get("resume_date")
        
#         if status_data.get("pause_type") == "until_date" and resume_date_str:
#             resume_date_obj = datetime.fromisoformat(resume_date_str)
#             if current_time >= resume_date_obj:
#                 status_data["status"] = "active"
#                 status_data.pop("pause_type", None)
#                 status_data.pop("resume_date", None)
#                 project.project_status = status_data
#                 flag_modified(project, "project_status")
                
#     await db.commit()   
    
    
# async def duplicate_project_async(db: AsyncSession, project_id: UUID) -> Project:
#     # 1. Fetch the original project
#     stmt = select(Project).where(Project.project_id == project_id)
#     result = await db.execute(stmt)
#     original_project = result.scalars().first()
    
#     if not original_project:
#         raise ValueError("Original project not found.")

#     # 2. Determine the new project name
#     base_name = original_project.project_name
    
#     # Check if the name already ends with " (X)"
#     match = re.match(r"^(.*) \((\d+)\)$", base_name)
#     if match:
#         base_name = match.group(1) # Extract the core name without the number

#     # Find all existing projects starting with the base name to calculate the next sequence number
#     name_pattern = f"{base_name} (%)"
#     name_stmt = select(Project.project_name).where(
#         (Project.project_name == base_name) | 
#         (Project.project_name.like(name_pattern))
#     )
#     name_result = await db.execute(name_stmt)
#     existing_names = name_result.scalars().all()
    
#     max_num = 0
#     for name in existing_names:
#         m = re.match(rf"^{re.escape(base_name)} \((\d+)\)$", name)
#         if m:
#             num = int(m.group(1))
#             if num > max_num:
#                 max_num = num
                
#     new_project_name = f"{base_name} ({max_num + 1})"

#     # 3. Create the duplicate project row
#     duplicate_project = Project(
#         project_name=new_project_name,
#         organization_id=original_project.organization_id,
#         function_id=original_project.function_id,
#         designation_id=original_project.designation_id,
#         hiring_goal=original_project.hiring_goal,
#         jd_url=original_project.jd_url,
#         project_status={"status": "draft"},  # Overwrite status to draft
#         created_by=original_project.created_by,
#         project_details=original_project.project_details
#     )
    
#     db.add(duplicate_project)
#     await db.flush() # Flush to generate the new project_id

#     # 4. Copy Hiring Managers
#     hm_stmt = select(ProjectHiringManager).where(ProjectHiringManager.project_id == original_project.project_id)
#     hm_result = await db.execute(hm_stmt)
#     existing_hms = hm_result.scalars().all()
    
#     new_hms = [
#         ProjectHiringManager(project_id=duplicate_project.project_id, user_id=hm.user_id) 
#         for hm in existing_hms
#     ]
#     if new_hms:
#         db.add_all(new_hms)

#     # 5. Copy Hiring Sponsors
#     hs_stmt = select(ProjectHiringSponsor).where(ProjectHiringSponsor.project_id == original_project.project_id)
#     hs_result = await db.execute(hs_stmt)
#     existing_hss = hs_result.scalars().all()
    
#     new_hss = [
#         ProjectHiringSponsor(
#             project_id=duplicate_project.project_id, 
#             user_id=hs.user_id, 
#             created_by=duplicate_project.created_by
#         ) 
#         for hs in existing_hss
#     ]
#     if new_hss:
#         db.add_all(new_hss)

#     # 6. Commit the transaction
#     await db.commit()
#     await db.refresh(duplicate_project)
    
#     return duplicate_project    

# class ProjectService:
#     @staticmethod
#     async def delete_project(db: AsyncSession, project_id: UUID) -> bool:
#         stmt = delete(Project).where(Project.project_id == project_id)
#         result = await db.execute(stmt)
#         await db.commit()
#         return result.rowcount > 0 
    
# async def get_project_by_id_async(db: AsyncSession, project_id: UUID):
#     stmt = (
#         select(
#             Project,
#             Organization.organization_name,
#             Function.function_name,
#             Designation.designation_name
#         )
#         .outerjoin(Organization, Project.organization_id == Organization.organization_id)
#         .outerjoin(Function, Project.function_id == Function.function_id)
#         .outerjoin(Designation, Project.designation_id == Designation.designation_id)
#         .where(Project.project_id == project_id)
#     )
#     result = await db.execute(stmt)
#     row = result.first()
#     if not row:
#         return None
#     project, org_name, func_name, desig_name = row
#     return {
#         "project_id": project.project_id,
#         "project_name": project.project_name,
#         "organization_name": org_name,
#         "function_name": func_name,
#         "designation_name": desig_name,
#         "hiring_goal": project.hiring_goal,
#         "jd_url": project.jd_url,
#         "project_status": project.project_status,
#         "created_at": project.created_at,
#         "created_by": project.created_by,
#         "project_details": project.project_details,
#         "profiles_count": None,
#         "avg_score": None,
#         "shortlisted_count": None
#     }  
    
# async def get_all_projects_async(db: AsyncSession):
#     stmt = (
#         select(
#             Project,
#             Organization.organization_name,
#             Function.function_name,
#             Designation.designation_name
#         )
#         .outerjoin(Organization, Project.organization_id == Organization.organization_id)
#         .outerjoin(Function, Project.function_id == Function.function_id)
#         .outerjoin(Designation, Project.designation_id == Designation.designation_id)
#     )
#     result = await db.execute(stmt)
#     projects_data = []
#     for row in result.all():
#         project, org_name, func_name, desig_name = row
#         projects_data.append({
#             "project_id": project.project_id,
#             "project_name": project.project_name,
#             "organization_name": org_name,
#             "function_name": func_name,
#             "designation_name": desig_name,
#             "hiring_goal": project.hiring_goal,
#             "jd_url": project.jd_url,
#             "project_status": project.project_status,
#             "created_at": project.created_at,
#             "created_by": project.created_by,
#             "project_details": project.project_details,
#             "profiles_count": None,
#             "avg_score": None,
#             "shortlisted_count": None
#         })
#     return projects_data        

# async def update_project_status_async(db: AsyncSession, project_id: UUID, status_in: ProjectStatus):
#     stmt = select(Project).where(Project.project_id == project_id)
#     result = await db.execute(stmt)
#     db_project = result.scalars().first()
    
#     if not db_project:
#         return None, None
    
#     previous_status = dict(db_project.project_status) if db_project.project_status else {}
#     new_status = status_in.model_dump(mode="json") if hasattr(status_in, 'model_dump') else status_in
    
#     if new_status.get("status") != "paused":
#         new_status["pause_type"] = None
#         new_status["resume_date"] = None
        
#     db_project.project_status = new_status
    
#     await db.commit()
#     await db.refresh(db_project)
    
#     return previous_status, new_status




from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Import the necessary models
from app.models.projects import Project
from app.models.organizations import Organization
from app.models.functions import Function 
from app.models.designations import Designation

async def get_project_by_id_async(db: AsyncSession, project_id: UUID):
    """
    Fetches a project by its UUID along with related organization, function, and designation names.
    """
    stmt = (
        select(
            Project,
            Organization.organization_name,
            Function.function_name,
            Designation.designation_name
        )
        .outerjoin(Organization, Project.organization_id == Organization.organization_id)
        .outerjoin(Function, Project.function_id == Function.function_id)
        .outerjoin(Designation, Project.designation_id == Designation.designation_id)
        .where(Project.project_id == project_id)
    )
    
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        return None
        
    project, org_name, func_name, desig_name = row
    
    return {
        "project_id": project.project_id,
        "project_name": project.project_name,
        "organization_name": org_name,
        "function_name": func_name,
        "designation_name": desig_name,
        "hiring_goal": project.hiring_goal,
        "jd_url": project.jd_url,
        "project_status": project.project_status,
        "created_at": project.created_at,
        "created_by": project.created_by,
        "project_details": project.project_details,
        "profiles_count": None,
        "avg_score": None,
        "shortlisted_count": None
    }