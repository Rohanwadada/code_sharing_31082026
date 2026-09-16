import re
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from sqlalchemy.orm.attributes import flag_modified

logger = logging.getLogger(__name__)

from modules.organization.model import Organization
from modules.project.model import (
    Designation,
    Function,
    Project,
    ProjectHiringManager,
    ProjectHiringSponsor,
)
from modules.project.schema import ProjectCreate, ProjectStatus, ProjectUpdate
from modules.user.model import UserDetails
import modules.roadmap.model  # noqa: F401


async def create_project_async(db: AsyncSession, project_in: ProjectCreate) -> Project:
    org_stmt = select(Organization).where(
        Organization.organization_name == project_in.organization_name
    )
    org_result = await db.execute(org_stmt)
    org = org_result.scalars().first()

    if not org:
        raise ValueError(f"Organization '{project_in.organization_name}' not found.")

    status_data = (
        project_in.project_status.model_dump(exclude_unset=True)
        if hasattr(project_in.project_status, "model_dump")
        else (project_in.project_status or {})
    )

    if not status_data.get("status") or status_data.get("status") == "draft":
        is_fully_filled = bool(
            project_in.hiring_goal
            and project_in.jd_url
            and project_in.function_name
            and project_in.designation_name
        )
        status_data["status"] = "active" if is_fully_filled else "draft"

    is_active = status_data.get("status") == "active"

    func_id = None
    if project_in.function_name:
        func_stmt = select(Function).where(
            Function.function_name == project_in.function_name,
            Function.organization_id == org.organization_id,
        )
        func_result = await db.execute(func_stmt)
        func = func_result.scalars().first()
        if func:
            func_id = func.function_id
        elif is_active:
            new_func = Function(
                organization_id=org.organization_id,
                function_name=project_in.function_name,
                created_by=project_in.created_by,
            )
            db.add(new_func)
            await db.flush()
            func_id = new_func.function_id

    desig_id = None
    if project_in.designation_name:
        desig_stmt = select(Designation).where(
            Designation.designation_name == project_in.designation_name,
            Designation.organization_id == org.organization_id,
        )
        desig_result = await db.execute(desig_stmt)
        desig = desig_result.scalars().first()
        if desig:
            desig_id = desig.designation_id
        elif is_active:
            new_desig = Designation(
                organization_id=org.organization_id,
                function_id=func_id,
                designation_name=project_in.designation_name,
                created_by=project_in.created_by,
            )
            db.add(new_desig)
            await db.flush()
            desig_id = new_desig.designation_id

    project_details = {
        "approval_managers": project_in.approval_managers,
        "hiring_managers": project_in.hiring_managers,
        "hiring_sponsors": project_in.hiring_sponsors,
        "jd_data": project_in.jd_data,
        "project_type": project_in.project_type,
        "project_mandate": project_in.project_mandate
    }

    db_project = Project(
        project_name=project_in.project_name,
        organization_id=org.organization_id,
        function_id=func_id,
        designation_id=desig_id,
        hiring_goal=project_in.hiring_goal,
        jd_url=project_in.jd_url,
        project_status=status_data,
        created_by=project_in.created_by,
        project_details=project_details,
    )

    db.add(db_project)
    await db.flush()

    if project_in.hiring_managers:
        hm_stmt = select(UserDetails).where(
            UserDetails.user_email.in_(project_in.hiring_managers)
        )
        hm_result = await db.execute(hm_stmt)
        hm_users = hm_result.scalars().all()
        hm_records = [
            ProjectHiringManager(project_id=db_project.project_id, user_id=user.user_id)
            for user in hm_users
        ]
        if hm_records:
            db.add_all(hm_records)

    if project_in.hiring_sponsors:
        hs_stmt = select(UserDetails).where(
            UserDetails.user_email.in_(project_in.hiring_sponsors)
        )
        hs_result = await db.execute(hs_stmt)
        hs_users = hs_result.scalars().all()
        hs_records = [
            ProjectHiringSponsor(
                project_id=db_project.project_id,
                user_id=user.user_id,
                created_by=db_project.created_by,
            )
            for user in hs_users
        ]
        if hs_records:
            db.add_all(hs_records)

    await db.commit()
    await db.refresh(db_project)
    return db_project


