# Frontend Modifications & Integration Log

This document tracks all code changes, bug fixes, file paths, line numbers, previous vs updated code snippets, and diffs made during development to make integration seamless for developers.

---

## **Date: September 01–03, 2026**

### **1. Revoke Confirmation Popup Overlay Fix**
* **File:** [`src/components/modals/ConfirmationModal.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/modals/ConfirmationModal.module.css#L16)
* **Issue:** Revoke confirmation modal appeared behind the "Manage Roadmap Access" modal because `.modal-backdrop` lacked a higher `z-index` stacking context.
* **Lines Changed:** `Line 16`
* **Previous Code:**
  ```css
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }
  ```
* **Updated Code:**
  ```css
  /* Updated z-index to bring modal backdrop above access sharing modal */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  }
  ```

---

### **2. Assessment Fullscreen & ESC Key Security Enforcement**
* **File:** [`src/components/assessment-attempt/Security.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/Security.jsx#L53-L144)
* **Problem & Technical Explanation:**
  1. **URL Route Matcher Missing:** The security component previously checked `if (pathname === '/questions' || pathname === '/daksh-session')`. When candidates took exams on `/assessment/attempt?...`, all event listeners (`fullscreenchange`, `keydown`, `blur`) were completely inactive, allowing candidates to press `Escape` or `F11` to exit full screen and view the rest of their browser without any restriction or warning.
  2. **Browser Fullscreen Gesture Requirement:** Modern web browsers (Chrome, Edge, Firefox, Safari) strictly block programmatic `element.requestFullscreen()` API calls if invoked asynchronously or outside an active user gesture event handler (such as an `onClick` event). Triggering `requestFullscreen()` directly inside an un-prompted ESC key listener or a non-interactive event throws a `TypeError: Permissions check failed / User denied permission` browser exception.
* **Lines Changed:** `Lines 53–144`
* **Previous Code:**
  ```javascript
  const forceFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    }
  };

  const handleKeyDown = (event) => {
    if (pathname === '/questions' || pathname === '/daksh-session') {
      if (event.key === 'Escape') {
        forceFullScreen(); // Direct call blocked by browser security
        setModalMessage('Fullscreen mode is required for this assessment.');
        setShowModal(true);
        setCloseModal(() => () => {
          setShowModal(false);
        });
      }
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && (pathname === '/questions' || pathname === '/daksh-session')) {
      setModalMessage('Fullscreen mode is required for this assessment.');
      setShowModal(true);
    }
  };

  if (pathname === '/questions' || pathname === '/daksh-session') {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  }
  ```
* **Updated Code:**
  ```javascript
  const forceFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    }
  };

  // Expanded route matcher to include /assessment/attempt and /assessment paths
  const isAssessmentPage =
    pathname === '/questions' ||
    pathname === '/daksh-session' ||
    pathname.includes('/assessment/attempt') ||
    pathname.startsWith('/assessment');

  const handleKeyDown = (event) => {
    if (
      (event.ctrlKey && event.shiftKey && event.key === 'I') ||
      (event.ctrlKey && event.shiftKey && event.key === 'J') ||
      (event.ctrlKey && event.key === 'U') ||
      event.key === 'F12' ||
      (event.ctrlKey && event.key === 'r') ||
      (event.metaKey && event.key === 'r') ||
      (event.ctrlKey && event.shiftKey && event.key === 'R') ||
      event.key === 'F5'
    ) {
      event.preventDefault();
    }

    if (isAssessmentPage) {
      if (
        event.key === 'Escape' ||
        event.key === 'F11' ||
        (event.altKey && event.key === 'Tab') ||
        (event.metaKey && event.key.toLowerCase() === 'd') ||
        (event.ctrlKey && event.metaKey && event.key.toLowerCase() === 'd')
      ) {
        event.preventDefault();
        event.stopPropagation();

        if (event.key === 'Escape') {
          // Open warning modal and bind forceFullScreen() to the user's modal button click
          setModalMessage('Fullscreen mode is required for this assessment.');
          setShowModal(true);
          setCloseModal(() => () => {
            setShowModal(false);
            forceFullScreen(); // Executed inside user click handler -> Browser allows requestFullscreen()
          });
        }
      }
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && isAssessmentPage) {
      // When candidate exits full screen (ESC key / F11 / window resize), display warning modal
      setModalMessage('Fullscreen mode is required for this assessment.');
      setShowModal(true);
      setCloseModal(() => () => {
        setShowModal(false);
        forceFullScreen(); // Clicking modal button restores 100% full screen
      });
    }
  };

  if (isAssessmentPage) {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
  ```

---

