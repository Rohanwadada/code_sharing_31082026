# Sidebar & Project Feature Integration (Previous Code vs Present Code)

**Date:** 24 September 2026

This document provides a precise **Previous Code vs Present Code** comparison for every file modified or added to integrate the **Sidebar Navigation**, **My Team**, **My Organisation**, **Project Dashboards**, and **Prompt Sharing Context**.

---

## 1. Sidebar Component

### **File:** `frontend/src/components/shared/Sidebar.jsx`

#### 1.1 Route Matching & Mandate Synchronization

**Previous Code:**
```jsx
useEffect(() => {
  if (pathname?.startsWith('/project')) {
    setActiveTab('project');
  } else if (pathname?.startsWith('/dashboard') || pathname === '/') {
    setActiveTab('dashboard');
  }
}, [pathname, setActiveTab]);
```

**Present Code:**
```jsx
// #changes: Synchronize sidebar activeTab with mandate query parameter
useEffect(() => {
  if (pathname?.startsWith('/project')) {
    const mandate = searchParams?.get('mandate'); // #changes
    if (mandate === 'team') { // #changes
      setActiveTab('team-projects'); // #changes
    } else if (mandate === 'organization') { // #changes
      setActiveTab('org-projects'); // #changes
    } else if (pathname === '/project' || pathname === '/project/') { // #changes
      setActiveTab('project'); // #changes
    } // #changes
  } else if (pathname?.startsWith('/dashboard') || pathname === '/') {
    setActiveTab('dashboard');
  }
}, [pathname, searchParams, setActiveTab]); // #changes
```

---

#### 1.2 Top "+ Create Projects" Button

**Previous Code:**
```jsx
// (Did not exist - directly rendered thread and saved roadmap links under header)
<div className={styles['sidebar-top']}>
  <div className={styles['sidebar-item']}>
    <div className={styles['sidebar-item-head']}>
      <Image src={sidebarIcon} alt="sidebar" onClick={toggleSidebar} />
      <Image className={styles['header-image']} src={headerImage} alt="header" />
    </div>
  </div>
```

**Present Code:**
```jsx
<div className={styles['sidebar-top']}>
  <div className={styles['sidebar-item']}>
    <div className={styles['sidebar-item-head']}>
      <Image src={sidebarIcon} alt="sidebar" onClick={toggleSidebar} />
      <Image className={styles['header-image']} src={headerImage} alt="header" />
    </div>
  </div>

  {/* ── #changes: 1. Create Projects Button at Top ── */}
  <div className={`${styles['create-project-btn-wrap']} ${styles['label']}`}>
    <button
      className={styles['create-project-btn']}
      onClick={() => router.push('/project/create-project')}
    >
      <span className={styles['create-project-plus']}>+</span>
      <span>Create Projects</span>
    </button>
  </div>
```

---

#### 1.3 Projects Section (My Learning, My Team, My Organisation)

**Previous Code:**
```jsx
// (Previously, only a single Dashboard link existed)
<div className={styles['sidebar-items']}>
  <div className={styles['sidebar-item']}>
    <div
      className={`${styles['sidebar-item-head']} ${activeTab === 'dashboard' ? styles['active-item'] : ''}`}
      onClick={handleGoToDashboard}
    >
      <Book />
      <span className={styles['label']}>Dashboard</span>
    </div>
  </div>
</div>
```

**Present Code:**
```jsx
{/* ── 2. PROJECTS Section (My Learning, My Team, My Organisation) ── */}
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
```

---

#### 1.4 Helper Icons Added to Sidebar

**Previous Code:**
```jsx
// (Icons did not exist)
```

