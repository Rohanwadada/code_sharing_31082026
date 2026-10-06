import { create } from 'zustand';
import axios from '@/lib/axios';

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
  wizardState: {},
  isLoadingProject: false,
};

export const useProjectStore = create((set, get) => ({
  ...initialProjectState,

  setCurrentProjectId: (value) => set({ currentProjectId: value }),
  setCurrentProjectName: (value) => set({ currentProjectName: value }),

  setProjectData: (data) => set((state) => ({ ...state, ...data })),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),

  fetchProjectDetails: async (projectId) => {
    if (!projectId) return null;
    const currentState = get();
    if (currentState.currentProjectId === projectId && currentState.currentProjectName) {
      return currentState;
    }

    try {
      set({ isLoadingProject: true });
      const res = await axios.post('/project/details', { project_id: projectId });
      const pData = res.data;
      if (pData) {
        set({
          currentProjectId: projectId,
          currentProjectName: pData.project_name || '',
          functionName: pData.function_name || '',
          designationName: pData.designation_name || '',
          assessmentMode: pData.project_details?.assessment_mode || 'skill_gap',
        });
      }

      // Fetch wizard state if exists
      try {
        const wizRes = await axios.get(`/project-wizard/${projectId}`);
        if (wizRes.data?.step_data) {
          set({ wizardState: wizRes.data.step_data });
        }
      } catch (wErr) {
        // session not started yet
      }

      return pData;
    } catch (err) {
      console.error('Failed to fetch project details in store:', err);
      return null;
    } finally {
      set({ isLoadingProject: false });
    }
  },

  saveWizardStep: async (projectId, stepKey, lastRoute, stepPayload) => {
    if (!projectId) return null;
    try {
      const res = await axios.post('/project-wizard/save', {
        project_id: projectId,
        current_step: stepKey,
        last_route: lastRoute,
        step_key: stepKey,
        step_payload: stepPayload,
      });
      if (res.data?.step_data) {
        set({ wizardState: res.data.step_data });
      }
      return res.data;
    } catch (err) {
      console.error('Failed to save wizard step:', err);
      return null;
    }
  },

  resetProjectStore: () => set({ ...initialProjectState }),
}));