### **3. Global Background Color Update & Chat Background Token Solution (UX/UI Audit)**
* **File:** [`src/styles/tokens/semantic.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/styles/tokens/semantic.css#L1-L10)
* **Issue:** Shifu UI Audit requested changing the default background color token to solid `#F7F5F0` across non-chat screens, while keeping a dedicated `--background-chat` token for original mesh gradient on Shifu chat / thread pages.
* **Lines Changed:** `Lines 1–10`
* **Previous Code:**
  ```css
  :root {
    --background:
      linear-gradient(
        180deg,
        rgba(226, 188, 106, 0.05) 0%,
        rgba(247, 245, 240, 0) 40%,
        rgba(226, 188, 106, 0.03) 100%
      ),
      radial-gradient(
        41.67% 41.67% at 50% 50%,
        #faf3df 0%,
        #f7f5f0 50%,
        #efebd8 100%
      );
  }
  ```
* **Updated Code:**
  ```css
  :root {
    --background: #F7F5F0; /* Solid background for main app screens */
    
    /* Dedicated token preserving original gradient for chat / thread screens */
    --background-chat:
      linear-gradient(
        180deg,
        rgba(226, 188, 106, 0.05) 0%,
        rgba(247, 245, 240, 0) 40%,
        rgba(226, 188, 106, 0.03) 100%
      ),
      radial-gradient(
        41.67% 41.67% at 50% 50%,
        #faf3df 0%,
        #f7f5f0 50%,
        #efebd8 100%
      );
  }
  ```

---

### **4. Create Project Hover Text Color Update (UX/UI Audit)**
* **File:** [`src/components/project/CreateProject_v2.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/CreateProject_v2.module.css#L240-L243)
* **Issue:** Hovering over pill buttons on the Create Project screen rendered low-contrast text. UI audit required pure black text color `#000000` on hover.
* **Lines Changed:** `Lines 240–243`
* **Previous Code:**
  ```css
  .pillBtn:hover {
    background-color: #ebe4cd;
  }
  ```
* **Updated Code:**
  ```css
  .pillBtn:hover {
    background-color: #ebe4cd;
    color: #000000; /* Added black text color on hover */
  }
  ```

---

### **5. Roadmap Header Icon Spacing Equalization (UX/UI Audit)**
* **File:** [`src/components/artifacts/ArtifactViewer.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/artifacts/ArtifactViewer.module.css#L57-L78)
* **Issue:** Unequal spacing between top right corner icons (Email, Bookmark, Close). `.action-ct` had `gap: 20px` while `.action-ct-left` had `gap: 12px`.
* **Lines Changed:** `Lines 61`, `Line 72`
* **Previous Code:**
  ```css
  .action-ct {
    display: inline-flex;
    justify-content: flex-start;
    align-items: center;
    gap: 20px;
  }

  .action-ct-left {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
  }
  ```
* **Updated Code:**
  ```css
  .action-ct {
    display: inline-flex;
    justify-content: flex-start;
    align-items: center;
    gap: 16px; /* Updated to 16px */
  }

  .action-ct-left {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 16px; /* Updated to 16px for equal spacing */
  }
  ```

---

### **6. Headline Line Spacing Increase in Module Content Screen (UX/UI Audit)**
* **Files:** 
  * [`src/components/roadmap/NodeContentViewer.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/roadmap/NodeContentViewer.module.css#L52)
  * [`src/components/roadmap/NodeContentMarkdownRenderer.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/roadmap/NodeContentMarkdownRenderer.module.css#L3)
* **Issue:** Multi-line topic headlines had tight line height (`32px`), reducing readability.
* **Lines Changed:** `NodeContentViewer.module.css` (Line 52), `NodeContentMarkdownRenderer.module.css` (Line 3, Line 7)
* **Previous Code:**
  ```css
  /* NodeContentViewer.module.css */
  .node-title {
    font-family: var(--font-dm-sans);
    font-size: 24px;
    font-weight: 700;
    line-height: 32px;
  }

  /* NodeContentMarkdownRenderer.module.css */
  .md-h2 {
    margin: 24px 0 16px;
  }
  ```
* **Updated Code:**
  ```css
  /* NodeContentViewer.module.css */
  .node-title {
    font-family: var(--font-dm-sans);
    font-size: 24px;
    font-weight: 700;
    line-height: 38px; /* Increased from 32px to 38px */
  }

  /* NodeContentMarkdownRenderer.module.css */
  .md-h2 {
    margin: 24px 0 16px;
    line-height: 1.45; /* Added 1.45 line-height */
  }

  .md-h3 {
    margin: 19px 0 12px;
    line-height: 1.45; /* Added 1.45 line-height */
  }
  ```

---

### **7. Black Primary CTA & Navigation Arrows (UX/UI Audit)**
* **Files:**
  * [`src/app/globals.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/app/globals.css#L57)
  * [`src/components/roadmap/NodeContentViewer.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/roadmap/NodeContentViewer.module.css#L528)
  * [`src/components/assessment-attempt/Questions.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/Questions.module.css#L2416-L2421)
* **Issue:**
  1. Primary navigation CTA buttons were using yellow/gold background (`#ffc728`). UI Audit required black primary CTA background (`#0f1117`) with white text (`#ffffff`).
  2. Next/Previous assessment navigation arrows (`.navArrowIcon`) had hardcoded yellow SVG strokes (`#FFC727`). UI Audit required black arrows.
* **Lines Changed:** `globals.css` (Line 57), `NodeContentViewer.module.css` (Line 528), `Questions.module.css` (Line 2420)
* **Previous Code:**
  ```css
  /* globals.css */
  --next-btn-bgc: #ffc728;

  /* NodeContentViewer.module.css */
  .navigation-btn.next {
    background-color: var(--next-btn-bgc);
  }

  /* Questions.module.css */
  .navArrowIcon {
    width: 24px;
    height: 24px;
    display: block;
  }
  ```
* **Updated Code:**
  ```css
  /* globals.css */
  --next-btn-bgc: #0f1117; /* Updated primary CTA token to black */

  /* NodeContentViewer.module.css */
  .navigation-btn.next {
    background-color: var(--next-btn-bgc);
    color: #ffffff; /* Added white text color for contrast */
  }

  /* Questions.module.css */
  .navArrowIcon {
    width: 24px;
    height: 24px;
    display: block;
    filter: brightness(0); /* Dynamically renders SVG stroke in pure black */
  }
  ```

---

### **8. Submit Assessment Modal Black Primary CTA & Button Alignment (UX/UI Audit)**
* **Files:** 
  * [`src/components/assessment-attempt/Questions.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/Questions.module.css#L907-L928)
  * [`src/components/assessment-attempt/Questions.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/Questions.jsx#L1591-L1605)
* **Issue:** "Submit Assessment" modal buttons (`No, continue` and `Yes, Submit`) were mismatched in width (`130px` vs `flex: 1`), height, border-radius (`20px` vs `10px`), and `Yes, Submit` had a yellow gradient background.
* **Lines Changed:** `Questions.module.css` (Lines 907–928), `Questions.jsx` (Lines 1591–1605)
* **Previous Code:**
  ```css
  /* Questions.module.css */
  .confirm-button {
    font-family: "Montserrat", sans-serif;
    width: 130px;
    height: 40px;
    border-radius: 20px;
    background: linear-gradient(90deg, #ffc727 0%, #f90 59.17%);
    box-shadow: 1px 4px 0px 0px #563f00;
  }
  ```
  ```jsx
  /* Questions.jsx */
  <button
    onClick={handleClosePopup}
    style={{
      background: '#ebebeb',
      borderRadius: '10px',
      padding: '10px 20px',
      fontWeight: 600,
      flex: 1,
    }}
  >
    No, continue
  </button>
  ```
* **Updated Code:**
  ```css
  /* Questions.module.css */
  .confirm-button {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    flex: 1;
    height: 42px;
    padding: 10px 20px;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    border: none;
    background: #0f1117; /* Updated to black primary CTA */
    color: #ffffff;
    box-shadow: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .confirm-button:hover {
    background: #1a1d26;
  }
  ```
  ```jsx
  /* Questions.jsx */
  <button
    onClick={handleClosePopup}
    style={{
      background: '#ebebeb',
      border: 'none',
      borderRadius: '10px',
      height: '42px',
      padding: '10px 20px',
      fontSize: '15px',
      fontWeight: 600,
      color: '#0f1117',
      cursor: 'pointer',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
    }}
  >
    No, continue
  </button>
  ```

---

### **9. Assessment Results Screen Background #F7F5F0 (UX/UI Audit)**
* **File:** [`src/components/assessment-attempt/SkillGapAnalysis.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/SkillGapAnalysis.module.css#L1-L11)
* **Issue:** Assessment results scoreboard page background was white/unthemed.
* **Lines Changed:** `Lines 1–11`
* **Previous Code:**
  ```css
  .tabContent {
    padding: 32px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    font-family: "DM Sans", sans-serif;
    animation: fadeIn 0.3s ease;
    width: 100%;
    height: auto;
    overflow-y: auto;
  }
  ```
* **Updated Code:**
  ```css
  .tabContent {
    padding: 32px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    font-family: "DM Sans", sans-serif;
    animation: fadeIn 0.3s ease;
    width: 100%;
    height: auto;
    min-height: calc(100vh - 60px);
    background-color: #f7f5f0; /* Added #f7f5f0 theme background */
    overflow-y: auto;
  }
  ```

---

### **10. View Hint Button Left Alignment & Margin**
* **File:** [`src/components/assessment-attempt/Questions.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/Questions.jsx#L1088-L1105)
* **Issue:** "View Hint" button was pushed flush against the far right edge of the question card without right margin.
* **Lines Changed:** `Lines 1088–1105`
* **Previous Code:**
  ```jsx
  <button
    type="button"
    onClick={() => handleShowHints(currentIndex)}
    style={{
      all: 'unset',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#fdf8ea',
      border: '1px solid #c9a84c',
      borderRadius: '20px',
      padding: '5px 14px',
      cursor: 'pointer',
      height: '32px',
      boxSizing: 'border-box',
    }}
  >
  ```
* **Updated Code:**
  ```jsx
  <button
    type="button"
    onClick={() => handleShowHints(currentIndex)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      backgroundColor: '#fdf8ea',
      border: '1px solid #c9a84c',
      borderRadius: '20px',
      padding: '6px 14px',
      marginRight: '20px', /* Added 20px right margin to shift button slightly left */
      cursor: 'pointer',
      height: '32px',
      boxSizing: 'border-box',
    }}
  >
  ```

---

### **11. Drag & Drop File Upload Implementation**
* **Files:**
  * [`src/components/project/CreateProject_v2.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/CreateProject_v2.jsx#L252)
  * [`src/components/project/assessment/UploadQuestions.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/UploadQuestions.jsx#L68)
  * [`src/components/project/assessment/UploadCompetency.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/UploadCompetency.jsx#L68)
* **Issue:** Dragging files onto dropzones opened files in browser window instead of uploading due to missing `stopPropagation`, `dropEffect`, and drag enter/leave state handlers.
* **Lines Changed:** `CreateProject_v2.jsx` (L252, L433), `UploadQuestions.jsx` (L68), `UploadCompetency.jsx` (L68)
* **Previous Code:**
  ```jsx
  <div
    className={classes.uploadBox}
    onClick={() => fileInputRef.current?.click()}
  >
  ```
* **Updated Code:**
  ```jsx
  {/* updated */}
  <div
    className={`${classes.uploadBox} ${isDragging ? classes.uploadBoxDrag : ''}`}
    onClick={() => fileInputRef.current?.click()}
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }}
    onDragLeave={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }}
    onDrop={handleDrop}
  >
  ```

---

### **12. Assessment Allocation Payload & CORS Network Error Fix**
* **Files:**
  * [`src/components/assessment-attempt/AssessmentInstructions.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/AssessmentInstructions.jsx#L41-L47)
  * [`backend/modules/assessment_attempt/schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/schema.py#L43-L49)
* **Issue:** Starting an assessment threw a CORS Network Error (`net::ERR_FAILED` on `/api/v1/exam/allocate`) due to a FastAPI 422 Unprocessable Entity error caused by a missing required `organization_id` field in the request payload.
* **Lines Changed:** `AssessmentInstructions.jsx` (Lines 41–47), `schema.py` (Lines 43–49)
* **Previous Code:**
  ```javascript
  /* AssessmentInstructions.jsx */
  const reqData = {
    "project_id":  searchParams.get('p') || "",
    "assessment_id": assessmentId,
    "assessment_type": getAssessmentType(pathName),
    "roadmap_id": searchParams.get('r')
  }
  ```
  ```python
  # backend schema.py
  class AllocateExam(BaseModel):
      organization_id: str
      project_id: str
      assessment_id: str
      assessment_type: AssessmentType
      roadmap_id: str | None
  ```
* **Updated Code:**
  ```javascript
  /* AssessmentInstructions.jsx */
  const reqData = {
    "organization_id": searchParams.get('o') || searchParams.get('org') || "",
    "project_id": searchParams.get('p') || "",
    "assessment_id": assessmentId,
    "assessment_type": getAssessmentType(pathName),
    "roadmap_id": searchParams.get('r')
  }
  ```
  ```python
  # backend schema.py
  class AllocateExam(BaseModel):
      organization_id: str | None = ""
      project_id: str | None = ""
      assessment_id: str
      assessment_type: AssessmentType
      roadmap_id: str | None = None
  ```

---

### **13. Question Generation Header Button Lock/Freeze Fix**
* **Files:**
  * [`src/components/project/assessment/QuestionsStructure.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/QuestionsStructure.jsx#L659)
  * [`src/components/project/assessment/QuestionsStructure.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/QuestionsStructure.module.css#L108-L130)
* **Issue:** "Bookmark" and "Send Assessment to Candidates" buttons remained active and clickable during AI question generation (0% to 99%), allowing candidates/users to interrupt active SSE generation.
* **Lines Changed:** `QuestionsStructure.jsx` (Line 659), `QuestionsStructure.module.css` (Lines 109–130)
* **Previous Code:**
  ```javascript
  /* QuestionsStructure.jsx */
  const isProceedEnabled = !isActiveApiCall || isGenerationComplete;
  ```
* **Updated Code:**
  ```javascript
  /* QuestionsStructure.jsx */
  // Strict lock: Buttons remain disabled until generation reaches 100% completion
  const isProceedEnabled = isGenerationComplete && !isActiveApiCall;
  ```
  ```css
  /* QuestionsStructure.module.css */
  .bookmarkBtn:disabled {
    opacity: 0.4;
    cursor: not-allowed !important;
    pointer-events: none !important;
    background-color: #f5f5f5;
    border-color: #e0e0e0;
  }

  .sendBtn:disabled {
    background-color: #9d9c98 !important;
    color: #ffffff !important;
    cursor: not-allowed !important;
    pointer-events: none !important;
    opacity: 0.6;
  }
  ```

---

### **14. Security Component Syntax Error Fix**
* **File:** [`src/components/assessment-attempt/Security.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/Security.jsx#L61-L80)
* **Issue:** Next.js/Turbopack build error `'const' declarations must be initialized` caused by a duplicate unclosed `handleKeyDown` function header fragment.
* **Lines Changed:** `Lines 61–80`
* **Previous Code:**
  ```javascript
  const handleKeyDown = (event) => {
    if (
      (event.ctrlKey && event.shiftKey && event.key === 'I') || ...
    ) {
      event.preventDefault();
    }

  const isAssessmentPage = ...
  const handleKeyDown = (event) => { ... }
  ```
* **Updated Code:**
  ```javascript
  const isAssessmentPage =
    pathname === '/questions' ||
    pathname === '/daksh-session' ||
    pathname.includes('/assessment/attempt') ||
    pathname.startsWith('/assessment');

  const handleKeyDown = (event) => { ... }
  ```

---

### **15. Assessment Page Refresh Restriction & Warning Prompt**
* **File:** [`src/components/assessment-attempt/Security.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/assessment-attempt/Security.jsx#L124-L144)
* **Issue:** Candidates could refresh the page during an assessment without warning, causing progress loss.
* **Lines Changed:** `Lines 124–144`
* **Previous Code:**
  ```javascript
  if (isAssessmentPage) {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  }
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };
  ```
* **Updated Code:**
  ```javascript
  const handleBeforeUnload = (event) => {
    if (isAssessmentPage) {
      event.preventDefault();
      event.returnValue =
        'Refreshing or leaving the page will result in loss of assessment progress. Are you sure you want to leave?';
      return event.returnValue;
    }
  };

  if (isAssessmentPage) {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
  ```


---

## **Date: September 08, 2026**

### **16. Project & Assessment Wizard State Persistence Fix (F5 Refresh & Navigation State Loss)**
* **Files:**
  * [`src/store/projectStore.js`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/store/projectStore.js#L1-L39)
  * [`src/store/assessmentFormationStore.js`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/store/assessmentFormationStore.js#L1-L2811)
  * [`src/components/project/CreateProject_v2.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/CreateProject_v2.jsx#L163-L245)
* **Problem & Technical Explanation:**
  1. **In-Memory Store Data Loss:** The Zustand global stores (`projectStore` and `assessmentFormationStore`) were in-memory objects without persistent storage configuration. Clicking page refresh (`F5`), switching tabs, or navigating backward/forward wiped all wizard state (Project name, selected function, designation levels, uploaded competency files, assessment choices).
  2. **Unbound Local Form State:** `CreateProject_v2.jsx` relied on isolated local React `useState` hooks for input fields without reading from or synchronizing back to `projectStore` / `assessmentFormationStore`.
  3. **Session Loss on Step Navigation:** Navigating back and forth between project creation and assessment formation steps wiped user selections.
* **Lines Changed:**
  * `projectStore.js`: Lines 1–39 (wrapped store with `persist` middleware using `sessionStorage`)
  * `assessmentFormationStore.js`: Lines 1–3, 2805–2810 (wrapped store with `persist` middleware using `sessionStorage`)
  * `CreateProject_v2.jsx`: Lines 163–245 (added two-way binding, auto-hydration on mount, designation re-fetching on store restore)
* **Previous Code:**
  ```javascript
  /* src/store/projectStore.js */
  import { create } from 'zustand';

  export const useProjectStore = create((set, get) => ({
    currentProjectId: null,
    currentProjectName: '',
    functionName: '',
    designationName: '',
    jtbdDescription: '',
    uploadedFileDetails: null,
    assessmentMode: 'skill_gap',
    assessmentTypes: ['MCQ'],
    competencySource: 'file',
    currentStep: 1,
    setCurrentProjectId: (value) => set({ currentProjectId: value }),
    setCurrentProjectName: (value) => set({ currentProjectName: value }),
    setProjectData: (data) => set((state) => ({ ...state, ...data })),
    resetProjectStore: () => set({ ...initialProjectState }),
  }));
  ```
  ```javascript
  /* src/store/assessmentFormationStore.js */
  import { create } from 'zustand';

  export const useAssessmentFormationStore = create((set, get) => ({
    // ... unpersisted state definition ...
  }));
  ```
  ```javascript
  /* src/components/project/CreateProject_v2.jsx */
  const [formData, setFormData] = useState({
    projectName: '',
    functionSsl: '',
    designationLevel: '',
    roleDescription: '',
    whoFor: isAdmin ? 'Organization' : 'Self',
    creationType: isAdmin ? 'assessment' : 'roadmap',
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  ```
* **Updated Code:**
  ```javascript
  /* src/store/projectStore.js */
  import { create } from 'zustand';
  import { persist, createJSONStorage } from 'zustand/middleware';

  const initialProjectState = {
    currentProjectId: null,
    currentProjectName: '',
    functionName: '',
    designationName: '',
    jtbdDescription: '',
    uploadedFileDetails: null,
    assessmentMode: 'skill_gap', // default
    assessmentTypes: ['MCQ'],
    competencySource: 'file', // 'file', 'taxonomy', 'manual'
    currentStep: 1,
  };

  export const useProjectStore = create(
    persist(
      (set, get) => ({
        ...initialProjectState,

        setCurrentProjectId: (value) => set({ currentProjectId: value }),
        setCurrentProjectName: (value) => set({ currentProjectName: value }),

        setProjectData: (data) => set((state) => ({ ...state, ...data })),
        
        setCurrentStep: (step) => set({ currentStep: step }),
        nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
        prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),

        resetProjectStore: () => set({ ...initialProjectState }),
      }),
      {
        name: 'setu_project_wizard_store', // sessionStorage key
        storage: createJSONStorage(() => sessionStorage),
      }
    )
  );
  ```
  ```javascript
  /* src/store/assessmentFormationStore.js */
  import { create } from 'zustand';
  import { persist, createJSONStorage } from 'zustand/middleware';

  export const useAssessmentFormationStore = create(
    persist(
      (set, get) => ({
        // ... state definition & actions ...
      }),
      {
        name: 'setu_assessment_formation_store',
        storage: createJSONStorage(() => sessionStorage),
      }
    )
  );
  ```
  ```javascript
  /* src/components/project/CreateProject_v2.jsx */
  const projectStore = useProjectStore();
  const setProjectData = useProjectStore((s) => s.setProjectData);

  const [formData, setFormData] = useState(() => ({
    projectName: projectStore.projectName || '',
    functionSsl: projectStore.functionName || '',
    designationLevel: projectStore.designationName || '',
    roleDescription: projectStore.jtbdDescription || '',
    whoFor: projectStore.whoFor || (isAdmin ? 'Organization' : 'Self'),
    creationType: projectStore.creationType || (isAdmin ? 'assessment' : 'roadmap'),
  }));

  // Re-hydrate formData if store hydrates asynchronously from sessionStorage
  useEffect(() => {
    if (projectStore.projectName || projectStore.functionName || projectStore.jtbdDescription) {
      setFormData((prev) => ({
        ...prev,
        projectName: projectStore.projectName || prev.projectName,
        functionSsl: projectStore.functionName || prev.functionSsl,
        designationLevel: projectStore.designationName || prev.designationLevel,
        roleDescription: projectStore.jtbdDescription || prev.roleDescription,
        whoFor: projectStore.whoFor || prev.whoFor,
        creationType: projectStore.creationType || prev.creationType,
      }));
    }
  }, [
    projectStore.projectName,
    projectStore.functionName,
    projectStore.designationName,
    projectStore.jtbdDescription,
    projectStore.whoFor,
    projectStore.creationType,
  ]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      setProjectData({
        projectName: updated.projectName,
        functionName: updated.functionSsl,
        designationName: updated.designationLevel,
        jtbdDescription: updated.roleDescription,
        whoFor: updated.whoFor,
        creationType: updated.creationType,
      });
      return updated;
    });
  };
  ```

---

### **17. Save Competency Dropdown Hidden (Review Competencies)**
* **File:** [`src/components/project/assessment/ReviewCompetencies.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/ReviewCompetencies.jsx#L305-L326)
* **Issue:** User requested hiding/commenting out the "Save Competency" action dropdown button above the competency table on the Review Competencies page.
* **Lines Changed:** `Lines 305–326`
* **Previous Code:**
  ```jsx
  <div className={classes.actionRow}>
    <div className={classes.saveDropdown}>
      <button className={classes.saveBtnText}>Save Competency</button>
      <div className={classes.saveBtnDivider}></div>
      <button className={classes.saveBtnIcon}>
        <svg ...></svg>
      </button>
    </div>
  </div>
  ```
* **Updated Code:**
  ```jsx
  {/* Action Row */}
  {/* 
  <div className={classes.actionRow}>
    <div className={classes.saveDropdown}>
      <button className={classes.saveBtnText}>Save Competency</button>
      <div className={classes.saveBtnDivider}></div>
      <button className={classes.saveBtnIcon}>
        <svg ...></svg>
      </button>
    </div>
  </div>
  */}
  ```

---

### **18. Legacy Groq Error Message Replacement with Gemini AI**
* **File:** [`backend/modules/roadmap_learning_assessment/service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_learning_assessment/service.py#L443-L707)
* **Issue:** System was actively using Google Gemini (`gemini-2.5-flash`), but exception handlers and fallback messages had legacy hardcoded strings mentioning `"Groq AI Server is currently busy or rate-limited"`.
* **Lines Changed:** `Lines 443–451`, `Lines 666`, `Lines 702–707`
* **Previous Code:**
  ```python
  llm_error_detail = "Failed to parse valid questions from Groq AI response."
  print(f"Final Quiz ChatGroq Error: {e}")
  raise RuntimeError("Groq AI Server is currently busy or rate-limited...")
  ```
* **Updated Code:**
  ```python
  llm_error_detail = "Failed to parse valid questions from Gemini AI response."
  print(f"Final Quiz Gemini AI Error: {e}")
  raise RuntimeError("Gemini AI Server is currently busy or rate-limited...")
  ```

---

### **19. Global Terminal Token Logging & Visual Dashboard (`token_dashboard.html`)**
* **Files:**
  * [`backend/shared/llm/gemini.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/llm/gemini.py#L40-L60)
  * [`backend/modules/roadmap_learning_assessment/service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_learning_assessment/service.py#L435-L658)
  * [`backend/modules/ai_content_generation/service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation/service.py#L516)
  * [`backend/modules/course_recommendation/utils.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/course_recommendation/utils.py#L80)
  * [`QuestionGen-V2/app/ai/tasks/agent_implementation.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/QuestionGen-V2(11-08-26)LAST/app/ai/tasks/agent_implementation.py#L45-L60)
  * [`token_dashboard.html`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/token_dashboard.html)
* **Feature & Implementation:**
  1. **Terminal Console Output:** Added standard token logging helper `log_token_usage(response, feature_name)` across all LLM endpoints on ports 8000 and 8001. Terminal logs token output in format: `[GEMINI LOG - <Feature>] Input: X tokens | Output: Y tokens | Total: Z tokens`.
  2. **Interactive Visualization Dashboard:** Created [`token_dashboard.html`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/token_dashboard.html) containing metric cards, Chart.js bar and donut charts, interactive endpoint filters, and empirical token breakdown tables.

---

### **20. Pre Assessment Competency Generation Token Logging**
* **File:** [`QuestionGen-V2/app/ai/tasks/agent_implementation.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/QuestionGen-V2(11-08-26)LAST/app/ai/tasks/agent_implementation.py#L54-L177)
* **Feature:** Added raw response token extraction and console logging across all Competency Generation workflow nodes:
  1. `generate_jd_competencies_node`: `[GEMINI LOG - Pre Assessment Competency Extraction]`
  2. `generate_jd_competency_combinations_node`: `[GEMINI LOG - Pre Assessment Competency Combination]`
  3. `verify_jd_competency_compatibility_node`: `[GEMINI LOG - Pre Assessment Competency Compatibility Scoring]`
  4. `select_top_jd_competency_items_node`: `[GEMINI LOG - Pre Assessment Top Scored Competency Selection]`

---

### **21. Upload Competency Header Title & Supported File Formats Fix**
* **Files:** 
  * [`src/components/project/assessment/UploadCompetency.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/UploadCompetency.jsx#L125-L203)
  * [`src/components/project/assessment/SourceOfCompetencies.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/SourceOfCompetencies.jsx#L39)
* **Problem & Rationale:** 
  1. The page header title on the Upload Competency step erroneously displayed `"Upload Questions"` instead of `"Upload Competency"`.
  2. The upload dropzone helper hint text listed `"Supported: TXT, DOC, DOCX, PDF, CSV, XLSX"`, whereas the HTML file input element (`accept=".csv,.xlsx"`) and backend file parser only accept structured spreadsheet files (`.csv`, `.xlsx`).
* **Lines Changed:** `UploadCompetency.jsx` (Lines 125–126, Line 194)
* **Previous Code:**
  ```jsx
  /* src/components/project/assessment/UploadCompetency.jsx */
  <div className={classes['page-title']}>
    <p>Upload</p>
    <span className={classes['highlight']}>Questions</span>
    <span className={classes['info-icon']}>
      <Image src={competencyStructureIcon} alt="" />
    </span>
  </div>

  // ... dropzone markup ...
  <p className={classes['dropzone-hint']}>
    Supported: TXT, DOC, DOCX, PDF, CSV, XLSX
  </p>
  ```
* **Updated Code:**
  ```jsx
  /* src/components/project/assessment/UploadCompetency.jsx */
  <div className={classes['page-title']}>
    <p>Upload</p>
    <span className={classes['highlight']}>Competency</span>
    <span className={classes['info-icon']}>
      <Image src={competencyStructureIcon} alt="" />
    </span>
  </div>

  // ... dropzone markup ...
  <p className={classes['dropzone-hint']}>
    Supported: CSV, XLSX
  </p>
  ```

---

### **22. Sticky Table Header & Internal Scroll Container (Review Competencies & Questions Structure)**
* **Files:**
  * [`src/components/project/assessment/ReviewCompetencies.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/ReviewCompetencies.module.css#L184-L208)
  * [`src/components/project/assessment/QuestionsStructure.module.css`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/QuestionsStructure.module.css#L357-L382)
* **Problem & Rationale:** 
  1. When scrolling down long lists of competency items, the table header (`#`, `COMPETENCY`, `SUB-COMPETENCY`, `MUST HAVE`, `GOOD TO HAVE`, `ICING ON CAKE`, `QUESTIONS`, `ADD TO TEST`) scrolled off the screen, making it hard to identify column categories.
  2. The table wrapper container lacked a fixed viewport boundary and vertical overflow scrolling.
* **Lines Changed:**
  * `ReviewCompetencies.module.css`: Lines 184–208
  * `QuestionsStructure.module.css`: Lines 357–382
* **Previous Code:**
  ```css
  /* src/components/project/assessment/ReviewCompetencies.module.css */
  .table-wrapper {
    background: #ffffff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    overflow: hidden;
  }

  .comp-table th {
    background: #efebd8;
    padding: 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #ddd9cc;
  }
  ```
  ```css
  /* src/components/project/assessment/QuestionsStructure.module.css */
  .table-wrapper {
    background: #ffffff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  }

  .questions-table th {
    border-bottom: 1px solid #ddd9cc;
    background: #efebd8;
    padding: 16px;
    color: #3a3f50;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    line-height: 16.5px;
    text-transform: uppercase;
  }
  ```
* **Updated Code:**
  ```css
  /* src/components/project/assessment/ReviewCompetencies.module.css */
  .table-wrapper {
    background: #ffffff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    max-height: calc(100vh - 280px);
    overflow-y: auto;
  }

  .comp-table th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #efebd8;
    padding: 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #ddd9cc;
  }
  ```
  ```css
  /* src/components/project/assessment/QuestionsStructure.module.css */
  .table-wrapper {
    background: #ffffff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    max-height: calc(100vh - 280px);
    overflow-y: auto;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  }

  .questions-table th {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid #ddd9cc;
    background: #efebd8;
    padding: 16px;
    color: #3a3f50;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    line-height: 16.5px;
    text-transform: uppercase;
  }
  ```

---

### **23. Dynamic Competency Source Sub-Label ("Generated By AI" vs "Uploaded By Own")**
* **File:** [`src/components/project/assessment/ReviewCompetencies.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/project/assessment/ReviewCompetencies.jsx#L47-L270)
* **Problem & Rationale:** Summary cards on the Review Competencies page previously hardcoded `"Uploaded By Own"` regardless of whether competencies were generated by AI or uploaded via file.
* **Lines Changed:** Lines 47–56, 179–183, 207, 235, 263
* **Previous Code:**
  ```jsx
  <span className={classes.cardSubLabel}>Uploaded By Own</span>
  ```
* **Updated Code:**
  ```jsx
  const isAiGenerated =
    assessmentFormationSource === assessmentFormationSourceType.AI_GENERATE ||
    assessmentFormationSource === 'ai generated' ||
    (typeof assessmentFormationSource === 'string' &&
      assessmentFormationSource.toLowerCase().includes('ai'));

  const sourceSubLabel = isAiGenerated ? 'Generated By AI' : 'Uploaded By Own';

  // Summary Card Sub-Label
  <span className={classes.cardSubLabel}>{sourceSubLabel}</span>
  ```

---