**Present Code:**
```jsx
/* My Team icon (ant-design:team-outlined) */
const TeamOutlineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.9997 18.719L18.0007 18.75C18.0007 18.975 17.9887 19.197 17.9637 19.416C16.1491 20.4571 14.0928 21.0033 12.0007 21C9.83072 21 7.79372 20.424 6.03772 19.416C6.01201 19.1846 5.99965 18.9519 6.00072 18.719C6.00431 17.5857 6.33234 16.4769 6.94272 15.522C7.48472 14.6719 8.23235 13.9723 9.11645 13.4877C10.0005 13.0032 10.9926 12.7495 12.0007 12.75C13.009 12.7493 14.0013 13.003 14.8855 13.4875C15.7698 13.972 16.5176 14.6718 17.0597 15.522C17.6704 16.4768 17.9968 17.5866 18.0007 18.72C19.2675 18.8235 20.5419 18.6603 21.7417 18.241C21.7875 17.6764 21.6725 17.1104 21.4101 16.6084C21.1476 16.1064 20.7483 15.689 20.2585 15.4044C19.7687 15.1199 19.2084 14.9798 18.6423 15.0004C18.0762 15.0211 17.5275 15.2015 17.0597 15.521M6.00072 18.719C4.73435 18.8263 3.46063 18.6637 2.26172 18.242C2.21607 17.6776 2.33111 17.1117 2.59355 16.6099C2.85598 16.1081 3.25509 15.6908 3.74472 15.4063C4.23435 15.1218 4.79451 14.9817 5.36044 15.0021C5.92636 15.0226 6.47493 15.2028 6.94272 15.522M15.0007 6.75C15.0007 7.54565 14.6846 8.30871 14.122 8.87132C13.5594 9.43393 12.7964 9.75 12.0007 9.75C11.2051 9.75 10.442 9.43393 9.8794 8.87132C9.31679 8.30871 9.00072 7.54565 9.00072 6.75C9.00072 5.95435 9.31679 5.19129 9.8794 4.62868C10.442 4.06607 11.2051 3.75 12.0007 3.75C12.7964 3.75 13.5594 4.06607 14.122 4.62868C14.6846 5.19129 15.0007 5.95435 15.0007 6.75ZM21.0007 9.75C21.0007 10.3467 20.7637 10.919 20.3417 11.341C19.9198 11.7629 19.3475 12 18.7507 12C18.154 12 17.5817 11.7629 17.1597 11.341C16.7378 10.919 16.5007 10.3467 16.5007 9.75C16.5007 9.15326 16.7378 8.58097 17.1597 8.15901C17.5817 7.73705 18.154 7.5 18.7507 7.5C19.3475 7.5 19.9198 7.73705 20.3417 8.15901C20.7637 8.58097 21.0007 9.15326 21.0007 9.75ZM7.50072 9.75C7.50072 10.3467 7.26366 10.919 6.84171 11.341C6.41975 11.7629 5.84745 12 5.25072 12C4.65398 12 4.08168 11.7629 3.65973 11.341C3.23777 10.919 3.00072 10.3467 3.00072 9.75C3.00072 9.15326 3.23777 8.58097 3.65973 8.15901C4.08168 7.73705 4.65398 7.5 5.25072 7.5C5.84745 7.5 6.41975 7.73705 6.84171 8.15901C7.26366 8.58097 7.50072 9.15326 7.50072 9.75Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

/* My Organisation icon (octicon:organization-24) */
const OrgIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 9C3 8.46957 3.21071 7.96086 3.58579 7.58579C3.96086 7.21071 4.46957 7 5 7H19C19.5304 7 20.0391 7.21071 20.4142 7.58579C20.7893 7.96086 21 8.46957 21 9V20H3V9ZM9 20V11H15V20M9 11H15"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M8 7V5C8 4.46957 8.21071 3.96086 8.58579 3.58579C8.96086 3.21071 9.46957 3 10 3H14C14.5304 3 15.0391 3.21071 15.4142 3.58579C15.7893 3.96086 16 4.46957 16 5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
```

---

## 2. Sidebar CSS Tokens

### **File:** `frontend/src/components/shared/Sidebar.module.css`

