import { create } from "zustand";
import api from "../lib/axios";

interface CanvasState {
  contentId: string | null;
  title: string;
  tiptapJson: string;
  isSaving: boolean;
  isLoading: boolean;
  isDirty: boolean; // unsaved changes?
  updatedAt: string | null; // 👈 track version
  conflict: boolean; // 👈 conflict flag

  loadContent: (id: string) => Promise<void>;
  saveContent: () => Promise<void>;
  forceSave: () => Promise<void>;
  setTitle: (title: string) => void;
  setTiptapJson: (json: string) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  contentId: null,
  title: "Untitled",
  tiptapJson: "{}",
  isSaving: false,
  isLoading: false,
  isDirty: false,
  updatedAt: null,
  conflict: false,

  loadContent: async (id: string) => {
    set({ isLoading: true, conflict: false });
    const res = await api.get(`/content/load?id=${id}`);
    set({
      contentId: id,
      title: res.data.title,
      tiptapJson: res.data.tiptap_json,
      updatedAt: res.data.updatedAt, // 👈 store server time
      isLoading: false,
      isDirty: false,
    });
  },

  saveContent: async () => {
    const { contentId, title, tiptapJson, updatedAt, isDirty } = get();
    if (!contentId || !isDirty) return;

    set({ isSaving: true });

    try {
      const res = await api.put(`/content/${contentId}`, {
        title,
        tiptap_json: tiptapJson,
        clientUpdatedAt: updatedAt, // 👈 send our version timestamp
      });

      // Update our local timestamp to the new server time
      set({ isSaving: false, isDirty: false, updatedAt: res.data.updatedAt });
    } catch (err: any) {
      set({ isSaving: false });

      if (err.response?.status === 409) {
        // Conflict — stop isDirty so beforeunload won't retry
        set({ conflict: true, isDirty: false });
      }
    }
  },

  forceSave: async () => {
    const { contentId, title, tiptapJson } = get();
    if (!contentId) return;

    set({ isSaving: true });
    const res = await api.put(`/content/${contentId}`, {
      title,
      tiptap_json: tiptapJson,
      // 👆 no clientUpdatedAt — skips version check
    });
    set({
      isSaving: false,
      isDirty: false,
      conflict: false,
      updatedAt: res.data.updatedAt,
    });
  },

  setTitle: (title) => set({ title, isDirty: true }),
  setTiptapJson: (json) => set({ tiptapJson: json, isDirty: true }),
}));
