import { create } from 'zustand';

export const useDoubtSolverThreadStore = create((set, get, store) => ({
  isOpen: false,
  threadId: null,
  messages: [],
  isThreadRunning: false,
  runId: null,

  setIsOpen: (value) => set({ isOpen: value }),
  setThreadId: (value) => set({ threadId: value }),
  setMessages: (updater) =>
    set((state) => ({
      messages:
        typeof updater === 'function' ? updater(state.messages) : updater,
    })),
  setIsThreadRunning: (value) => set({ isThreadRunning: value }),
  setRunId: (value) => set({ runId: value }),
  reset: () => {
    set(store.getInitialState(), true);
  },
}));