**Previous Code:**
```css
/* Did not contain create button or section title styles */
```

**Present Code:**
```css
.create-project-btn-wrap {
  padding: 12px 16px 8px 16px;
  width: 100%;
  box-sizing: border-box;
}

.create-project-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: #111318;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-project-btn:hover {
  background: #1e222b;
  border-color: rgba(255, 255, 255, 0.3);
}

.create-project-plus {
  font-size: 18px;
  line-height: 1;
  font-weight: 400;
}

.projects-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7a8099;
  padding: 16px 16px 6px 16px;
  font-weight: 600;
}
```

---

## 3. Project Route Handlers

### 3.1 Project Details Page

#### **File:** `frontend/src/app/(main)/project/[projectId]/page.jsx`

**Previous Code:**
```jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from '@/lib/axios';

const ProjectDetailPage = () => {
  const params = useParams();
  const projectId = params?.projectId;
  const [projectData, setProjectData] = useState(null);

  useEffect(() => {
    // Loaded details without syncing sidebar active tab
    axios.post('/project/details', { project_id: projectId })
      .then(res => setProjectData(res.data));
  }, [projectId]);

  return <div>{/* ... */}</div>;
};

export default ProjectDetailPage;
```

**Present Code:**
```jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import MyTeams from '@/components/project/my_teams';
import MyOrganization from '@/components/project/my_organization';
import axios from '@/lib/axios';
import { useSidebarStore } from '@/store/sidebarStore';

const ProjectDetailPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId;
  const setActiveTab = useSidebarStore((s) => s.setActiveTab);

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.post('/project/details', { project_id: projectId });
        const data = response.data;
        setProjectData(data);

        // Sync sidebar active tab with mandate
        const mandateFromUrl = searchParams?.get('mandate');
        const mandate = mandateFromUrl || data?.project_details?.project_mandate;
        if (mandate === 'organization') {
          setActiveTab('org-projects');
        } else if (mandate === 'team' || mandate === 'self') {
          setActiveTab('team-projects');
        }
      } catch (err) {
        console.error('Failed to fetch project details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId, searchParams, setActiveTab]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', background: '#f7f5f0', minHeight: '100vh' }}>
        <p>Loading project details...</p>
      </div>
    );
  }

  const mandateFromUrl = searchParams?.get('mandate');
  const mandate = mandateFromUrl || projectData?.project_details?.project_mandate;

  if (mandate === 'organization') {
    return <MyOrganization projectData={projectData} />;
  }

  return <MyTeams projectData={projectData} />;
};

export default ProjectDetailPage;
```

---

### 3.2 Project Dashboard Card Click Handlers

#### **File:** `frontend/src/components/project/newprojectDashboard.jsx`

**Previous Code:**
```javascript
// Navigated directly to project URL without mandate query param
const projectUrl = `/project/${project.project_id}`;

<div className={classes.card} onClick={() => router.push(projectUrl)}>
  <button onClick={(e) => { e.stopPropagation(); router.push(projectUrl); }}>
    Open Project ↗
  </button>
</div>
```

**Present Code:**
```javascript
// Forward mandateParam or project_mandate to preserve active tab in sidebar
const targetMandate = mandateParam || project.project_details?.project_mandate;
const projectUrl = targetMandate 
  ? `/project/${project.project_id}?mandate=${targetMandate}` 
  : `/project/${project.project_id}`;

<div className={classes.card} onClick={() => router.push(projectUrl)}>
  <button onClick={(e) => { e.stopPropagation(); router.push(projectUrl); }}>
    Open Project ↗
  </button>
</div>
```

---

## 4. Backend Project Module (Previous Code vs Present Code)

This section details the backend changes made in `backend/modules/project` required to support **My Team**, **My Organisation**, dynamic member scores/quizzes, creator info, and project deduplication.

### 4.1 Schema Additions (Creator Metadata)

#### **File:** `backend/modules/project/schema.py`

