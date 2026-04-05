import { create } from "zustand";
import api from "../lib/axios";

interface CanvasState {
  contentId: string | null;
  title: string;
  tiptapJson: string;
  isSaving: boolean;
  isLoading: boolean;
  isDirty: boolean; // unsaved changes?

  loadContent: (id: string) => Promise<void>;
  saveContent: () => Promise<void>;
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

  loadContent: async (id: string) => {
    set({ isLoading: true });
    const res = await api.get(`/content/load?id=${id}`);
    set({
      contentId: id,
      title: res.data.title,
      tiptapJson: res.data.tiptap_json,
      isLoading: false,
      isDirty: false,
    });
  },

  saveContent: async () => {
    const { contentId, title, tiptapJson } = get();
    if (!contentId) return;
    set({ isSaving: true });
    await api.put(`/content/${contentId}`, {
      title,
      tiptap_json: tiptapJson,
    });
    set({ isSaving: false, isDirty: false });
  },

  setTitle: (title) => set({ title, isDirty: true }),
  setTiptapJson: (json) => set({ tiptapJson: json, isDirty: true }),
}));
