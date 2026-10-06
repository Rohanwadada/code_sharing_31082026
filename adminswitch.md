# Role-Based Access Control (Pure Frontend Admin Switch)

## 1. Executive Summary & Objective

When a user logs in, `useAuthStore` stores `userDetails` (including their `role`). By default, users are treated as **Learners** unless explicitly assigned an **Admin** role (`'admin'`, `'superadmin'`, `'organization_admin'`).

This document outlines the **Pure Frontend** implementation for the Admin Switch. **No backend modifications are required**.

### Goal:
- **Admin Users**: See the full interface: `+ Create Projects` button, **My Learning**, **My Team**, **My Organisation**, full project leaderboards, and candidate assignments.
- **Non-Admin / Learner Users (Default)**:
  - **Hide `+ Create Projects` button** in the Sidebar and Project Dashboard.
  - **Hide `My Team`** and **`My Organisation`** tabs in the Sidebar.
  - Only show **My Learning** / Self-assigned projects.
  - Prevent direct URL access to admin routes (`/project/create-project`, `/project?mandate=team`, `/project?mandate=organization`) by redirecting non-admins to `/dashboard`.
  - In shared project views, isolate leaderboards and member tables so learners only see their own individual progress.

---

## 2. Role Determination Standard

Throughout all frontend components, role evaluation should follow a unified helper or pattern:

```javascript
// Helper to check admin status from authStore
export const checkIsAdmin = (userDetails) => {
  const role = (userDetails?.role || userDetails?.provided_role || '').toLowerCase().trim();
  return ['admin', 'superadmin', 'organization_admin'].includes(role);
};
```

---

## 3. Required Frontend Changes (File by File)

### 1. Sidebar (`frontend/src/components/shared/Sidebar.jsx`)

#### What to change:
1. Determine `isAdmin` from `userDetails`.
2. Hide the `+ Create Projects` top button for non-admins.
3. Hide the `My Team` and `My Organisation` tabs under the **Projects** section for non-admins.

#### Code Snippet:
```jsx
// In frontend/src/components/shared/Sidebar.jsx

const userDetails = useAuthStore((s) => s.userDetails);
const userRole = (userDetails?.role || userDetails?.provided_role || '').toLowerCase().trim();
const isAdmin = ['admin', 'superadmin', 'organization_admin'].includes(userRole);

// ... Inside return JSX ...

{/* ── 1. Create Projects Button at Top (Available for all users) ── */}
<div className={`${styles['create-project-btn-wrap']} ${styles['label']}`}>
  <button
    className={styles['create-project-btn']}
    onClick={() => router.push('/project/create-project')}
  >
    <span className={styles['create-project-plus']}>+</span>
    <span>Create Projects</span>
  </button>
</div>

{/* ── For Normal User (Learner): Standalone My Learning item without "Projects" section heading ── */}
{!isAdmin && (
  <div className={styles['sidebar-items']}>
    <div className={styles['sidebar-item']}>
      <div
        className={`${styles['sidebar-item-head']} ${activeTab === 'dashboard' ? styles['active-item'] : ''}`}
        onClick={handleGoToDashboard}
      >
        <Book />
        <span className={styles['label']}>My Learning</span>
      </div>
    </div>
  </div>
)}

{/* ── For Admin Only: PROJECTS Section (Projects heading, My Learning, My Team, My Organisation) ── */}
{isAdmin && (
  <div className={styles['sidebar-section']}>
    <div className={`${styles['section-title']} ${styles['label']} ${styles['projects-section-title']}`}>
      Projects
    </div>

    <div className={styles['sidebar-items']}>
      {/* My Learning */}
      <div className={styles['sidebar-item']}>
        <div
          className={`${styles['sidebar-item-head']} ${activeTab === 'dashboard' ? styles['active-item'] : ''}`}
          onClick={handleGoToDashboard}
        >
          <Book />
          <span className={styles['label']}>My Learning</span>
        </div>
      </div>

      {/* My Team */}
      <div className={styles['sidebar-item']}>
        <div
          className={`${styles['sidebar-item-head']} ${activeTab === 'team-projects' ? styles['active-item'] : ''}`}
          onClick={() => {
            setActiveTab('team-projects');
            router.push('/project?mandate=team');
          }}
        >
          <TeamOutlineIcon />
          <span className={styles['label']}>My Team</span>
        </div>
      </div>

      {/* My Organisation */}
      <div className={styles['sidebar-item']}>
        <div
          className={`${styles['sidebar-item-head']} ${activeTab === 'org-projects' ? styles['active-item'] : ''}`}
          onClick={() => {
            setActiveTab('org-projects');
            router.push('/project?mandate=organization');
          }}
        >
          <OrgIcon />
          <span className={styles['label']}>My Organisation</span>
        </div>
      </div>
    </div>
  </div>
)}

{/* ── 4. Bottom PROJECTS Section (Admin Only) ── */}
{isAdmin && (
  <div className={styles['sidebar-section']}>
    <div className={`${styles['section-title']} ${styles['label']} ${styles['projects-section-title']}`}>
      Projects
    </div>

    <div className={styles['sidebar-items']}>
      <div className={styles['sidebar-item']}>
        <div
          className={`${styles['sidebar-item-head']} ${activeTab === 'project' ? styles['active-item-gold'] : ''}`}
          onClick={handleGoToProject}
        >
          <Dashboard />
          <span className={styles['label']}>Projects</span>
        </div>
      </div>
    </div>
  </div>
)}
```