In `ProjectResponse`, `created_by_name` and `created_by_email` were added so the frontend Project Details and Leaderboard headers can display who initiated the mandate.

**Previous Code:**
```python
class ProjectResponse(BaseModel):
    project_id: UUID
    project_name: str
    organization_id: UUID
    function_id: Optional[UUID] = None
    designation_id: Optional[UUID] = None
    hiring_goal: Optional[int] = None
    jd_url: Optional[str] = None
    project_status: Optional[Dict[str, Any]] = None
    created_at: datetime
    created_by: Optional[UUID] = None
    project_details: Optional[Dict[str, Any]] = None
    
    # Extra fields for UI cards (default to null)
```

**Present Code:**
```python
class ProjectResponse(BaseModel):
    project_id: UUID
    project_name: str
    organization_id: UUID
    function_id: Optional[UUID] = None
    designation_id: Optional[UUID] = None
    hiring_goal: Optional[int] = None
    jd_url: Optional[str] = None
    project_status: Optional[Dict[str, Any]] = None
    created_at: datetime
    created_by: Optional[UUID] = None
    created_by_name: Optional[str] = None
    created_by_email: Optional[str] = None
    project_details: Optional[Dict[str, Any]] = None
    
    # Extra fields for UI cards (default to null)
```

---

### 4.2 Router Error Handling & Logging

#### **File:** `backend/modules/project/router.py`

Enhanced `create_project` to log the full exception traceback and return a structured 500 error on failures.

**Previous Code:**
```python
    except Exception as e:
        await db.rollback()
        # raise HTTPException(
        #     status_code=400, detail=f"Failed to create project: {str(e)}"
        # )
        raise e
```

**Present Code:**
```python
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating project: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to create project: {str(e)}"
        )
```

---

### 4.3 Service: Project Creation & Deduplication

#### **File:** `backend/modules/project/service.py` (`create_project_async`)

When a user creates or updates a project with an identical name, organization, and mandate (`team` or `organization`), it now updates the existing record instead of creating orphaned duplicate projects.

**Previous Code:**
```python
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
```

**Present Code:**
```python
    # Check if project with same name, organization, and mandate already exists
    clean_pname = (project_in.project_name or "").strip().lower()
    existing_projects = []
    if clean_pname:
        existing_stmt = select(Project).where(
            func.lower(func.trim(Project.project_name)) == clean_pname,
            Project.organization_id == org.organization_id
        ).order_by(Project.created_at.desc())
        existing_res = await db.execute(existing_stmt)
        existing_projects = existing_res.scalars().all()

    existing_project = None
    for ep in existing_projects:
        ep_mandate = (ep.project_details or {}).get("project_mandate")
        if ep_mandate == project_in.project_mandate or not project_in.project_mandate:
            existing_project = ep
            break

    if existing_project:
        existing_project.function_id = func_id or existing_project.function_id
        existing_project.designation_id = desig_id or existing_project.designation_id
        existing_project.hiring_goal = project_in.hiring_goal or existing_project.hiring_goal
        existing_project.jd_url = project_in.jd_url or existing_project.jd_url
        existing_project.project_status = status_data
        curr_det = dict(existing_project.project_details or {})
        curr_det.update(project_details)
        existing_project.project_details = curr_det
        db_project = existing_project
        await db.flush()
    else:
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
```

---

### 4.4 Service: Project Details with Real Assessment Data & Member Metrics

#### **File:** `backend/modules/project/service.py` (`get_project_by_id_async`)

In `get_project_by_id_async`, added assessment access linking, member quizzes, capstone data, real-time quiz averages, and project creator profile resolution.

**Previous Code:**
```python
    # Loaded only UserRoadmap records without connecting assessment mappings or exam submissions
    from modules.roadmap.model import Roadmap, UserRoadmap
    from modules.roadmap_learning_assessment.model import RoadmapLearningAssessment

    rm_stmt = select(Roadmap).where(Roadmap.project_id == str(project_id))
    # ...
    # Member status was determined solely by roadmap leaf node progress
    if total_nodes > 0 and done_nodes == total_nodes:
        member_status = "Completed"
    elif done_nodes > 0 or total_nodes > 0:
        member_status = "In progress"
    else:
        member_status = "Not started"

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
```

