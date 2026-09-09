import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useRoadmapStore = create(
  devtools((set, get, store) => ({
    roadmapId: null,
    nodes: [],
    edges: [],
    roadmapGenerationMode: null,
    roadmapAccessLevel: null,
    learningProgress: {},
    contentCompleted: 0,
    roadmapTitle: '',
    isBookmarked: false,
    totalRoadmapContent: 0,
    grossRoadmapContent: 0,
    premiumAccessData: null,
    roadmapPrice: 0.0,
    selectedNode: null,
    zoomLevel: 1.0,
    isRoadmapFetching: false,
    isAiContentGenerationJobRunning: false,
    aiContentGenerationStatus: null,
    aiContentGenerationJobDetails: {},
    aiContentGenerationJobData: {},
    roadmapGenerationPrompt: null,
    currentRoadmapView: 'tree',
    currentChapterIndex: 0,
    contentCache: new Map(),

    courseRecommendationJobDetails: null,
    courseRecommendations: null,

    showNotificationModal: true,

    // setters
    setRoadmapId: (value) => set({ roadmapId: value }),
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setRoadmapGenerationMode: (mode) => set({ roadmapGenerationMode: mode }),
    setRoadmapAccessLevel: (level) => set({ roadmapAccessLevel: level }),
    setLearningProgress: (progress) => set({ learningProgress: progress }),
    setContentCompleted: (count) => set({ contentCompleted: count }),
    setRoadmapTitle: (title) => set({ roadmapTitle: title }),
    setIsBookmarked: (flag) => set({ isBookmarked: flag }),
    setTotalRoadmapContent: (total) => set({ totalRoadmapContent: total }),
    setGrossRoadmapContent: (gross) => set({ grossRoadmapContent: gross }),
    setPremiumAccessData: (data) => set({ premiumAccessData: data }),
    setRoadmapPrice: (price) => set({ roadmapPrice: price }),
    setSelectedNode: (node) => set({ selectedNode: node }),
    setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
    setIsRoadmapFetching: (flag) => set({ isRoadmapFetching: flag }),
    setIsAiContentGenerationJobRunning: (flag) =>
      set({ isAiContentGenerationJobRunning: flag }),
    setAiContentGenerationStatus: (status) =>
      set({ aiContentGenerationStatus: status }),
    setAiContentGenerationJobDetails: (updater) =>
      set((state) => ({
        aiContentGenerationJobDetails:
          typeof updater === 'function'
            ? updater(state.aiContentGenerationJobDetails)
            : updater,
      })),
    setAiContentGenerationJobData: (data) =>
      set({ aiContentGenerationJobData: data }),
    setRoadmapGenerationPrompt: (prompt) =>
      set({ roadmapGenerationPrompt: prompt }),
    setCurrentRoadmapView: (view) => set({ currentRoadmapView: view }),
    setCurrentChapterIndex: (index) => set({ currentChapterIndex: index }),
    setContentCache: (cache) => set({ contentCache: cache }),

    setCourseRecommendationJobDetails: (cache) =>
      set({ courseRecommendationJobDetails: cache }),
    setCourseRecommendations: (cache) => set({ courseRecommendations: cache }),

    setShowNotificationModal: (value) => set({ showNotificationModal: value }),

    reset: () => set(store.getInitialState(), true),
  })),
);