async def update_project_async(
    db: AsyncSession, project_id: UUID, project_in: ProjectUpdate
) -> Optional[Project]:
    stmt = select(Project).where(Project.project_id == project_id)
    result = await db.execute(stmt)
    db_project = result.scalars().first()

    if not db_project:
        return None

    update_data = project_in.model_dump(exclude_unset=True)

    if "organization_name" in update_data:
        org_result = await db.execute(
            select(Organization).where(
                Organization.organization_name == update_data["organization_name"]
            )
        )
        org = org_result.scalars().first()
        if org:
            db_project.organization_id = org.organization_id

    current_status = (
        dict(db_project.project_status)
        if db_project.project_status
        else {"status": "draft"}
    )
    final_status = current_status.get("status")

    if "project_status" in update_data and update_data["project_status"] is not None:
        status_update = update_data["project_status"]
        final_status = status_update.get("status", final_status)
        if status_update.get("resume_date") and isinstance(
            status_update["resume_date"], datetime
        ):
            status_update["resume_date"] = status_update["resume_date"].isoformat()
        if status_update.get("status") != "paused":
            status_update.pop("pause_type", None)
            status_update.pop("resume_date", None)
        db_project.project_status = status_update

    is_active = final_status == "active"

    if "function_name" in update_data:
        func_name = update_data["function_name"]
        if func_name:
            func_result = await db.execute(
                select(Function).where(
                    Function.function_name == func_name,
                    Function.organization_id == db_project.organization_id,
                )
            )
            func = func_result.scalars().first()
            if func:
                db_project.function_id = func.function_id
            elif is_active:
                new_func = Function(
                    organization_id=db_project.organization_id,
                    function_name=func_name,
                    created_by=db_project.created_by,
                )
                db.add(new_func)
                await db.flush()
                db_project.function_id = new_func.function_id
        else:
            db_project.function_id = None

    if "designation_name" in update_data:
        desig_name = update_data["designation_name"]
        if desig_name:
            desig_result = await db.execute(
                select(Designation).where(
                    Designation.designation_name == desig_name,
                    Designation.organization_id == db_project.organization_id,
                )
            )
            desig = desig_result.scalars().first()
            if desig:
                db_project.designation_id = desig.designation_id
            elif is_active:
                new_desig = Designation(
                    organization_id=db_project.organization_id,
                    function_id=db_project.function_id,
                    designation_name=desig_name,
                    created_by=db_project.created_by,
                )
                db.add(new_desig)
                await db.flush()
                db_project.designation_id = new_desig.designation_id
        else:
            db_project.designation_id = None

    standard_fields = ["project_name", "hiring_goal", "jd_url"]
    for field in standard_fields:
        if field in update_data:
            setattr(db_project, field, update_data[field])

    current_details = dict(db_project.project_details or {})
    details_fields = [
        "approval_managers",
        "hiring_managers",
        "hiring_sponsors",
        "jd_data",
    ]

    details_updated = False
    for field in details_fields:
        if field in update_data:
            current_details[field] = update_data[field]
            details_updated = True

    if details_updated:
        db_project.project_details = current_details

    if "hiring_managers" in update_data:
        await db.execute(
            delete(ProjectHiringManager).where(
                ProjectHiringManager.project_id == project_id
            )
        )
        if update_data["hiring_managers"]:
            hm_result = await db.execute(
                select(UserDetails).where(
                    UserDetails.user_email.in_(update_data["hiring_managers"])
                )
            )
            hm_users = hm_result.scalars().all()
            hm_records = [
                ProjectHiringManager(project_id=project_id, user_id=user.user_id)
                for user in hm_users
            ]
            if hm_records:
                db.add_all(hm_records)

    if "hiring_sponsors" in update_data:
        await db.execute(
            delete(ProjectHiringSponsor).where(
                ProjectHiringSponsor.project_id == project_id
            )
        )
        if update_data["hiring_sponsors"]:
            hs_result = await db.execute(
                select(UserDetails).where(
                    UserDetails.user_email.in_(update_data["hiring_sponsors"])
                )
            )
            hs_users = hs_result.scalars().all()
            hs_records = [
                ProjectHiringSponsor(
                    project_id=project_id,
                    user_id=user.user_id,
                    created_by=db_project.created_by,
                )
                for user in hs_users
            ]
            if hs_records:
                db.add_all(hs_records)

    await db.commit()
    await db.refresh(db_project)
    return db_project


async def auto_resume_paused_projects(db: AsyncSession):
    current_time = datetime.now(timezone.utc)
    stmt = select(Project).where(Project.project_status["status"].astext == "paused")
    result = await db.execute(stmt)
    paused_projects = result.scalars().all()

    for project in paused_projects:
        status_data = dict(project.project_status)
        resume_date_str = status_data.get("resume_date")

        if status_data.get("pause_type") == "until_date" and resume_date_str:
            resume_date_obj = datetime.fromisoformat(resume_date_str)
            if current_time >= resume_date_obj:
                status_data["status"] = "active"
                status_data.pop("pause_type", None)
                status_data.pop("resume_date", None)
                project.project_status = status_data
                flag_modified(project, "project_status")

    await db.commit()


