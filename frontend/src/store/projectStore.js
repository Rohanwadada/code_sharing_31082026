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