---

### 2. Project Dashboard (`frontend/src/components/project/newprojectDashboard.jsx`)

#### What to change:
1. Hide the header `+ Create Project` button for non-admins.
2. If non-admin accesses `/project`, filter project cards to only show self/assigned learning projects (`mandate === 'self'`), and prevent switching to Team/Organization filter views.

#### Code Snippet:
```jsx
// In frontend/src/components/project/newprojectDashboard.jsx

const userDetails = useAuthStore((s) => s.userDetails);
const userRole = (userDetails?.role || userDetails?.provided_role || '').toLowerCase().trim();
const isAdmin = ['admin', 'superadmin', 'organization_admin'].includes(userRole);

// 1. Hide Create Project Button
{isAdmin && (
  <button 
    className={styles['create-project-btn']}
    onClick={() => router.push('/project/create-project')}
  >
    + Create Project
  </button>
)}

// 2. Filter Projects for Non-Admins
const filteredProjects = useMemo(() => {
  let list = projects || [];
  
  if (!isAdmin) {
    // Non-admin only sees self / personal learning projects
    list = list.filter((p) => {
      const mandate = (p?.project_details?.project_mandate || 'self').toLowerCase();
      return mandate === 'self';
    });
  }
  
  return list;
}, [projects, isAdmin]);
```

---

### 3. Route Guard for Create Project & Admin Pages (`frontend/src/app/(main)/project/create-project/page.jsx`)

#### What to change:
Wrap the Create Project page in `ProtectedRoute` with `allowedRoles={['admin', 'superadmin', 'organization_admin']}` or perform a redirect in `useEffect`.

#### Code Snippet:
```jsx
// In frontend/src/app/(main)/project/create-project/page.jsx (or CreateProject_v2.jsx)

import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function CreateProjectPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin', 'organization_admin']}>
      <CreateProject_v3 />
    </ProtectedRoute>
  );
}
```

---

### 4. Project Member / Team Details Privacy (`frontend/src/components/project/my_teams.jsx` & `my_organization.jsx`)

#### What to change:
In project details view (`/project/[projectId]`), if a non-admin opens the page, ensure the members table and leaderboard only render **their own** learner record rather than other team members' private quiz scores and completion percentages.

#### Code Snippet:
```javascript
// In frontend/src/components/project/my_teams.jsx & my_organization.jsx

const rawMembers = useMemo(() => {
  const list = projectData?.assigned_members || [];
  const currentUserId = userDetails?.id || userDetails?.user_id;
  const currentUserEmail = (userDetails?.email || '').toLowerCase().trim();
  const currentUserName = userDetails?.name || userDetails?.user_name || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Learner');

  const userRole = (userDetails?.role || userDetails?.provided_role || '').toLowerCase().trim();
  const isAdmin = ['admin', 'superadmin', 'organization_admin'].includes(userRole);
    progress: 0,
    completed_nodes: 0,
    total_nodes: 0,
    user_quizzes: [],
  }];
}, [projectData, userDetails]);
```

