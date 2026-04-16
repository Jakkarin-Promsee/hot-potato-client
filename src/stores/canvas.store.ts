import { create } from "zustand";
import api from "../lib/axios";

interface CanvasState {
  contentId: string | null;
  title: string;
  titleImage: string;
  tiptapJson: string;
  collaborators: string[];
  accessType: "public" | "link-only" | "private";
  topics: string[];
  description: string;
  isSaving: boolean;
  isLoading: boolean;
  isDirty: boolean; // unsaved changes?
  updatedAt: string | null; // 👈 track version
  conflict: boolean; // 👈 conflict flag

  loadContent: (id: string) => Promise<void>;
  saveContent: () => Promise<void>;
  forceSave: () => Promise<void>;
  setTitle: (title: string) => void;
  setTitleImage: (url: string) => void;
  setTiptapJson: (json: string) => void;
  setCollaborators: (collaborators: string[]) => void;
  setAccessType: (accessType: "public" | "link-only" | "private") => void;
  setTopics: (topics: string[]) => void;
  setDescription: (description: string) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  contentId: null,
  title: "Untitled",
  titleImage: "",
  tiptapJson: "{}",
  collaborators: [],
  accessType: "private",
  topics: [],
  description: "",
  isSaving: false,
  isLoading: false,
  isDirty: false,
  updatedAt: null,
  conflict: false,

  loadContent: async (id: string) => {
    set({ isLoading: true, conflict: false });
    const res = await api.get(`/content/load?id=${id}`);
    const collaborators = Array.isArray(res.data.collaborators)
      ? res.data.collaborators.map((c: unknown) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object" && "_id" in c) {
            const raw = (c as { _id?: unknown })._id;
            return typeof raw === "string" ? raw : String(raw ?? "");
          }
          return String(c ?? "");
        })
      : [];

    set({
      contentId: id,
      title: res.data.title,
      titleImage: res.data.title_image ?? "",
      tiptapJson: res.data.tiptap_json,
      collaborators: collaborators.filter(Boolean),
      accessType: res.data.access_type ?? "private",
      topics: Array.isArray(res.data.topics) ? res.data.topics : [],
      description: res.data.description ?? "",
      updatedAt: res.data.updatedAt, // 👈 store server time
      isLoading: false,
      isDirty: false,
    });
  },

  saveContent: async () => {
    const {
      contentId,
      title,
      titleImage,
      tiptapJson,
      collaborators,
      accessType,
      topics,
      description,
      updatedAt,
      isDirty,
    } = get();
    if (!contentId || !isDirty) return;

    set({ isSaving: true });

    try {
      const res = await api.put(`/content/${contentId}`, {
        title,
        title_image: titleImage,
        tiptap_json: tiptapJson,
        collaborators,
        access_type: accessType,
        topics,
        description,
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
    const {
      contentId,
      title,
      titleImage,
      tiptapJson,
      collaborators,
      accessType,
      topics,
      description,
    } = get();
    if (!contentId) return;

    set({ isSaving: true });
    const res = await api.put(`/content/${contentId}`, {
      title,
      title_image: titleImage,
      tiptap_json: tiptapJson,
      collaborators,
      access_type: accessType,
      topics,
      description,
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
  setTitleImage: (titleImage) => set({ titleImage, isDirty: true }),
  setTiptapJson: (json) => set({ tiptapJson: json, isDirty: true }),
  setCollaborators: (collaborators) => set({ collaborators, isDirty: true }),
  setAccessType: (accessType) => set({ accessType, isDirty: true }),
  setTopics: (topics) => set({ topics, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),
}));
