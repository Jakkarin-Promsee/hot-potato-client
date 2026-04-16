import { create } from "zustand";
import api from "@/lib/axios";

export interface HistoryContentPreview {
  _id: string;
  title: string;
  title_image: string;
  topics: string[];
  description: string;
  access_type?: string;
  updatedAt?: string;
  author_name?: string;
  collaborator_names?: string[];
}

export interface LearningHistoryEntry {
  _id: string;
  last_accessed: string;
  content: HistoryContentPreview;
}

interface LearningHistoryState {
  entries: LearningHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  fetchHistory: (limit?: number) => Promise<void>;
  /** Call when a user opens a lesson they may view (viewer or editor with access). */
  recordVisit: (contentId: string) => Promise<void>;
  clearError: () => void;
}

export const useLearningHistoryStore = create<LearningHistoryState>(
  (set) => ({
    entries: [],
    isLoading: false,
    error: null,

    fetchHistory: async (limit = 50) => {
      set({ isLoading: true, error: null });
      try {
        const res = await api.get<LearningHistoryEntry[]>(
          `/history?limit=${limit}`,
        );
        set({ entries: res.data, isLoading: false });
      } catch {
        set({
          error: "Failed to load history.",
          isLoading: false,
        });
      }
    },

    recordVisit: async (contentId: string) => {
      if (!contentId) return;
      try {
        await api.post(`/history/visit/${contentId}`);
      } catch {
        // Non-blocking: viewer still works if history fails
      }
    },

    clearError: () => set({ error: null }),
  }),
);
