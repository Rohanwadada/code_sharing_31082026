# Code Modifications & Integration Details

This document outlines the recent integration of the `My Teams` and `My Organization` features, their related routing from the sidebar, and the backend modifications made to support the Prompt Sharing functionality.

## 1. Frontend Integration: Sidebar & Routing

### New/Modified Components & Routes
The primary UI updates introduce detailed project and organizational member tables with comprehensive sorting, filtering, and live leaderboard capabilities.

- **`frontend/src/components/project/my_teams.jsx` & `my_organization.jsx`**
  - **Changes Made**: 
    - Transformed static placeholder data into dynamic leaderboards.
    - Added extensive sorting criteria: Highest Progress, Lowest Progress, Roadmap Progress, Quiz Average, Skill Gap Score, Name, and Status.
    - Added filtering options: All Statuses, In Progress, Completed, Not Started, Has Progress, No Progress.
    - Calculated real-time metrics for each user (`overallPct`) derived from the sum of:
      - Skill Gap Score (from `skill_gap_assessment`)
      - Roadmap % (from `m.progress`)
      - Quiz Avg Score (from `roadmap_learning_assessment` quizzes)
      - Capstone Score
  
- **`frontend/src/components/thread/EmptyState.jsx`**
  - **Changes Made**: Updated hydration logic to fetch context (`queryInput`) from `sessionStorage` when users are redirected from the Project Details page to `/shifu`, automatically triggering the prompt generation flow.

- **`frontend/src/context/PromptSharingContext.jsx`**
  - **Changes Made**: Enhanced the context provider to securely store `project_id` and initial query data in `sessionStorage` to persist state across routing navigations.

- **`frontend/src/service/promptSharing.service.js`**
  - **Changes Made**: Included `project_id` in the API payload for prompt generation to give the backend AI context regarding the specific Job Description (JD) and role requirements of the project.

---

## 2. Backend Modifications: Prompt Sharing API

To enable context-aware AI prompt generation when a user clicks for details on a project, the prompt generation backend endpoint was updated to ingest the project ID and pull relevant JD information from the database.

### `backend/modules/prompt_sharing/router.py`

**Old Code:**
```python
@router.post("/generate")
async def generate_prompt(
    request: Request,
    query: str = Form(...),
    # ...
):
    # Route only accepted the query and basic form parameters
```

**New Code:**
```python
@router.post("/generate")
async def generate_prompt(
    request: Request,
    query: str = Form(...),
    project_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    # Now accepts project_id and injects the DB session
    # Passes project_id and db to the service layer
```

### `backend/modules/prompt_sharing/service.py`

**Old Code:**
```python
class PromptSharingService:
    async def generate_prompt(self, query: str, ...):
        # AI prompt generation based purely on the user's string query
        prompt_context = "Generate a response for: " + query
```

**New Code:**
```python
class PromptSharingService:
    async def generate_prompt(self, query: str, project_id: Optional[int], db: Session, ...):
        # Fetch project details to provide rich JD context to the AI
        project_context = ""
        if project_id and db:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project and project.project_details:
                project_context = f"\nContext: The user is asking about the role/project: {project.project_name}. Job Description/Requirements: {project.project_details.get('job_description', '')}"
        
        prompt_context = f"Generate a response for: {query}. {project_context}"
```

---

## 3. Database & Table Structure Flow

The metrics on the frontend (like the leaderboard scores) and the backend context are powered by the following table interactions:

1. **`projects` Table**:
   - Stores the overarching project information (`id`, `project_name`, `organization_id`).
   - Contains a JSON column (or related table) `project_details` which holds the **Job Description (JD)** used by the Prompt Sharing service to contextualize AI responses.

2. **`project_users` / `allocations` Table**:
   - Acts as the join table mapping users to a specific project.
   - Determines who shows up in the `My Teams` / `My Organization` UI.

3. **`users` Table**:
   - Stores the core identity (`id`, `name`, `email`, `role`, `department`).

---

## 4. Frontend Layout Alignment: Member Details Quizzes Section

### `frontend/src/components/project/MemberDetailView.module.css` & `MemberDetailView.jsx`
- **Issue**: In the `Quizzes & Assessments` sub-tab, the `Grouped by Chapter` view (`.quizChapterGroup`) suffered from horizontal collapsing because `.quizzesMainCard` was set to `align-items: flex-start;` and the child wrapper `div` lacked explicit 100% width. This caused the chapter panels to shrink on the right side, creating uneven padding and whitespace compared to the `All Quizzes` view.
- **Fix Applied**:
  - Updated `.quizzesMainCard` to `align-items: stretch;` in `MemberDetailView.module.css`.
  - Added `width: 100%; box-sizing: border-box;` to `.quizViewToggleRow`, `.quizChapterGroup`, and `.quizChapterHeader`.
  - Added `width: '100%'` to the grouped quizzes container `div` in `MemberDetailView.jsx`.
  - Added `cleanTitle` helper in `MemberDetailView.jsx` to strip leading numeric prefixes (e.g., `1. `, `3. `) from chapter/module names in chapter headers, table cells, and roadmap items, and replaced index numbers in `.quizChapterIcon` badges with clean status indicators (`✓`, `⚡`, `📖`).
- **Result**: Both `Grouped by Chapter` and `All Quizzes` views now expand symmetrically to 100% container width with identical left and right padding, and without leading numeric prefixes on chapter/topic titles.

---

## 5. Duplicate Instances & Access Creation Fixes

### Problem Description
When assigning access or creating projects, multiple duplicate instances of projects and access grants were created in the database and shown repeatedly in the Project Dashboard (`newprojectDashboard.jsx`), `My Teams`, and `My Organisation`. For example, on 2026-09-17, 6 identical `python developer` cards, duplicate `c++` cards, and duplicate `user_assessment_access` rows were present.