async def duplicate_project_async(db: AsyncSession, project_id: UUID) -> Project:
    # 1. Fetch the original project
    stmt = select(Project).where(Project.project_id == project_id)
    result = await db.execute(stmt)
    original_project = result.scalars().first()

    if not original_project:
        raise ValueError("Original project not found.")

    # 2. Determine the new project name
    base_name = original_project.project_name

    # Check if the name already ends with " (X)"
    match = re.match(r"^(.*) \((\d+)\)$", base_name)
    if match:
        base_name = match.group(1)  # Extract the core name without the number

    # Find all existing projects starting with the base name to calculate the next sequence number
    name_pattern = f"{base_name} (%)"
    name_stmt = select(Project.project_name).where(
        (Project.project_name == base_name) | (Project.project_name.like(name_pattern))
    )
    name_result = await db.execute(name_stmt)
    existing_names = name_result.scalars().all()

    max_num = 0
    for name in existing_names:
        m = re.match(rf"^{re.escape(base_name)} \((\d+)\)$", name)
        if m:
            num = int(m.group(1))
            if num > max_num:
                max_num = num

    new_project_name = f"{base_name} ({max_num + 1})"

    # 3. Create the duplicate project row
    duplicate_project = Project(
        project_name=new_project_name,
        organization_id=original_project.organization_id,
        function_id=original_project.function_id,
        designation_id=original_project.designation_id,
        hiring_goal=original_project.hiring_goal,
        jd_url=original_project.jd_url,
        project_status={"status": "draft"},  # Overwrite status to draft
        created_by=original_project.created_by,
        project_details=original_project.project_details,
    )

    db.add(duplicate_project)
    await db.flush()  # Flush to generate the new project_id

    # 4. Copy Hiring Managers
    hm_stmt = select(ProjectHiringManager).where(
        ProjectHiringManager.project_id == original_project.project_id
    )
    hm_result = await db.execute(hm_stmt)
    existing_hms = hm_result.scalars().all()

    new_hms = [
        ProjectHiringManager(
            project_id=duplicate_project.project_id, user_id=hm.user_id
        )
        for hm in existing_hms
    ]
    if new_hms:
        db.add_all(new_hms)

    # 5. Copy Hiring Sponsors
    hs_stmt = select(ProjectHiringSponsor).where(
        ProjectHiringSponsor.project_id == original_project.project_id
    )
    hs_result = await db.execute(hs_stmt)
    existing_hss = hs_result.scalars().all()

    new_hss = [
        ProjectHiringSponsor(
            project_id=duplicate_project.project_id,
            user_id=hs.user_id,
            created_by=duplicate_project.created_by,
        )
        for hs in existing_hss
    ]
    if new_hss:
        db.add_all(new_hss)

    # 6. Commit the transaction
    await db.commit()
    await db.refresh(duplicate_project)

    return duplicate_project


class ProjectService:
    @staticmethod
    async def delete_project(db: AsyncSession, project_id: UUID) -> bool:
        stmt = delete(Project).where(Project.project_id == project_id)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount > 0