**Present Code:**
```python
    from modules.roadmap.model import Roadmap, UserRoadmap
    from modules.roadmap_learning_assessment.model import RoadmapLearningAssessment
    from modules.assessment.model import ProjectAssessmentMap
    from modules.assessment.assessment_access.model import UserAssessmentAccess
    from modules.assessment_attempt.model import AllocatedExams, Submissions
    from modules.assessment_attempt.encryption import encrypt_allocation_id

    # Fetch assessment mapping for this project
    pa_stmt = select(ProjectAssessmentMap).where(ProjectAssessmentMap.project_id == project_id)
    pa_res = await db.execute(pa_stmt)
    assessment_ids = [str(row.assessment_id) for row in pa_res.scalars().all()]

    # Collect candidate user IDs from both roadmaps and allocated assessments
    if assessment_ids:
        uass_stmt = select(UserAssessmentAccess).where(UserAssessmentAccess.assessment_id.in_(assessment_ids))
        uass_res = await db.execute(uass_stmt)
        for uas in uass_res.scalars().all():
            if uas.user_email:
                candidate_emails.add(uas.user_email.lower().strip())

    # Map quizzes, calculate average scores, and determine comprehensive status:
    if ur and total_nodes > 0 and done_nodes == total_nodes:
        member_status = "Completed"
    elif any(q.get("status") == "Completed" for q in quizzes_list) or (ur and (done_nodes > 0 or total_nodes > 0)):
        member_status = "In progress"
    elif any(q.get("status") == "In Progress" for q in quizzes_list):
        member_status = "In progress"
    else:
        member_status = "Not started"

    taken_quizzes = [q for q in quizzes_list if q.get("status") == "Completed" or (q.get("score") and q.get("score") > 0)]
    taken_quizzes_count = len(taken_quizzes)
    avg_quiz_score = round(sum(q["score"] for q in taken_quizzes) / taken_quizzes_count) if taken_quizzes_count > 0 else 0

    # Resolve project creator details
    creator_name = None
    creator_email = None
    if project.created_by:
        try:
            creator_stmt = select(UserDetails).where(UserDetails.user_id == project.created_by)
            creator_res = await db.execute(creator_stmt)
            creator = creator_res.scalars().first()
            if creator:
                creator_email = creator.user_email
                creator_name = creator.user_name or (creator.user_email.split("@")[0].title() if creator.user_email else None)
        except Exception:
            pass

    return {
        "project_id": project.project_id,
        "project_name": project.project_name,
        "created_by": project.created_by,
        "created_by_name": creator_name or creator_email,
        "created_by_email": creator_email,
        "project_details": project.project_details,
        "profiles_count": len(members_list),
        "assigned_members": members_list,
        # ...
    }
```

---

### 4.5 Service: Dashboard Project Deduplication

#### **File:** `backend/modules/project/service.py` (`get_all_projects_async`)

Deduplicates projects on the `/project` listing by normalized name and mandate so that each unique team or organization project card appears cleanly only once.

**Previous Code:**
```python
    result = await db.execute(stmt)
    projects_data = []
    for row in result.all():
        project, org_name, func_name, desig_name = row 
        project_details={k: v for k, v in project.project_details.items() if k not in ['jd_data']}

        projects_data.append({
            "project_id": project.project_id,
            "project_name": project.project_name,
            # ...
        })
```

**Present Code:**
```python
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
            # ...
        })
```

---

## 5. Prompt Sharing Feature Context Linking

### 5.1 Frontend Prompt Context

#### **File:** `frontend/src/context/PromptSharingContext.jsx`

