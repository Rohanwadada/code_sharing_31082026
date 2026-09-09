import { create } from 'zustand';

export const useRoadmapEditorSidebarStore = create((set) => ({
  activeSection: null,
  activeSectionWidth: null,

  setActiveSection: (section) => set({ activeSection: section }),

  setActiveSectionWidth: (width) => set({ activeSectionWidth: width }),
}));
