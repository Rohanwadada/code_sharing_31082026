# Future Upgrade: Direct Shifu Chat Bypass (Skip Intermediate Prompt Screen)

**Date:** 25 September 2026  
**Status:** Architecture Designed (Pending Future Integration)  
**Scope:** Frontend (`PromptSharingContext.jsx`, `EmptyState.jsx`, `NewRoadmapCreationModeSelectionPage.jsx`)

---

## 1. Objective & UX Improvement

### 1.1 Current User Flow (3 Steps)
1. **Selection Modal:** User clicks *"Create with Shifu"* on [`NewRoadmapCreationModeSelectionPage.jsx`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/frontend/src/components/roadmap/NewRoadmapCreationModeSelectionPage.jsx).
2. **Intermediate Screen (Screen 1):** User is navigated to `/project/{projectId}/shifu` (`EmptyState.jsx`), where the generated prompt is pre-filled into a textarea. The user has to manually click the paper-airplane send button.
3. **Active Chat Thread (Screen 2):** Only after the send button is clicked does it call `sendMessage()`, generate the `thread_id`, and navigate to `/project/{projectId}/shifu/{threadId}`, displaying the live clarification question bubbles.

### 1.2 Target Flow (2 Steps - Direct Bypass)
1. **Selection Modal:** User clicks *"Create with Shifu"*.
2. **Direct Transition:** The system generates the prompt from the JD in the background, immediately creates the thread via `sendMessage()`, and **directly navigates to Screen 2** (`/project/{projectId}/shifu/{threadId}`).
3. **Outcome:** The user completely skips Screen 1 and immediately sees Shifu asking *"What is your ideal learning pace?"*.

---

## 2. Implementation Architecture

```
                                  USER ACTION
                         Clicks "Create with Shifu"
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ generateRoadmapPrompt(JD)     │
                      └───────────────┬───────────────┘
                                      │ Prompt generated
                                      ▼
                      ┌───────────────────────────────┐
                      │ sendMessage({ prompt })       │
                      │ (ThreadType.ROADMAP_GEN)      │
                      └───────────────┬───────────────┘
                                      │ Returns { thread_id, run_id }
                                      ▼
                      ┌───────────────────────────────┐
                      │ router.push(                  │
                      │   `/project/${id}/shifu/${tid}`│
                      │ )                             │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                        LAND DIRECTLY ON CHAT PAGE
                      (No manual send click needed)
```

---

## 3. Step-by-Step Code Modifications for Future Implementation

### 3.1 Modify `frontend/src/context/PromptSharingContext.jsx`

Update `handleGeneratePromptAndNavigate` to automatically dispatch the first message to create the thread and route directly:

```jsx
// #changes: Import sendMessage and ThreadType
import { sendMessage, ThreadType } from '@/service/thread.service';

export const PromptSharingProvider = ({ children }) => {
  // ... existing states ...

  const handleGeneratePromptAndNavigate = async (projectId = null, options = {}, file = null, userDetails = null) => {
    try {
      setIsGenerating(true);
      const reqOptions = {
        who_is_this_for: options.who_is_this_for || whoIsThisFor,
        what_to_create: options.what_to_create || whatToCreate,
        role_description_text: options.role_description_text || roleDescriptionText,
        project_id: projectId || options.project_id,
      };
      const reqFile = file || uploadedFile;

      // 1. Generate prompt from JD / role details
      const resData = await generateRoadmapPrompt(reqOptions, reqFile);
      setGeneratedData(resData);

      if (resData && resData.prompt) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pending_roadmap_prompt', resData.prompt);
        }

        // 2. #changes: Directly create thread without landing on intermediate EmptyState
        if (projectId) {
          try {
            const threadPayload = {
              e: userDetails?.email,
              message: resData.prompt,
              project_id: projectId,
            };
            const responseData = await sendMessage(threadPayload, ThreadType.ROADMAP_GENERATION);
            
            if (responseData && responseData.thread_id) {
              // Directly navigate to the active chat screen (Screen 2)
              router.push(`/project/${projectId}/shifu/${responseData.thread_id}`);
              return resData;
            }
          } catch (threadErr) {
            console.warn('Auto-thread dispatch failed, falling back to EmptyState:', threadErr);
          }
        }
      }

      // Fallback navigation
      if (projectId) {
        router.push(`/project/${projectId}/shifu`);
      } else {
        router.push('/threads');
      }
      return resData;
    } catch (err) {
      console.error('Error generating roadmap prompt:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };
```

---

### 3.2 Modify `frontend/src/components/roadmap/NewRoadmapCreationModeSelectionPage.jsx`

Pass the logged-in `userDetails` into `handleGeneratePromptAndNavigate`:

```jsx
// #changes: Pass userDetails for direct auto-thread creation
import { useAuthStore } from '@/store/authStore';

const NewRoadmapCreationModeSelectionPage = ({ projectId }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { handleGeneratePromptAndNavigate, isGenerating } = usePromptSharingContext();

  const handleCreateWithShifu = async () => {
    if (isGenerating) return;
    try {
      await handleGeneratePromptAndNavigate(projectId, {}, null, user);
    } catch (err) {
      console.error('Failed to generate prompt via Shifu:', err);
      router.push(`/project/${projectId}/shifu`);
    }
  };
```

---

## 4. Alternative Approach: Query Parameter Auto-Submit

If you prefer keeping thread creation inside `EmptyState.jsx`:
1. In `PromptSharingContext.jsx`:
   ```javascript
   router.push(`/project/${projectId}/shifu?auto_start=true`);
   ```
2. In `EmptyState.jsx`:
   ```javascript
   useEffect(() => {
     const autoStart = searchParams?.get('auto_start');
     const pendingPrompt = sessionStorage.getItem('pending_roadmap_prompt');
     if (autoStart === 'true' && pendingPrompt && !isThreadRunning) {
       handleSendMessage(pendingPrompt);
     }
   }, []);
   ```

---

## 5. Benefits Summary
- **Zero Friction:** Users don't need to re-read or confirm a prompt that the AI already crafted for them.
- **Immediate Interactivity:** Direct landing into clarification questions ("What is your learning pace?", "What is your daily commitment?").
- **Faster Conversion:** Cuts the roadmap generation flow by 1 full user click and page load.