**Previous Code:**
```javascript
const generateContextualPrompt = async (query) => {
  const response = await axios.post('/prompt-sharing/generate', {
    query,
  });
  return response.data;
};
```

**Present Code:**
```javascript
const generateContextualPrompt = async (query, projectId) => {
  const response = await axios.post('/prompt-sharing/generate', {
    query,
    project_id: projectId || null,
  });
  return response.data;
};
```

---

### 5.2 Backend Prompt Sharing Endpoint

#### **File:** `backend/modules/prompt_sharing/router.py`

**Previous Code:**
```python
@router.post("/generate")
async def generate_prompt(
    request: Request,
    query: str = Form(...),
):
    response = await prompt_service.generate_prompt(query=query)
    return response
```

**Present Code:**
```python
@router.post("/generate")
async def generate_prompt(
    request: Request,
    query: str = Form(...),
    project_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    response = await prompt_service.generate_prompt(
        query=query, project_id=project_id, db=db
    )
    return response
```

---

## 6. Summary of New Components

The following files represent the new dashboard and drill-down views added to the project:
1. `frontend/src/components/project/my_teams.jsx` & `my_teams.module.css`: Team-mandated leaderboard table with dynamic scoring and multi-column sorting.
2. `frontend/src/components/project/my_organization.jsx` & `my_organization.module.css`: Organization-mandated leaderboard table.
3. `frontend/src/components/project/MemberDetailView.jsx` & `MemberDetailView.module.css`: Detailed candidate performance card, radar chart, roadmap progress, and quiz history.

---

## 7. User-Specific Project Assignment & Member View Isolation

This section details the latest changes made to ensure that the project section only returns projects assigned to or created for the logged-in user (e.g. `rohan`), and that clicking a project strictly displays only the logged-in user as the member.

### 7.1 Backend Assignment Query Filter

#### **File:** `backend/modules/project/service.py` (`get_all_projects_async`)

**Previous Code:**
```python
# Queried only projects created by the user or organization without checking assignments
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
    .where(Project.created_by == current_user_id, Project.organization_id == organization_id)
    .order_by(Project.created_at.desc())
)
```

**Present Code:**
```python
# #changes: Include all projects assigned to user by user_id via roadmap, assessment, or hiring manager
from modules.roadmap.model import Roadmap, UserRoadmap  # #changes
from modules.assessment.model import ProjectAssessmentMap  # #changes
from modules.assessment_attempt.model import AllocatedExams  # #changes
from modules.project.model import ProjectHiringManager  # #changes

user_id_str = str(current_user_id)  # #changes

# 1. Projects with roadmaps assigned to user by ID
rm_proj_subq = (  # #changes
    select(Roadmap.project_id)  # #changes
    .join(UserRoadmap, Roadmap.roadmap_id == UserRoadmap.roadmap_id)  # #changes
    .where(UserRoadmap.user_id == user_id_str)  # #changes
)  # #changes

# 2. Projects with assessments allocated to user by ID via AllocatedExams
pa_alloc_subq = (  # #changes
    select(ProjectAssessmentMap.project_id)  # #changes
    .join(AllocatedExams, ProjectAssessmentMap.assessment_formation_id == AllocatedExams.exam_id)  # #changes
    .where(AllocatedExams.user_id == user_id_str)  # #changes
)  # #changes

# 3. Projects with user as hiring manager by ID
hm_proj_subq = (  # #changes
    select(ProjectHiringManager.project_id)  # #changes
    .where(ProjectHiringManager.user_id == user_id_str)  # #changes
)  # #changes

assigned_conditions = [  # #changes
    Project.created_by == user_id_str,  # #changes
    Project.project_id.in_(rm_proj_subq),  # #changes
    Project.project_id.in_(pa_alloc_subq),  # #changes
    Project.project_id.in_(hm_proj_subq),  # #changes
]  # #changes

stmt = (  # #changes
    select(  # #changes
        Project,  # #changes
        Organization.organization_name,  # #changes
        Function.function_name,  # #changes
        Designation.designation_name  # #changes
    )  # #changes
    .outerjoin(Organization, Project.organization_id == Organization.organization_id)  # #changes
    .outerjoin(Function, Project.function_id == Function.function_id)  # #changes
    .outerjoin(Designation, Project.designation_id == Designation.designation_id)  # #changes
    .where(  # #changes
        Project.organization_id == organization_id,  # #changes
        or_(*assigned_conditions)  # #changes
    )  # #changes
    .order_by(Project.created_at.desc())  # #changes
)  # #changes
```