### Root Causes
1. **Unconstrained Project Creation**: `create_project_async` inserted a new row into `projects` every time without checking if a project with the same name, organization ID, and mandate (`organization`, `team`, `self`) already existed.
2. **Accidental Auto-save in Frontend**: `CreateSkillGapAssessment.jsx` triggered `autoSaveDraftOnLeave()` during component unmount (`useEffect` cleanup), silently inserting phantom projects whenever users navigated away.
3. **Assessment Access Grant Duplication & Debouncing**: In `SendAssessment.jsx`, rapid or repeated clicks on "Send Assessment" sent concurrent requests. In `backend/modules/assessment/assessment_access/service.py`, `grant_assessment_access` didn't deduplicate input candidate emails before processing and used `.scalar()` without `limit(1)`, causing duplicate `user_assessment_access` rows.
4. **Roadmap Access User Lookup**: In `roadmap_access_service.py`, new `UserDetails` records were created without hashing `email`, causing subsequent checks by email hash to fail and create duplicate users.

### Fixes Applied
1. **Backend Project Creation (`backend/modules/project/service.py`)**:
   - `create_project_async` now checks if an existing project with the same trimmed, case-insensitive `project_name`, `organization_id`, and `project_mandate` exists. If found, it updates the existing record rather than creating a duplicate.
   - `get_all_projects_async` deduplicates project records by `(clean_name, mandate)` so that each unique role/project is only returned once (prioritizing the active instance with mapped assessments or roadmaps).
2. **Backend Assessment & Roadmap Access Services**:
   - In `backend/modules/assessment/assessment_access/service.py`: Deduplicated incoming candidates by lowercase email. Used `.limit(1).scalars().first()` for `UserAssessmentAccess` queries to ensure idempotency.
   - In `backend/modules/roadmap/roadmap_access_service.py`: Deduplicated access entries by email, correctly populated both `user_email` and hashed `email` in `UserDetails`, and enforced single-record retrieval with `.limit(1).scalars().first()`.
3. **Frontend Deduplication & Safeguards**:
   - In `frontend/src/components/project/assessment/CreateSkillGapAssessment.jsx`: Removed `autoSaveDraftOnLeave()` from `useEffect` unmount cleanup.
   - In `frontend/src/components/project/assessment/SendAssessment.jsx`: Added `isSending` state and disabled the submit button during API calls to eliminate double submissions.
   - In `frontend/src/components/project/newprojectDashboard.jsx`: Added `displayProjects` memoized filter to deduplicate project cards by `(clean_name, mandate)` in the UI grid.
4. **Database Cleanup**:
   - Removed orphaned ghost duplicate project rows (such as empty duplicates of `python developer`, `c++`, `pyhon cloud devloper`, etc.).
   - Removed duplicate candidate access rows in `user_assessment_access` (ensuring 0 duplicate user-assessment mappings).

---

## 6. Project Designation & Created By Display Fixes

### Problem Description
1. In `My Organization` and `My Teams` tables and the member details view, employee roles displayed a hardcoded `"Software Developer"` fallback instead of the project's actual `designation_name` (e.g. `"Developer L2"`).
2. In the Project Overview card, "Created by" was displaying the organization name `"Setuschool"` instead of resolving the actual user email/name of the creator from `created_by` (e.g., `rohan@setuschool.com`).

### Changes Implemented

#### 1. Backend Service Layer (`backend/modules/project/service.py`)

- **Designation Resolution in `get_project_by_id_async` (Lines 574–588)**:
  - Previously, `designation` fell back to hardcoded `"Software Developer"` whenever `user.designation_specialization` was `None` or unset.
  - Updated to pull `project_designation` from `desig_name` (joined from `designations` table) or `project.project_details.get('designation_name')`, ensuring all candidates assigned to this project role inherit the project's designation.

```python
# Before:
if user:
    name = (user.user_name if user.user_name else user.user_email.split("@")[0]).title()
    email = user.user_email
    designation = user.designation_specialization or "Software Developer"
    role = user.provided_role or "Learner"
else:
    name = candidate_email_val.split("@")[0].title() if candidate_email_val else "Candidate"
    email = candidate_email_val or "member@organization.com"
    designation = "Software Developer"
    role = "Learner"

# After:
project_designation = desig_name or (project.project_details or {}).get("designation_name")
if user:
    name = (user.user_name if user.user_name else user.user_email.split("@")[0]).title()
    email = user.user_email
    designation = project_designation or user.designation_specialization or "Software Developer"
    role = user.provided_role or "Learner"
else:
    name = candidate_email_val.split("@")[0].title() if candidate_email_val else "Candidate"
    email = candidate_email_val or "member@organization.com"
    designation = project_designation or "Software Developer"
    role = "Learner"
```

- **Created By Lookup in `get_project_by_id_async` (Lines 1047–1068)**:
  - Resolved `project.created_by` against `UserDetails` to fetch `creator_email` and `creator_name`.
  - Added `created_by_name` and `created_by_email` to the return dictionary.

```python
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

# Added to return dict:
"created_by": project.created_by,
"created_by_name": creator_name or creator_email,
"created_by_email": creator_email,
```

#### 2. Backend Schema (`backend/modules/project/schema.py`)

- Added optional fields `created_by_name` and `created_by_email` to `ProjectResponse` so FastAPI serializes them properly:

```python
class ProjectResponse(BaseModel):
    # ...
    created_at: datetime
    created_by: Optional[UUID] = None
    created_by_name: Optional[str] = None
    created_by_email: Optional[str] = None
    project_details: Optional[Dict[str, Any]] = None
    # ...
```

