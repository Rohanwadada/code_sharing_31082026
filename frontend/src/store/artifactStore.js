import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useArtifactStore = create(
  devtools((set, get, store) => ({
    artifactId: null,
    title: '',
    description: '',
    artifactType: null,
    artifactData: null,
    artifactMetadata: null,

    setArtifactId: (value) =>
      set({
        artifactId: value,
      }),

    setTitle: (value) =>
      set({
        title: value,
      }),

    setDescription: (value) =>
      set({
        description: value,
      }),

    setArtifactType: (value) =>
      set({
        artifactType: value,
      }),

    setArtifactData: (updater) =>
      set((state) => ({
        artifactData:
          typeof updater === 'function' ? updater(state.artifactData) : updater,
      })),

    setArtifactMetadata: (updater) =>
      set((state) => ({
        artifactMetadata:
          typeof updater === 'function'
            ? updater(state.artifactMetadata)
            : updater,
      })),

    reset: () => {
      set(store.getInitialState(), true);
    },
  })),
);