---

## 4. Summary of Changes Checklist

| Component | Target File | What Is Changed |
| :--- | :--- | :--- |
| **Sidebar `+ Create Projects`** | [Sidebar.jsx](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/shared/Sidebar.jsx) | Wrapped with `{isAdmin && ...}` condition. |
| **Sidebar `My Team` & `My Organisation`** | [Sidebar.jsx](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/shared/Sidebar.jsx) | Wrapped with `{isAdmin && ...}` condition. Only **My Learning** is visible for learners. |
| **Create Project Header Button** | [newprojectDashboard.jsx](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/newprojectDashboard.jsx) | Wrapped with `{isAdmin && ...}` condition. |
| **Create Project Route Guard** | [create-project/page.jsx](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/app/(main)/project/create-project/page.jsx) | Restrict access using `ProtectedRoute allowedRoles={['admin', 'superadmin', 'organization_admin']}`. |
| **Member Privacy in Team/Org** | [my_teams.jsx](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/my_teams.jsx), [my_organization.jsx](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/my_organization.jsx) | Non-admins only see their own individual progress in tables and leaderboards. |

---

## 5. Verification Steps

1. **Log in as Admin (e.g. `role: 'admin'`)**:
   - `+ Create Projects` button is visible in Sidebar and Projects page.
   - **My Learning**, **My Team**, and **My Organisation** tabs are all accessible in the sidebar.
   - Team and Organisation projects display all assigned candidates and rankings.

2. **Log in as Learner (e.g. `role: 'learner'` or default non-admin)**:
   - `+ Create Projects` button is **available**.
   - **My Team**, **My Organisation**, and bottom **Projects** tabs are **hidden** in the sidebar.
   - The user sees **My Learning**.
   - Accessing a shared project URL displays only the learner's own progress and quiz analytics.

---

## 6. Backend Integration: User-ID Driven Project Fetching (`/get-all-projects`)