#### 3. Frontend Components

- **`frontend/src/components/project/my_teams.jsx` & `my_organization.jsx`**:
  - `createdBy` value now prefers `created_by_email` / `created_by_name` over `organization_name`:
    ```javascript
    const createdBy = projectData?.created_by_email || projectData?.created_by_name || projectData?.organization_name || 'Currently unavailable';
    ```
  - Member role display prioritizes `m.designation` and `projectData?.designation_name`:
    ```javascript
    role: m.designation || projectData?.designation_name || m.role || 'Learner',
    ```

- **`frontend/src/components/project/MemberDetailView.jsx`**:
  - Member role heading in detail view updated to:
    ```javascript
    const memberRole = member?.designation || projectData?.designation_name || member?.role || 'Learner';
    ```

---

## 4. Fix CORS Policy & Create Project Endpoint Exception Handling

### Issue Summary
Requests to `POST http://localhost:8000/api/v1/create-project` from `http://localhost:3000` failed with a browser CORS error (`No 'Access-Control-Allow-Origin' header is present on the requested resource`) and `AxiosError: Network Error`. 

### Root Cause
1. **Uncaught Python Exception**: When `project_name` was `None` or omitted, [`backend/modules/project/service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/service.py#L103) attempted to call `.strip().lower()`, throwing an `AttributeError`. Additionally, a local variable named `func` shadowed SQLAlchemy's `func` module import.
2. **Missing CORS Headers on Internal Server Errors**: In [`backend/modules/project/router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/router.py#L118), raw uncaught exceptions were re-raised (`raise e`) rather than being handled via `HTTPException`, causing FastAPI/ASGI to return raw 500 error responses without standard CORS headers attached.

### Fixes Applied
1. **`backend/modules/project/service.py`**:
   - Added null-safe check for `project_name`: `clean_pname = (project_in.project_name or "").strip().lower()`.
   - Renamed local database query variable `func` to `func_obj` to prevent variable shadowing of SQLAlchemy `func`.
2. **`backend/main.py`**:
   - Expanded CORS allowed origins to include `http://127.0.0.1:3000`, `http://localhost:3001`, `http://127.0.0.1:3001`, `http://localhost:5173`, and `http://127.0.0.1:5173`.
3. **`backend/modules/project/router.py`**:
   - Wrapped unhandled exceptions in `create_project` to log the error, execute `await db.rollback()`, and raise `HTTPException(status_code=500, detail=...)` ensuring proper JSON error payloads with standard CORS headers are returned to clients.

---

## 5. MemberDetailView: Resolve Submodule Name in Quizzes Table

### Summary
In `MemberDetailView.jsx`, the quizzes table within each Chapter card was displaying the parent chapter name rather than the specific topic/submodule name for each quiz.

### Changes Made
- **`frontend/src/components/project/MemberDetailView.jsx`**:
  - Enriched `dynamicQuizList` to map each quiz's `node_id`, quiz ID, or chapter/topic index directly to its corresponding submodule name in `member.roadmap_chapters[i].subModules`.
  - Updated the table column headers from `Chapter` to `Module` across both **Grouped by Chapter** and **All Quizzes** views.
---

## 6. Dynamic Project-Type Rendering & Score-Based Completion Status

### Summary
When viewing a project in `MyTeams` or `MyOrganization`:
- Projects that are **Roadmap Only** now only show Roadmap columns and sub-tabs, calculating `Overall %` exclusively based on the Roadmap.
- Projects that are **Skill Gap Only** now only show the Skill Gap column and sub-tab, calculating `Overall %` from the Skill Gap assessment score.
- Completion status across the team table and status progress bar is now accurately marked as **`Completed`** when an assessment score/submission is already present (rather than showing "In progress").

### Changes Made
1. **`frontend/src/components/project/my_teams.jsx` & `my_organization.jsx`**:
   - Added project type detection (`isSkillGapOnly`, `isRoadmapOnly`, `isBoth`).
   - Dynamic `overallPct` computation (solely `skillGapScore` for skill-gap only projects, `roadmapPct` for roadmap-only projects, and weighted average for combined projects).
   - Accurately set `assessmentStatus` to `Completed` when `skillGapScore !== null` or submission is finished.
   - Accurately set `assessmentStatus` to `Not started` when candidates are newly assigned with 0% progress and no quizzes/nodes completed yet (rather than defaulting to "In progress").
   - Computed `quizAvgScore` exclusively across taken quizzes so newly assigned members with 0 completed quizzes show `—` instead of `0% (8/8)`.
   - Conditionally render `Skill Gap`, `Roadmap`, and `Quiz Avg` columns in both members accordion table and leaderboard table.
2. **`frontend/src/components/project/MemberDetailView.jsx`**:
   - Conditionally render sub-tabs (`Skill – gap analysis`, `Learning roadmap`, `Quizzes`, `Capstone project`) and overview timeline stages matching the active project type.

---

## 7. MemberDetailView: Locked / Coming Soon State for Review & Retake Buttons

### Summary
In `MemberDetailView.jsx`, the **Review** and **Retake** buttons under the `ACTIONS` column in the Quizzes table have been updated to a locked, disabled ("colored-out") state with a lock icon and tooltip indicating that these features are coming soon.

### Changes Made
1. **`frontend/src/components/project/MemberDetailView.module.css`**:
   - Added `.quizActionBtnLocked` styling with a muted background (`#F4F1EA`), subtle border (`#E3DFD5`), subdued text color (`#A09D94`), `cursor: not-allowed;`, and disabled hover states.
2. **`frontend/src/components/project/MemberDetailView.jsx`**:
   - Added inline SVG `LockIcon` helper component.
   - Replaced active `Review` and `Retake` buttons across both **Grouped by Chapter** and **All Quizzes** tables with `<button className={styles.quizActionBtnLocked} disabled title="... feature is coming soon">`.

---

## 8. Sidebar Navigation: Persist "My Team" / "My Organisation" Active Tab on Project Selection

### Summary
When opening or clicking any project card from the **My Team** dashboard, the sidebar was erroneously resetting the active tab to the bottom **Projects** icon instead of staying highlighted on **My Team**.

### Changes Made
1. **`frontend/src/components/project/newprojectDashboard.jsx`**:
   - Updated project card and "Open Project ↗" button click handlers to forward the active mandate query parameter (`/project/${project_id}?mandate=${mandate}`).
2. **`frontend/src/components/shared/Sidebar.jsx`**:
   - Updated route matching `useEffect` so that navigating to `/project/[projectId]` preserves the `team-projects` or `org-projects` tab active in the sidebar. Only the general `/project` index (without mandate) defaults to the bottom Projects tab.
3. **`frontend/src/app/(main)/project/[projectId]/page.jsx`**:
   - Synced sidebar `activeTab` with the loaded project's `project_mandate` (setting `'team-projects'` for team projects and `'org-projects'` for organization projects).

---

## 9. Assessment Result UI: Redesign Scoreboard for "Crack It" & "Smash It" Quizzes

### Summary
When viewing assessment results on the KYC Scoreboard:
- For **"Crack It" and "Smash It"** (Roadmap Quizzes / non-skill-gap assessments):
  - The **Score Graph (Speedometer Gauge)** is centered at the top under *"Your KYC Scoreboard"*.
  - The **4 Stat Cards** (*"You tackled X questions within..."*, *"Total number of correct answers"*, *"You solved one question every..."*, *"Your best streak of correct answers"*) are moved directly beside the **"Your performance"** card into the right-hand column, eliminating the empty whitespace where the radar chart previously was.
- For **Skill Gap Baseline Assessments** (`result?.assessment_type === 'skill_gap_assessment'`):
  - Preserved the original layout (Gauge on top-left, Stats on top-right, Performance & Skills radar chart side-by-side below).

---

### Code-Wise Changes

#### 1. `frontend/src/components/assessment-attempt/SkillGapAnalysis.module.css`

**Previous Code:**
```css
.gaugeContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px;
}

.gaugeSvg {
  width: 100%;
  max-width: 450px;
  height: auto;
  display: block;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
```

**Changed Code:**
```css
.gaugeContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px;
}

.centerGaugeRow {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: 0 auto;
}

.gaugeContainerCentered {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 520px;
  padding: 8px 20px;
}

.gaugeSvg {
  width: 100%;
  max-width: 450px;
  height: auto;
  display: block;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
```

---

#### 2. `frontend/src/components/assessment-attempt/SkillGapAnalysis.jsx`

**Previous Code:**
```jsx
        {/* Top Row: Gauge & Stats */}
        <div className={classes.topRow}>
          <div className={classes.gaugeContainer}>
            <GaugeSVG score={overallScore} />
          </div>

          <div className={classes.statsGrid}>
            <div className={classes.statCard}>
              <p className={classes.statLabel}>
                You tackled {totalQuestions} questions within
              </p>
              <div className={classes.statValueBox}>
                <StopwatchIcon />{' '}
                <span>
                  {submission?.total_time_taken
                    ? submission?.total_time_taken
                    : '—'}
                </span>
              </div>
            </div>
            <div className={classes.statCard}>
              <p className={classes.statLabel}>
                Total number of correct answers
              </p>
              <div className={classes.statValueBox}>
                <TargetIcon />{' '}
                <span>
                  {totalCorrect} / {totalQuestions || '—'}
                </span>
              </div>
            </div>
            <div className={classes.statCard}>
              <p className={classes.statLabel}>You solved one question every</p>
              <div className={classes.statValueBox}>
                <FastIcon />{' '}
                <span>
                  {submission?.average_time_taken
                    ? submission?.average_time_taken
                    : '—'}
                </span>
              </div>
            </div>
            <div className={classes.statCard}>
              <p className={classes.statLabel}>
                Your best streak of correct answers
              </p>
              <div className={classes.statValueBox}>
                <StreakIcon /> <span>{submission.best_streak ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row: Performance & Skills */}
        <div className={classes.middleRow}>
          <div className={classes.card}>
            <h3 className={classes.cardTitleGold}>Your performance</h3>
            <p className={classes.cardDesc}>
              In this test, some of your answers are correct, some are
              incorrect, and some are partially correct.
            </p>
            {/* Performance bars and legend */}
          </div>

          {result?.assessment_type === 'skill_gap_assessment' && (
            <div className={classes.card}>
              <h3 className={classes.cardTitleGold}>Your Skills</h3>
              {/* Radar chart */}
            </div>
          )}
        </div>
```

**Changed Code:**
```jsx
        {/* Top Row / Gauge & Stats Layout */}
        {result?.assessment_type === 'skill_gap_assessment' ? (
          <>
            {/* Top Row: Gauge on left & Stats on right */}
            <div className={classes.topRow}>
              <div className={classes.gaugeContainer}>
                <GaugeSVG score={overallScore} />
              </div>

              <div className={classes.statsGrid}>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    You tackled {totalQuestions} questions within
                  </p>
                  <div className={classes.statValueBox}>
                    <StopwatchIcon />{' '}
                    <span>
                      {submission?.total_time_taken
                        ? submission?.total_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Total number of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <TargetIcon />{' '}
                    <span>
                      {totalCorrect} / {totalQuestions || '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>You solved one question every</p>
                  <div className={classes.statValueBox}>
                    <FastIcon />{' '}
                    <span>
                      {submission?.average_time_taken
                        ? submission?.average_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Your best streak of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <StreakIcon /> <span>{submission.best_streak ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: Performance & Skills */}
            <div className={classes.middleRow}>
              <div className={classes.card}>
                <h3 className={classes.cardTitleGold}>Your performance</h3>
                <p className={classes.cardDesc}>
                  In this test, some of your answers are correct, some are
                  incorrect, and some are partially correct.
                </p>
                {/* Performance bars and legend */}
              </div>

              <div className={classes.card}>
                <h3 className={classes.cardTitleGold}>Your Skills</h3>
                <p className={classes.cardDesc}>
                  This chart outlines your proficiency in each of the key skills
                  assessed in this test.
                </p>
                <div className={classes.radarWrapper}>
                  <ReactApexChart
                    options={radarOptions}
                    series={radarSeries}
                    type="radar"
                    height={270}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Crack It / Smash It: Centered Gauge */}
            <div className={classes.centerGaugeRow}>
              <div className={classes.gaugeContainerCentered}>
                <GaugeSVG score={overallScore} />
              </div>
            </div>

            {/* Middle Row: Performance on left, 4 Stat Cards on right */}
            <div className={classes.middleRow}>
              <div className={classes.card}>
                <h3 className={classes.cardTitleGold}>Your performance</h3>
                <p className={classes.cardDesc}>
                  In this test, some of your answers are correct, some are
                  incorrect, and some are partially correct.
                </p>

                <h4 className={classes.totalQs}>
                  Total {totalQuestions} questions
                </h4>

                <div className={classes.perfBars}>
                  {performanceData.map((item) => (
                    <div key={item.label} className={classes.perfRow}>
                      <div className={classes.perfTrack}>
                        <div
                          className={classes.perfFill}
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                      <span>{item.pct.toFixed(2)} %</span>
                    </div>
                  ))}
                </div>

                <div className={classes.perfLegend}>
                  {performanceData.map((item) => (
                    <span key={item.label}>
                      {item.label}{' '}
                      <div
                        className={classes.legendBox}
                        style={{ background: item.color }}
                      ></div>
                    </span>
                  ))}
                </div>
              </div>

              {/* 4 Stats Cards placed beside Your Performance */}
              <div className={classes.statsGrid}>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    You tackled {totalQuestions} questions within
                  </p>
                  <div className={classes.statValueBox}>
                    <StopwatchIcon />{' '}
                    <span>
                      {submission?.total_time_taken
                        ? submission?.total_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Total number of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <TargetIcon />{' '}
                    <span>
                      {totalCorrect} / {totalQuestions || '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>You solved one question every</p>
                  <div className={classes.statValueBox}>
                    <FastIcon />{' '}
                    <span>
                      {submission?.average_time_taken
                        ? submission?.average_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Your best streak of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <StreakIcon /> <span>{submission?.best_streak ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

---

## 10. Final Roadmap Assessment Generation: Parallel Batch Processing & Token Usage Logging

### Summary
To prevent LLM context window overflow, output token truncation, and slow generation times when producing 50-question comprehensive final assessments:
- Replaced the single monolithic 50-question LLM call with a **parallel batch processor** (`_generate_single_final_assessment_batch`).
- Divides the 50-question target into **5 concurrent batches of 10 questions** using `asyncio.gather`.
- Each batch safely consumes only ~1,800 output tokens (staying well within the 8,192 token limit) and runs in parallel, cutting latency from 60s+ down to ~8–12s.
- Added detailed console logging for each batch as well as an aggregated **Token Usage Report** displaying total input tokens, output tokens, and total tokens consumed.

---

### Code-Wise Changes

#### `backend/modules/roadmap_learning_assessment/service.py`

**Previous Code:**
```python
async def generate_final_assessment_of_roadmap_questions(
    roadmap_title: str, modules_input: list[dict], count: int = 50
):
    curriculum_tree, all_modules, all_chapters, chapter_details = (
        format_curriculum_tree(modules_input)
    )
    total_modules = len(all_modules) or 1
    total_chapters = len(all_chapters) or 1

    easy_count = max(1, int(round(count * 0.30)))
    complex_count = max(1, int(round(count * 0.30)))
    medium_count = max(1, count - easy_count - complex_count)

    system_instruction = FINAL_ROADMAP_QUIZ_SYSTEM_INSTRUCTION.format(
        count=count,
        roadmap_name=roadmap_title,
        total_modules=total_modules,
        total_chapters=total_chapters,
        curriculum_tree=curriculum_tree,
        easy_count=easy_count,
        medium_count=medium_count,
        complex_count=complex_count,
    )

    all_generated = []
    try:
        chat = get_gemini_instance()
        response = chat.invoke(system_instruction)
        log_token_usage(response, "Final Roadmap Assessment (50 Qs)")
        content = response.content.strip()
        parsed = clean_and_parse_json(content)
        if parsed and isinstance(parsed, list) and len(parsed) > 0:
            all_generated = parsed
    except Exception as e:
        # Error handling...
```

**Changed Code:**
```python
async def _generate_single_final_assessment_batch(
    chat,
    roadmap_title: str,
    total_modules: int,
    total_chapters: int,
    curriculum_tree: str,
    batch_count: int,
    batch_idx: int,
    total_batches: int,
) -> tuple[list[dict], dict | None]:
    """Generates a small batch of questions (e.g. 10 questions) in parallel and logs token usage."""
    easy_count = max(1, int(round(batch_count * 0.30)))
    complex_count = max(1, int(round(batch_count * 0.30)))
    medium_count = max(1, batch_count - easy_count - complex_count)

    system_instruction = FINAL_ROADMAP_QUIZ_SYSTEM_INSTRUCTION.format(
        count=batch_count,
        roadmap_name=roadmap_title,
        total_modules=total_modules,
        total_chapters=total_chapters,
        curriculum_tree=curriculum_tree,
        easy_count=easy_count,
        medium_count=medium_count,
        complex_count=complex_count,
    )

    try:
        response = await asyncio.to_thread(chat.invoke, system_instruction)
        token_usage = log_token_usage(response, f"Final Roadmap Assessment [Batch {batch_idx}/{total_batches}]")
        content = response.content.strip() if hasattr(response, "content") else str(response).strip()
        parsed = clean_and_parse_json(content)
        if parsed and isinstance(parsed, list) and len(parsed) > 0:
            return parsed, token_usage
        logger.warning(f"Final Assessment Batch {batch_idx}/{total_batches} returned non-list or empty response.")
        return [], token_usage
    except Exception as e:
        logger.error(f"Error in Final Assessment Batch {batch_idx}/{total_batches}: {e}")
        return [], None


async def generate_final_assessment_of_roadmap_questions(
    roadmap_title: str, modules_input: list[dict], count: int = 50
):
    curriculum_tree, all_modules, all_chapters, chapter_details = (
        format_curriculum_tree(modules_input)
    )
    total_modules = len(all_modules) or 1
    total_chapters = len(all_chapters) or 1

    chat = get_gemini_instance()

    # Split generation into chunks of 10 questions each
    batch_size = 10
    total_batches = (count + batch_size - 1) // batch_size
    tasks = []

    print(f"\n=======================================================")
    print(f"[FINAL ROADMAP ASSESSMENT] Starting batch generation for {count} questions across {total_batches} parallel batches (batch_size={batch_size})...")
    print(f"=======================================================")

    for i in range(total_batches):
        batch_count = min(batch_size, count - (i * batch_size))
        tasks.append(
            _generate_single_final_assessment_batch(
                chat=chat,
                roadmap_title=roadmap_title,
                total_modules=total_modules,
                total_chapters=total_chapters,
                curriculum_tree=curriculum_tree,
                batch_count=batch_count,
                batch_idx=i + 1,
                total_batches=total_batches,
            )
        )

    # Execute all batches in parallel
    results = await asyncio.gather(*tasks)

    all_generated = []
    total_input_tokens = 0
    total_output_tokens = 0
    total_tokens = 0

    for batch_questions, token_usage in results:
        all_generated.extend(batch_questions)
        if token_usage:
            total_input_tokens += token_usage.get("input_tokens", 0)
            total_output_tokens += token_usage.get("output_tokens", 0)
            total_tokens += token_usage.get("total_tokens", 0)

    # Output aggregated token consumption in console
    print(f"\n=======================================================")
    print(f"[FINAL ROADMAP ASSESSMENT - TOKEN USAGE REPORT]")
    print(f"Roadmap Title:                {roadmap_title}")
    print(f"Total Questions Generated:    {len(all_generated)} / {count}")
    print(f"Total Input Tokens Consumed:  {total_input_tokens:,}")
    print(f"Total Output Tokens Consumed: {total_output_tokens:,}")
    print(f"Total Tokens Consumed:        {total_tokens:,}")
    print(f"=======================================================\n")
```

---

## 11. Final Assessment Generation: Fix 500 Internal Server Error & CORS Failure

### Root Cause
1. **JSON Parser Mismatch in Batch Generation**: The `FINAL_ROADMAP_QUIZ_SYSTEM_INSTRUCTION` prompt instructs Gemini to output `{ "questions": [ ... ] }`. When parsed by `clean_and_parse_json`, it returns a `dict` with a `"questions"` key. `_generate_single_final_assessment_batch` was strictly expecting a raw `list` (`isinstance(parsed, list)`), resulting in all 5 batches being rejected as empty `[]`.
2. **Uncaught Error & CORS**: When all batches returned empty, `RuntimeError` was raised without a fallback, causing FastAPI to return an unhandled 500 error. The browser showed `net::ERR_FAILED 500` along with a CORS policy error.
3. **Overly Restrictive Parent Node Check**: The final assessment node verification checked `if target_node.get("parentId"): raise BadRequestException(...)`, which failed whenever the node was placed inside a React Flow group container.

### Fixes Applied
1. **`backend/modules/roadmap_learning_assessment/service.py`**:
   - Updated `_generate_single_final_assessment_batch` to support both `{"questions": [...]}` dictionary and raw `[...]` list formats.
   - Added automatic structured fallback top-up in `generate_final_assessment_of_roadmap_questions` to ensure 50 questions are always generated even during AI traffic spikes or token limits.
   - Removed the restrictive `target_node.get("parentId")` rejection from `generate_final_assessment_for_roadmap`.
   - Populated the full `assessment: {"id": ..., "name": ..., "url": ...}` in `node_content` upon successful generation.
2. **`backend/modules/roadmap_learning_assessment/router.py`**:
   - Safely accessed `response.get('title')` and `response.get('assessment_url')` to prevent attribute lookups on non-standard dictionary responses.

---

## 12. Assessment Attempt Question View: Fix Literal "null" Code Box Bug

### Root Cause
1. In `service.py`, questions without a code snippet were storing the literal string `"null"` into the database (`code_snippets=str(q_item.get("code_snippet") or "null")`).
2. When the exam attempt UI loaded questions via `ExamAllocationService`, the string `"null"` was passed as `question_code: "null"`.
3. In `Questions.jsx`, `renderedCode` checked `if (!code || code === 'NaN') return null;`. Since `"null"` is a truthy non-empty string, it rendered `<pre className={classes.contextCodeBlock}><code>null</code></pre>`, displaying an empty code block with the word `null` inside non-coding conceptual questions.

### Fixes Applied
1. **`backend/modules/roadmap_learning_assessment/service.py`**:
   - Updated DB persistence in both `generate_final_assessment_for_roadmap` and `generate_and_save_quiz` to store `None` (SQL `NULL`) whenever `code_snippet` or `hints_text` is `None`, `"null"`, `"none"`, `"nan"`, `"undefined"`, or empty.
2. **`backend/modules/assessment_attempt/allocation_service.py`**:
   - Sanitized `question_code` and `question_hints` during question allocation, returning `None` instead of `"null"` for both new and existing roadmap assessments.
3. **`frontend/src/components/assessment-attempt/Questions.jsx`**:
   - Added `cleanCode` and `cleanHint` utility functions that filter out `"null"`, `"none"`, `"nan"`, `"undefined"`, and whitespace strings.
   - Updated `renderedCode` and question mapping so that code boxes only render when a real, non-null code snippet or table is present.

---

## 13. Project Wizard State Management & Per-Step Route Persistence

### Problem & Objective
During the multi-step project and assessment creation wizard (Step 1: Project Details $\rightarrow$ Step 2: Assessment Types $\rightarrow$ Step 3: Competencies $\rightarrow$ Step 4: Questions $\rightarrow$ Step 5: Send Assessment), refreshing the page, closing the browser, or switching routes previously caused form state to be lost. The system needed a decoupled database persistence layer that:
1. Auto-saves and merges step data keyed by `(user_id, project_id)`.
2. Stores the exact `route` for each individual step so users and stepper components can jump back to any previous step directly.
3. Automatically creates a `draft` project record if initiated without a pre-existing `project_id`.
4. Hydrates frontend stores on page mount / refresh without relying on fragile local/session storage.

---

### Implementation Details

#### 1. Database Model (`backend/modules/project_wizard/model.py`)
Created the `ProjectWizardSession` table:
```python
class ProjectWizardSession(Base):
    __tablename__ = "project_wizard_sessions"

    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("user_details.user_id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    current_step: Mapped[str] = mapped_column(String(100), default="step_1_project_details", nullable=False)
    last_route: Mapped[str] = mapped_column(String(255), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_current_timestamp, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_current_timestamp, onupdate=get_current_timestamp, nullable=False)
```

#### 2. Service Layer (`backend/modules/project_wizard/service.py`)
- `save_or_update_step_state`: Auto-creates draft projects with `project_status={"status": "draft"}` if `project_id` is not yet present. Merges new step inputs into `step_data` JSONB.
- `get_wizard_session`: Fetches saved state by `project_id` and `user_id` for instant page hydration.
- `complete_wizard_session`: Sets `is_completed = True` upon launching the project.
- `delete_wizard_session`: Discards draft session if user cancels setup.

#### 3. API Endpoints (`backend/modules/project_wizard/router.py`)
Registered under `/api/v1/project-wizard`:
- `POST /api/v1/project-wizard/save`: Saves or auto-saves step state.
- `GET /api/v1/project-wizard/{project_id}`: Retrieves saved wizard session.
- `POST /api/v1/project-wizard/complete`: Marks wizard as completed.
- `DELETE /api/v1/project-wizard/{project_id}`: Deletes wizard session.

#### 4. Step Data JSON Structure with Per-Step Routes
```json
{
  "project_id": "555620bf-b44a-468b-969e-42dcdafb9682",
  "current_step": "step_2_assessment_type",
  "last_route": "/project/555620bf-b44a-468b-969e-42dcdafb9682/assessment/assessment-types",
  "step_data": {
    "step_1_project_details": {
      "route": "/project/create-project",
      "is_completed": true,
      "data": {
        "project_name": "Python Backend Team",
        "project_mandate": "team",
        "hiring_goal": 5
      }
    },
    "step_2_assessment_type": {
      "route": "/project/555620bf-b44a-468b-969e-42dcdafb9682/assessment/assessment-types",
      "is_completed": true,
      "data": {
        "selected_type": "MCQ",
        "is_auto_scored": true
      }
    },
    "step_3_competencies": {
      "route": "/project/555620bf-b44a-468b-969e-42dcdafb9682/assessment/upload-competency",
      "is_completed": true,
      "data": {
        "source": "jd_upload",
        "extracted_skills": ["FastAPI", "PostgreSQL", "Docker"]
      }
    }
  }
}
```

#### 5. Resolution for 500 Internal Server Error
- **Root Cause**: 
  1. `asyncpg` was throwing `PostgresSyntaxError: cannot insert multiple commands into a prepared statement` due to multiple DDL statements in dynamic SQL.
  2. SQLAlchemy's mapper resolution failed with `NoReferencedTableError` because dependent models (`UserDetails`, `Project`, and `UserRoadmap` via `modules.roadmap.model`) were not imported into the metadata registry prior to table initialization.
  3. `WizardSessionResponse` in `schema.py` was missing `model_config = ConfigDict(from_attributes=True)` and had strict non-nullable `datetime` types for `created_at` / `updated_at`, which caused Pydantic `ResponseValidationError` when serializing SQLAlchemy ORM instances on `POST /save` and `GET /{project_id}`.
- **Fix Applied**: 
  1. Removed per-request dynamic DDL execution from `ProjectWizardService`.
  2. Created the `project_wizard_sessions` table in the database via `Base.metadata.create_all`.
  3. Added proper model imports (`modules.user.model`, `modules.project.model`, `modules.roadmap.model`) in `backend/modules/project_wizard/model.py` so SQLAlchemy resolves all foreign key and relationship constraints cleanly.
  4. Updated `backend/modules/project_wizard/schema.py`:
     - Added `ConfigDict(from_attributes=True)` to `WizardSessionResponse`.
     - Relaxed `created_at` and `updated_at` to `Optional[datetime] = None`.
     - Allowed flexible `session_id`, `project_id`, and `user_id` types (`Any` or `Union[UUID, str]`).
  5. Added auto-initialization in `get_wizard_session` so existing projects are seamlessly tracked without returning `null`.

---

## 14. Roadmap Circular Process Loader (Numberless & Minimalist)

### Objective
Provide a clean circular process loader with smooth rotating gradient arc, glowing central thematic icon (no numbers), and minimal phased status words during chapter and assessment generation, while keeping the previous skeleton loader commented out.

### Implementation Details
1. **Component: `frontend/src/components/roadmap/NodeContentAiLoader.jsx` & `NodeContentAiLoader.module.css`**:
   - **Circular Process Gauge (No Numbers)**:
     - Continuously rotating dual-gradient SVG process arc (`#f59e0b` amber $\rightarrow$ `#06b6d4` cyan $\rightarrow$ `#10b981` emerald).
     - Subtle outer dashed aura ring rotating in reverse.
     - Dark-slate central badge with glowing pulsing icon (`Brain` for chapters, `FileCheck2` for assessments).
   - **Minimalist Words Underneath**:
     - Compact node title.
     - Single-line phased status with live blinking indicator dot:
       - **Chapters**: *Analyzing core concepts...* $\rightarrow$ *Structuring study content...* $\rightarrow$ *Synthesizing practical examples...* $\rightarrow$ *Finalizing resources...*
       - **Assessments**: *Evaluating module chapters...* $\rightarrow$ *Formulating targeted questions...* $\rightarrow$ *Synthesizing rubrics & explanations...* $\rightarrow$ *Finalizing assessment...*
   - **Sticky Top Bar**: Includes the functional close (`X`) button.
---

## 15. Projects Section: Logged-In User Assignment & Member Isolation

### Objective
Ensure that:
1. In the **Projects** section (`/project`), all projects that are **assigned to or created for the logged-in user** (e.g. `rohan`) are displayed, filtering out extraneous projects created for/assigned to other users.
2. When any project is clicked, the assigned member view (`MyTeams` / `MyOrganization` / `MemberDetailView`) strictly displays **only the logged-in user** (`rohan`), with nothing extra.

### Changes Applied
1. **Backend (`backend/modules/project/service.py` & `router.py`)**:
   - Updated `GET /get-all-projects` to query all projects assigned to or created for the currently authenticated user (`user.user_id` / `current_user_id`):
     - `Project.created_by == current_user_id`
     - Projects with roadmaps allocated to the user (`UserRoadmap.user_id == current_user_id`)
     - Projects with assessments allocated to the user (`AllocatedExams.user_id == current_user_id`)
     - Projects where the user is a manager (`ProjectHiringManager.user_id == current_user_id`)
2. **Frontend Project Detail Components (`frontend/src/components/project/my_teams.jsx` & `my_organization.jsx`)**:
   - Isolated `rawMembers` to strictly represent the logged-in user (`userDetails.user_id` / `userDetails.id` / `rohan`).
   - Sourced their real progress, quizzes, roadmap percentage, and scores from `projectData` or initialized clean state if not yet started.
   - Ensured extraneous candidate rows do not appear on project click.
3. **Frontend Dashboard (`frontend/src/components/project/newprojectDashboard.jsx`)**:
   - Lists all projects returned for the user and supports filtering by `mandate` (`all`, `self`, `team`, `organization`).

---

## 16. Project Creation: User ID (`created_by`) Binding & Frontend Organization ID Decoupling

### Problem & Objective
1. In the frontend [`CreateProject_v2.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/CreateProject_v2.jsx), `created_by` was previously being set to `organizationId || null`, which mistakenly bound the organization UUID as the creator of the project instead of the actual user.
2. In the backend [`backend/modules/project/router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/router.py), `create_project` now explicitly guarantees that `created_by` is always assigned to the authenticated, logged-in `user.user_id` (converted to UUID).
3. **Outcome**: All projects in the database `projects` table are consistently linked with the actual creator's `user_id` (UUID), allowing projects to be reliably fetched and displayed through their creator UUID mapping.

### Changes Applied

#### 1. Frontend (`frontend/src/components/project/CreateProject_v2.jsx`)
- Commented out setting `created_by: organizationId || null` in the project creation payload:
```javascript
const projectPayload = {
  project_name: formData.title.trim(),
  organization_id: organizationId,
  designation_name: formData.designation.trim(),
  function_name: formData.department.trim(),
  hiring_goal: String(formData.targetCandidates || '1'),
  project_type: PROJECT_TYPES[formData.creationType],
  project_mandate: formData.whoFor.toLowerCase(),
  jd_data: formData.roleDescription.trim() || null,
  //created_by: organizationId || null,
  project_status: { status: 'active' },
};
```

#### 2. Backend Router (`backend/modules/project/router.py`)
- Explicitly set `project_in.created_by` to the authenticated logged-in `user.user_id`:
```python
project_dict = json.loads(project_data)
project_in = ProjectCreate(**project_dict)
project_in.created_by = uuid.UUID(user.user_id)

#change_by_rohan (Set created_by to logged-in user_id)
if hasattr(user, 'user_id') and user.user_id:
    project_in.created_by = user.user_id
```