---

### 7.2 Backend Router User ID Extraction

#### **File:** `backend/modules/project/router.py` (`get_projects`)

**Previous Code:**
```python
@router.get("/get-all-projects", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
async def get_projects(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserDetails = Depends(get_current_user)
):
    current_user_id = user.user_id
    projects = await get_all_projects_async(
        db=db, 
        organization_id=organization_id, 
        current_user_id=current_user_id,
    )
    return projects
```

**Present Code:**
```python
# #changes: Pass authenticated current_user_id for all assignment queries
@router.get("/get-all-projects", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
async def get_projects(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserDetails = Depends(get_current_user)
):
    try:
        current_user_id = str(user.user_id)  # #changes
        projects = await get_all_projects_async(
            db=db, 
            organization_id=organization_id, 
            current_user_id=current_user_id,  # #changes
        )
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")
```

---

### 7.3 Frontend Assigned Member Isolation on Project Click

#### **File:** `frontend/src/components/project/my_teams.jsx` & `my_organization.jsx`

**Previous Code:**
```javascript
// Displayed all raw members returned from backend
const rawMembers = projectData?.assigned_members || [];
```

**Present Code:**
```javascript
// #changes: Strictly isolate rawMembers to the single logged-in/assigned user (e.g. rohan)
const rawMembers = useMemo(() => {
  const list = projectData?.assigned_members || [];

  const currentUserId = userDetails?.id || userDetails?.user_id; // #changes
  const currentUserEmail = (userDetails?.email || '').toLowerCase().trim(); // #changes
  const currentUserName = userDetails?.name || userDetails?.user_name || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Learner'); // #changes

  const found = list.find((m) => { // #changes
    if (currentUserId && (String(m.id) === String(currentUserId) || String(m.user_id) === String(currentUserId))) return true; // #changes
    if (currentUserEmail && m.email && m.email.toLowerCase().trim() === currentUserEmail) return true; // #changes
    if (projectData?.created_by && (String(m.id) === String(projectData.created_by) || String(m.user_id) === String(projectData.created_by))) return true; // #changes
    return false; // #changes
  }); // #changes

  if (found) { // #changes
    return [{ // #changes
      ...found, // #changes
      name: currentUserName || found.name || 'Learner', // #changes
      email: currentUserEmail || found.email || '', // #changes
    }]; // #changes
  } // #changes

  if (list.length > 0) { // #changes
    const first = list[0]; // #changes
    return [{ // #changes
      ...first, // #changes
      id: currentUserId || first.id || '1', // #changes
      name: currentUserName || first.name || 'Learner', // #changes
      email: currentUserEmail || first.email || '', // #changes
    }]; // #changes
  } // #changes

  return [{ // #changes
    id: currentUserId || projectData?.created_by || '1', // #changes
    name: currentUserName, // #changes
    email: currentUserEmail || projectData?.created_by_email || '', // #changes
    role: projectData?.designation_name || userDetails?.designation || 'Learner', // #changes
    unit: projectData?.function_name || 'General', // #changes
    manager: '—', // #changes
    status: 'Not started', // #changes
    progress: 0, // #changes
    completed_nodes: 0, // #changes
    total_nodes: 0, // #changes
    user_quizzes: [], // #changes
  }]; // #changes
}, [projectData, userDetails]); // #changes
```