**Date:** 28-09-2026  
**Scope:** `backend/modules/project/router.py` & `backend/modules/project/service.py`
  // 1. Admin: Show full team / org members list
  if (isAdmin) {
    return list;
  }

  // 2. Non-Admin (Learner): Return only their own record
  const ownRecord = list.find((m) => {
    if (currentUserId && (String(m.id) === String(currentUserId) || String(m.user_id) === String(currentUserId))) return true;
    if (currentUserEmail && m.email && m.email.toLowerCase().trim() === currentUserEmail) return true;
    return false;
  });

  if (ownRecord) {
    return [ownRecord];
  }

  // Fallback for self record
  return [{
    id: currentUserId || '1',
    name: currentUserName,
    email: currentUserEmail || '',
    role: projectData?.designation_name || userDetails?.designation || 'Learner',
    unit: projectData?.function_name || 'General',
    status: 'In Progress',


### 6.1 Overview
The project retrieval endpoint `GET /get-all-projects` was updated to make the authenticated **`current_user_id`** the primary mandatory requirement, while making **`organization_id`** an optional filter.

### 6.2 Router Implementation (`backend/modules/project/router.py`)

```python
# #changes 28-09-2026 - start: Make user_id mandatory/primary and organization_id optional
# Previous Code:
# @router.get("/get-all-projects", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
# async def get_projects(
#     organization_id: str,
#     db: AsyncSession = Depends(get_db),
#     user: UserDetails = Depends(get_current_user)
# ):
#     try:
#         current_user_id = str(user.user_id)
#         projects = await get_all_projects_async(
#             db=db, 
#             organization_id=organization_id, 
#             current_user_id=current_user_id,
#         )
#         return projects
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

# Present Code:
@router.get("/get-all-projects", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
async def get_projects(
    organization_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: UserDetails = Depends(get_current_user)  # Mandatory authenticated user
):
    try:
        if not user or not user.user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User authentication required")
            
        current_user_id = str(user.user_id)
        projects = await get_all_projects_async(
            db=db, 
            current_user_id=current_user_id,
            organization_id=organization_id,
        )
        return projects
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")
# #changes 28-09-2026 - end
```

### 6.3 Service Implementation (`backend/modules/project/service.py`)

```python
# #changes 28-09-2026 - start: Make current_user_id mandatory/primary and organization_id optional in get_all_projects_async
async def get_all_projects_async(
    db: AsyncSession, 
    current_user_id: str,
    organization_id: Optional[str] = None, 
):
    from modules.roadmap.model import Roadmap, UserRoadmap
    from modules.assessment.model import ProjectAssessmentMap
    from modules.assessment_attempt.model import AllocatedExams
    from modules.project.model import ProjectHiringManager

    user_id_str = str(current_user_id)

    # 1. Projects with roadmaps assigned to user by ID
    rm_proj_subq = (
        select(Roadmap.project_id)
        .join(UserRoadmap, Roadmap.roadmap_id == UserRoadmap.roadmap_id)
        .where(UserRoadmap.user_id == user_id_str)
    )

    # 2. Projects with assessments allocated to user by ID via AllocatedExams
    pa_alloc_subq = (
        select(ProjectAssessmentMap.project_id)
        .join(AllocatedExams, ProjectAssessmentMap.assessment_formation_id == AllocatedExams.exam_id)
        .where(AllocatedExams.user_id == user_id_str)
    )

    # 3. Projects with user as hiring manager by ID
    hm_proj_subq = (
        select(ProjectHiringManager.project_id)
        .where(ProjectHiringManager.user_id == user_id_str)
    )

    # Combined user assignment conditions
    assigned_conditions = [
        Project.created_by == user_id_str,
        Project.project_id.in_(rm_proj_subq),
        Project.project_id.in_(pa_alloc_subq),
        Project.project_id.in_(hm_proj_subq),
    ]

    where_clauses = [or_(*assigned_conditions)]
    if organization_id:
        where_clauses.append(Project.organization_id == organization_id)

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
        .where(*where_clauses)
        .order_by(Project.created_at.desc())
    )
    result = await db.execute(stmt)
    projects_data = []
    seen_project_keys = set()
    for row in result.all():
        project, org_name, func_name, desig_name = row 
        project_details={k: v for k, v in (project.project_details or {}).items() if k not in ['jd_data']}

        # Deduplicate projects with same name and mandate, keeping the latest one
        mandate = (project_details.get("project_mandate") or "default").lower().strip()
        clean_name = (project.project_name or "").strip().lower()
        key = (clean_name, mandate)
        if key in seen_project_keys:
            continue
        seen_project_keys.add(key)

        projects_data.append({
            "project_id": project.project_id,
            "project_name": project.project_name,
            "organization_name": org_name,
            "function_name": func_name,
            "designation_name": desig_name,
            "hiring_goal": project.hiring_goal,
            "project_status": project.project_status,
            "created_at": project.created_at,
            "created_by": project.created_by,
            "project_details": project_details,
            "profiles_count": None,
            "avg_score": None,
            "shortlisted_count": None
        })
    return projects_data
# #changes 28-09-2026 - end
```

---

## 7. Assessment Creation & Project Wizard Fixes (28-09-2026)

### 7.1 Root Causes Identified
1. **`project-wizard/save` 500 Internal Server Error**:
   - `backend/modules/project_wizard/router.py` accessed `current_user.organization_id`, but `UserDetails` has no `organization_id` attribute, triggering an `AttributeError`.
   - **Fix:** Safely retrieve `org_id = getattr(current_user, "organization_id", None)` and pass it down.
2. **`POST /api/v1/assessment` UUID DataError**:
   - When a project or learner has no organization (`organization_id` sent as `""` empty string), PostgreSQL rejected the empty string with `DataError: invalid input for query argument $5: '' (invalid UUID)`.
   - **Fix:** In [schema.py](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment/schema.py), updated `organization_id: Optional[str] = None`. In [service.py](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment/service.py), sanitized `organization_id` to `None` if empty, or fall back to `project.organization_id`.