async def get_project_by_id_async(db: AsyncSession, project_id: UUID):
    stmt = (
        select(
            Project,
            Organization.organization_name,
            Function.function_name,
            Designation.designation_name,
        )
        .outerjoin(
            Organization, Project.organization_id == Organization.organization_id
        )
        .outerjoin(Function, Project.function_id == Function.function_id)
        .outerjoin(Designation, Project.designation_id == Designation.designation_id)
        .where(Project.project_id == project_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        return None
    project, org_name, func_name, desig_name = row

    # Extract assigned members and dynamic learning progress
    assigned_members_dict = {}

    from modules.roadmap.model import Roadmap, UserRoadmap
    from modules.roadmap_learning_assessment.model import RoadmapLearningAssessment
    rm_stmt = select(Roadmap).where(Roadmap.project_id == str(project_id))
    rm_res = await db.execute(rm_stmt)
    roadmaps = rm_res.scalars().all()
    roadmap_ids = [rm.roadmap_id for rm in roadmaps]

    from modules.assessment.model import ProjectAssessmentMap
    from modules.assessment_attempt.model import AllocatedExams, Submissions
    from modules.assessment_attempt.encryption import encrypt_allocation_id

    pa_stmt = select(ProjectAssessmentMap).where(ProjectAssessmentMap.project_id == str(project_id))
    pa_res = await db.execute(pa_stmt)
    pa_maps = pa_res.scalars().all()
    assessment_ids = [str(p.assessment_formation_id) for p in pa_maps if p.assessment_formation_id]

    if roadmap_ids:
        ur_stmt = select(UserRoadmap).where(UserRoadmap.roadmap_id.in_(roadmap_ids))
        ur_res = await db.execute(ur_stmt)
        user_roadmaps = ur_res.scalars().all()

        for ur in user_roadmaps:
            u_stmt = select(UserDetails).where(UserDetails.user_id == ur.user_id)
            u_res = await db.execute(u_stmt)
            user = u_res.scalars().first()

            rm_obj = await db.scalar(select(Roadmap).where(Roadmap.roadmap_id == ur.roadmap_id))
            rm_title = rm_obj.title if rm_obj else None
            rm_graph = rm_obj.roadmap_graph if rm_obj else {}

            data = ur.user_roadmap_data or {}
            lp = data.get("learning_progress", {})

            # Fetch all RoadmapLearningAssessment for this roadmap
            rla_stmt = select(RoadmapLearningAssessment).where(RoadmapLearningAssessment.roadmap_id == ur.roadmap_id)
            rla_res = await db.execute(rla_stmt)
            rla_rows = rla_res.scalars().all()
            rla_by_node = {r.node_id: r for r in rla_rows if r.node_id}
            rla_by_id = {str(r.assessment_id): r for r in rla_rows}

            # Query real user quiz submissions and allocations
            user_subs_stmt = (
                select(Submissions, AllocatedExams)
                .join(AllocatedExams, Submissions.allocation_id == AllocatedExams.allocation_id)
                .where(AllocatedExams.user_id == str(ur.user_id))
                .order_by(Submissions.submission_time.desc())
            )
            user_subs_res = await db.execute(user_subs_stmt)
            user_subs_rows = user_subs_res.all()

            subs_by_exam_id = {}
            for sub_obj, alloc_obj in user_subs_rows:
                subs_by_exam_id[str(alloc_obj.exam_id)] = (sub_obj, alloc_obj)

            alloc_stmt = select(AllocatedExams).where(AllocatedExams.user_id == str(ur.user_id))
            alloc_res = await db.execute(alloc_stmt)
            user_allocs = alloc_res.scalars().all()
            alloc_by_exam_id = {str(a.exam_id): a for a in user_allocs}

            # Parse graph nodes and subtopic nodes
            nodes = rm_graph.get("nodes", []) if isinstance(rm_graph, dict) else []
            edges = rm_graph.get("edges", []) if isinstance(rm_graph, dict) else []
            node_map = {n.get("id"): n for n in nodes if n.get("id")}

            # Build parent_map from explicit parentId on nodes
            parent_map = {}
            for n in nodes:
                p_id = n.get("parentId")
                if p_id:
                    if p_id not in parent_map:
                        parent_map[p_id] = []
                    parent_map[p_id].append(n)

            # Also build parent_map from graph edges (source → target) when parentId is absent
            if not parent_map and edges:
                for e in edges:
                    src = e.get("source")
                    tgt = e.get("target")
                    if src and tgt and src in node_map and tgt in node_map:
                        if src not in parent_map:
                            parent_map[src] = []
                        if node_map[tgt] not in parent_map[src]:
                            parent_map[src].append(node_map[tgt])

            # Identify group/chapter nodes
            groups = []
            for n in nodes:
                n_id = n.get("id")
                n_type = str(n.get("type", "")).lower()
                p_id = n.get("parentId")
                if n_type in ("title", "titlenode"):
                    continue
                if (n_id in parent_map) or (p_id is None and ("group" in n_type or "topic" in n_type or "chapter" in n_type)):
                    groups.append(n)

            if not groups and nodes:
                groups = [n for n in nodes if not n.get("parentId") and str(n.get("type", "")).lower() not in ("title", "titlenode")]

            # Assignment nodes
            assignment_nodes = [n for n in nodes if str(n.get("type", "")) == "assignmentNode"]

            # Detect Capstone Project
            capstone_data = None
            capstone_node = None
            for an in assignment_nodes:
                an_data = an.get("data", {})
                an_sem_type = str(an_data.get("semanticType", "")).lower()
                an_label = an_data.get("label", "")
                if an_sem_type == "project" or "capstone" in an_label.lower():
                    capstone_node = an
                    break

            if capstone_node:
                c_id = capstone_node.get("id")
                c_label = capstone_node.get("data", {}).get("label") or "Capstone Project"
                lp_cap = lp.get(c_id, {})
                c_status_raw = lp_cap.get("status") if isinstance(lp_cap, dict) else "not_started"
                
                sub_info = subs_by_exam_id.get(c_id)
                if sub_info:
                    s_obj, a_obj = sub_info
                    c_status = "Completed"
                    c_score = round(s_obj.obtained_percentage)
                    c_correct = f"{s_obj.total_number_of_correct_answer}/{a_obj.total_questions} correct"
                    c_time = s_obj.submission_time.strftime("%Y-%m-%d %H:%M:%S") if s_obj.submission_time else None
                elif c_status_raw in ("done", "completed"):
                    c_status = "Completed"
                    c_score = 100
                    c_correct = "Completed"
                    c_time = lp_cap.get("updated_at")
                elif c_status_raw in ("in_progress", "active"):
                    c_status = "In Progress"
                    c_score = 50
                    c_correct = "In Progress"
                    c_time = None
                else:
                    c_status = "Not Started"
                    c_score = 0
                    c_correct = "Not Started"
                    c_time = None

                p_node = node_map.get(capstone_node.get("parentId"))
                cap_chapter_name = p_node.get("data", {}).get("label") if p_node else "Roadmap Capstone"

                capstone_data = {
                    "node_id": c_id,
                    "title": c_label,
                    "chapter_name": cap_chapter_name,
                    "module_name": "Capstone Project",
                    "status": c_status,
                    "score": c_score,
                    "percent": c_score,
                    "correct_text": c_correct,
                    "submission_time": c_time,
                    "description": "Comprehensive practical capstone project demonstrating mastery across roadmap competencies."
                }

            # Build all real quizzes
            quizzes_list = []
            quiz_seen_ids = set()

            # 1. Skill Gap Baseline Assessment (strictly for this project's assessment_ids)
            if assessment_ids:
                sg_sub = next(((s, a) for s, a in user_subs_rows if str(a.exam_id) in assessment_ids), None)
                if not sg_sub:
                    sg_sub = next(((s, a) for s, a in user_subs_rows if a.assessment_type == "skill_gap_assessment" and str(a.exam_id) in assessment_ids), None)

                if sg_sub:
                    s_obj, a_obj = sg_sub
                    quizzes_list.append({
                        "id": f"sg_{a_obj.allocation_id}",
                        "title": "Skill-Gap Baseline Assessment",
                        "chapter_name": "Baseline Assessment",
                        "module_name": "Skill-Gap Baseline",
                        "assessment_type": "skill_gap_assessment",
                        "status": "Completed",
                        "score": round(s_obj.obtained_percentage),
                        "correct_answers": s_obj.total_number_of_correct_answer,
                        "total_questions": a_obj.total_questions,
                        "correctText": f"{s_obj.total_number_of_correct_answer}/{a_obj.total_questions} correct",
                        "allocation_id": encrypt_allocation_id(a_obj.allocation_id),
                        "submission_time": s_obj.submission_time.strftime("%Y-%m-%d %H:%M:%S") if s_obj.submission_time else None
                    })
                    quiz_seen_ids.add(str(a_obj.exam_id))
                else:
                    # Check if allocated for this project
                    sg_alloc = next((a for a in user_allocs if str(a.exam_id) in assessment_ids), None)
                    if sg_alloc:
                        quizzes_list.append({
                            "id": f"sg_{sg_alloc.allocation_id}",
                            "title": "Skill-Gap Baseline Assessment",
                            "chapter_name": "Baseline Assessment",
                            "module_name": "Skill-Gap Baseline",
                            "assessment_type": "skill_gap_assessment",
                            "status": "In Progress",
                            "score": 0,
                            "correct_answers": 0,
                            "total_questions": sg_alloc.total_questions or 60,
                            "correctText": f"0/{sg_alloc.total_questions or 60} correct",
                            "allocation_id": encrypt_allocation_id(sg_alloc.allocation_id),
                            "submission_time": None
                        })
                        quiz_seen_ids.add(str(sg_alloc.exam_id))
                    else:
                        quizzes_list.append({
                            "id": "sg_not_started",
                            "title": "Skill-Gap Baseline Assessment",
                            "chapter_name": "Baseline Assessment",
                            "module_name": "Skill-Gap Baseline",
                            "assessment_type": "skill_gap_assessment",
                            "status": "Not Started",
                            "score": 0,
                            "correct_answers": 0,
                            "total_questions": 60,
                            "correctText": "0/60 correct",
                            "allocation_id": None,
                            "submission_time": None
                        })

            # 2. RoadmapLearningAssessment entries (Crack it / Smash it)
            for rla in rla_rows:
                rla_id_str = str(rla.assessment_id)
                node = node_map.get(rla.node_id)
                parent_mod = node_map.get(node.get("parentId")) if node else None
                
                mod_name = parent_mod.get("data", {}).get("label") if parent_mod else (node.get("data", {}).get("label") if node else "Roadmap Module")
                ch_name = "Roadmap Quizzes"
                if parent_mod and parent_mod.get("parentId") and parent_mod.get("parentId") in node_map:
                    ch_name = node_map[parent_mod.get("parentId")].get("data", {}).get("label", ch_name)
                elif node and node.get("parentId") and node.get("parentId") in node_map:
                    ch_name = node_map[node.get("parentId")].get("data", {}).get("label", ch_name)

                sub_info = subs_by_exam_id.get(rla_id_str)
                lp_info = lp.get(rla.node_id, {})

                if sub_info:
                    sub_obj, alloc_obj = sub_info
                    q_status = "Completed"
                    q_score = round(sub_obj.obtained_percentage)
                    q_corr = sub_obj.total_number_of_correct_answer
                    q_tot = alloc_obj.total_questions or 5
                    q_alloc = encrypt_allocation_id(alloc_obj.allocation_id)
                    q_time = sub_obj.submission_time.strftime("%Y-%m-%d %H:%M:%S") if sub_obj.submission_time else None
                elif lp_info.get("status") in ("done", "completed") or (isinstance(lp_info.get("assessment"), dict) and lp_info.get("assessment", {}).get("status") == "complete"):
                    q_status = "Completed"
                    q_score = 100
                    q_corr = 5
                    q_tot = 5
                    raw_a = lp_info.get("allocation_id") or (lp_info.get("assessment", {}).get("allocation_id") if isinstance(lp_info.get("assessment"), dict) else None)
                    q_alloc = encrypt_allocation_id(raw_a) if raw_a else None
                    q_time = lp_info.get("updated_at")
                elif lp_info.get("status") in ("in_progress", "active") or rla_id_str in alloc_by_exam_id:
                    q_status = "In Progress"
                    q_score = 0
                    q_corr = 0
                    q_tot = 5
                    alloc_rec = alloc_by_exam_id.get(rla_id_str)
                    q_alloc = encrypt_allocation_id(alloc_rec.allocation_id) if alloc_rec else None
                    q_time = None
                else:
                    q_status = "Not Started"
                    q_score = 0
                    q_corr = 0
                    q_tot = 5
                    q_alloc = None
                    q_time = None

                quizzes_list.append({
                    "id": f"rla_{rla.assessment_id}",
                    "title": rla.title,
                    "node_id": rla.node_id,
                    "chapter_name": ch_name,
                    "module_name": mod_name,
                    "assessment_type": "roadmap_learning_assessment",
                    "status": q_status,
                    "score": q_score,
                    "correct_answers": q_corr,
                    "total_questions": q_tot,
                    "correctText": f"{q_corr}/{q_tot} correct" if q_status == "Completed" else ("In Progress" if q_status == "In Progress" else f"0/{q_tot} correct"),
                    "allocation_id": q_alloc,
                    "submission_time": q_time
                })
                quiz_seen_ids.add(rla_id_str)
                if rla.node_id:
                    quiz_seen_ids.add(rla.node_id)

            # 3. Add any assignmentNode assessments not covered by RLA (e.g. Final Assessment or Module Assessment)
            for an in assignment_nodes:
                an_id = an.get("id")
                an_data = an.get("data", {})
                an_label = an_data.get("label", "Assessment")
                an_sem_type = str(an_data.get("semanticType", "")).lower()

                if an_sem_type == "project" or "capstone" in an_label.lower():
                    continue  # already handled in capstone_data
                if an_id in quiz_seen_ids:
                    continue

                parent = node_map.get(an.get("parentId"))
                p_name = parent.get("data", {}).get("label") if parent else "Roadmap Level"
                lp_an = lp.get(an_id, {})
                sub_info = subs_by_exam_id.get(an_id)

                if sub_info:
                    s_obj, al_obj = sub_info
                    st = "Completed"
                    sc = round(s_obj.obtained_percentage)
                    co = s_obj.total_number_of_correct_answer
                    to = al_obj.total_questions or 10
                    al = encrypt_allocation_id(al_obj.allocation_id)
                    tm = s_obj.submission_time.strftime("%Y-%m-%d %H:%M:%S") if s_obj.submission_time else None
                elif lp_an.get("status") in ("done", "completed"):
                    st = "Completed"
                    sc = 100
                    co = 10
                    to = 10
                    al = None
                    tm = None
                elif lp_an.get("status") in ("in_progress", "active") or an_id in alloc_by_exam_id:
                    st = "In Progress"
                    sc = 0
                    co = 0
                    to = 10
                    alloc_rec = alloc_by_exam_id.get(an_id)
                    al = encrypt_allocation_id(alloc_rec.allocation_id) if alloc_rec else None
                    tm = None
                else:
                    st = "Not Started"
                    sc = 0
                    co = 0
                    to = 10
                    al = None
                    tm = None

                quizzes_list.append({
                    "id": f"an_{an_id}",
                    "title": an_label,
                    "node_id": an_id,
                    "chapter_name": p_name,
                    "module_name": p_name,
                    "assessment_type": "roadmap_learning_assessment",
                    "status": st,
                    "score": sc,
                    "correct_answers": co,
                    "total_questions": to,
                    "correctText": f"{co}/{to} correct" if st == "Completed" else f"0/{to} correct",
                    "allocation_id": al,
                    "submission_time": tm
                })
                quiz_seen_ids.add(an_id)

            # Build parsed_chapters with nested quizzes and capstone
            parsed_chapters = []
            total_leaf_nodes = 0
            done_leaf_nodes = 0

            for idx, g in enumerate(groups):
                g_id = g.get("id")
                g_label = g.get("data", {}).get("label") or f"Chapter {idx + 1}"
                children = parent_map.get(g_id, [])

                sub_modules = []
                done_in_group = 0
                for child in children:
                    c_id = child.get("id")
                    c_label = child.get("data", {}).get("label") or "Module"
                    c_status_raw = lp.get(c_id, {})

                    c_status = "not_started"
                    alloc_id_sub = None
                    if isinstance(c_status_raw, dict):
                        c_status = c_status_raw.get("status", "not_started")
                        raw_alloc = c_status_raw.get("allocation_id") or c_status_raw.get("assessment", {}).get("allocation_id")
                        if raw_alloc:
                            alloc_id_sub = encrypt_allocation_id(raw_alloc)

                    if c_status in ("done", "completed"):
                        done_in_group += 1
                        done_leaf_nodes += 1
                        status_label = "Completed"
                    elif c_status in ("in_progress", "active"):
                        status_label = "In Progress"
                    else:
                        status_label = "Not Started"

                    total_leaf_nodes += 1

                    # Match any quiz for this sub-module
                    mod_quiz = next((q for q in quizzes_list if q.get("node_id") == c_id or q.get("module_name") == c_label), None)

                    sub_modules.append({
                        "id": c_id,
                        "name": c_label,
                        "status": status_label,
                        "allocation_id": alloc_id_sub,
                        "quiz": mod_quiz
                    })

                group_status = "Done" if (len(children) > 0 and done_in_group == len(children)) else ("In Progress" if done_in_group > 0 else "Not Started")

                # Chapter quizzes
                chapter_quizzes = [q for q in quizzes_list if q.get("chapter_name") == g_label or any(sm.get("name") == q.get("module_name") for sm in sub_modules)]

                parsed_chapters.append({
                    "id": idx + 1,
                    "title": g_label,
                    "modulesCount": len(children),
                    "doneCount": done_in_group,
                    "status": group_status,
                    "subModules": sub_modules,
                    "quizzes": chapter_quizzes
                })

            total_nodes = total_leaf_nodes if total_leaf_nodes > 0 else len(lp)
            done_nodes = done_leaf_nodes if total_leaf_nodes > 0 else sum(1 for v in lp.values() if isinstance(v, dict) and v.get("status") in ("done", "completed"))

            if total_nodes > 0 and done_nodes == total_nodes:
                member_status = "Completed"
            elif done_nodes > 0 or total_nodes > 0:
                member_status = "In progress"
            else:
                member_status = "Not started"

            progress_pct = round((done_nodes / total_nodes * 100)) if total_nodes > 0 else 0

            name = (user.user_name if user and user.user_name else (user.user_email.split("@")[0] if user else "Team Member")).title()
            email = user.user_email if user else "member@organization.com"
            designation = (user.designation_specialization if user and user.designation_specialization else "Software Developer")
            role = (user.provided_role if user and user.provided_role else "Learner")

            alloc_id = None
            if assessment_ids:
                alloc_stmt = select(AllocatedExams).where(
                    AllocatedExams.user_id == str(ur.user_id),
                    AllocatedExams.exam_id.in_(assessment_ids)
                ).order_by(AllocatedExams.allocated_date.desc())
                alloc_res = await db.execute(alloc_stmt)
                alloc = alloc_res.scalars().first()
                if alloc:
                    alloc_id = encrypt_allocation_id(alloc.allocation_id)


            # Quiz summary metrics
            taken_quizzes = [q for q in quizzes_list if q.get("status") == "Completed" or (q.get("score") and q.get("score") > 0)]
            taken_quizzes_count = len(taken_quizzes)
            avg_quiz_score = round(sum(q["score"] for q in taken_quizzes) / taken_quizzes_count) if taken_quizzes_count > 0 else 0

            capstone_percent = capstone_data.get("percent", 0) if capstone_data else 0
            capstone_status_str = capstone_data.get("status", "Not started") if capstone_data else "Not started"

            assigned_members_dict[ur.user_id] = {
                "id": ur.user_id,
                "name": name,
                "email": email,
                "role": role,
                "designation": designation,
                "department": func_name or "Engineering",
                "status": member_status,
                "progress": progress_pct,
                "completed_nodes": done_nodes,
                "total_nodes": total_nodes,
                "allocation_id": alloc_id,
                "allocationId": alloc_id,
                "roadmap_id": ur.roadmap_id,
                "roadmap_title": rm_title,
                "roadmap_chapters": parsed_chapters,
                "user_quizzes": quizzes_list,
                "capstone_project": capstone_data,
                "capstonePercent": capstone_percent,
                "capstoneStatus": capstone_status_str,
                "total_quizzes_count": len(quizzes_list),
                "taken_quizzes_count": taken_quizzes_count,
                "avg_quiz_score": avg_quiz_score,
            }

    details = project.project_details or {}
    hiring_managers = details.get("hiring_managers", [])
    for hm_email in hiring_managers:
        u_stmt = select(UserDetails).where(UserDetails.user_email == hm_email)
        u_res = await db.execute(u_stmt)
        user = u_res.scalars().first()
        if user and user.user_id not in assigned_members_dict:
            alloc_id = None
            if user:
                alloc_stmt = select(AllocatedExams).where(AllocatedExams.user_id == str(user.user_id)).order_by(AllocatedExams.allocated_date.desc())
                alloc_res = await db.execute(alloc_stmt)
                alloc = alloc_res.scalars().first()
                if alloc:
                    alloc_id = encrypt_allocation_id(alloc.allocation_id)

            assigned_members_dict[user.user_id] = {
                "id": user.user_id,
                "name": (user.user_name or hm_email.split("@")[0]).title(),
                "email": hm_email,
                "role": user.provided_role or "Hiring Manager",
                "designation": user.designation_specialization or "Manager",
                "department": func_name or "Management",
                "status": "Not started",
                "progress": 0,
                "completed_nodes": 0,
                "total_nodes": 0,
                "allocation_id": alloc_id,
                "allocationId": alloc_id,
            }

    members_list = list(assigned_members_dict.values())

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
        "profiles_count": len(members_list),
        "avg_score": None,
        "shortlisted_count": None,
        "assigned_members": members_list,
    }


# async def get_all_projects_async(db: AsyncSession):
#     stmt = (
#         select(
#             Project,
#             Organization.organization_name,
#             Function.function_name,
#             Designation.designation_name,
#         )
#         .outerjoin(
#             Organization, Project.organization_id == Organization.organization_id
#         )
#         .outerjoin(Function, Project.function_id == Function.function_id)
#         .outerjoin(Designation, Project.designation_id == Designation.designation_id)
#     )
#     result = await db.execute(stmt)
#     projects_data = []
#     for row in result.all():
#         project, org_name, func_name, desig_name = row
#         projects_data.append(
#             {
#                 "project_id": project.project_id,
#                 "project_name": project.project_name,
#                 "organization_name": org_name,
#                 "function_name": func_name,
#                 "designation_name": desig_name,
#                 "hiring_goal": project.hiring_goal,
#                 "jd_url": project.jd_url,
#                 "project_status": project.project_status,
#                 "created_at": project.created_at,
#                 "created_by": project.created_by,
#                 "project_details": project.project_details,
#                 "profiles_count": None,
#                 "avg_score": None,
#                 "shortlisted_count": None,
#             }
#         )
#     return projects_data
# async def get_all_projects_async(db: AsyncSession, organization_id: Optional[UUID] = None):
# #change_by_rohan
# async def get_all_projects_async(db: AsyncSession, organization_id: Optional[UUID] = None, user_email: Optional[str] = None):

#change_by_rohan
async def get_all_projects_async(
    db: AsyncSession, 
    organization_id: str, 
    current_user_id: str,

):
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
        .where(Project.created_by==current_user_id,Project.organization_id==organization_id)
        .order_by(Project.created_at.desc())  # #change_by_rohan (Order by latest first)
    )   
    
    result = await db.execute(stmt)
    projects_data = []
    for row in result.all():
        project, org_name, func_name, desig_name = row 
        project_details={k: v for k, v in project.project_details.items() if k not in ['jd_data']}

        projects_data.append({
            "project_id": project.project_id,
            "project_name": project.project_name,
            "organization_name": org_name,
            "function_name": func_name,
            "designation_name": desig_name,
            "hiring_goal": project.hiring_goal,
            # "jd_url": project.jd_url,
            "project_status": project.project_status,
            "created_at": project.created_at,
            "created_by": project.created_by,
            "project_details": project_details,
            "profiles_count": None,
            "avg_score": None,
            "shortlisted_count": None
        })
    return projects_data

async def update_project_status_async(
    db: AsyncSession, project_id: UUID, status_in: ProjectStatus
):
    stmt = select(Project).where(Project.project_id == project_id)
    result = await db.execute(stmt)
    db_project = result.scalars().first()

    if not db_project:
        return None, None

    previous_status = (
        dict(db_project.project_status) if db_project.project_status else {}
    )
    new_status = (
        status_in.model_dump(mode="json")
        if hasattr(status_in, "model_dump")
        else status_in
    )

    if new_status.get("status") != "paused":
        new_status["pause_type"] = None
        new_status["resume_date"] = None

    db_project.project_status = new_status

    await db.commit()
    await db.refresh(db_project)

    return previous_status, new_status
