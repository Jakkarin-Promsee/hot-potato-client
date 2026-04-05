import { create } from "zustand";
import api from "../lib/axios";

interface ContentItem {
  _id: string;
  title: string;
  title_image?: string;
  updatedAt: string;
}

interface ContentState {
  contents: ContentItem[];
  isLoading: boolean;
  error: string | null;
  fetchMyContents: () => Promise<void>;
  searchContents: (q: string) => Promise<void>;
  createContent: () => Promise<string>; // returns content_id
  deleteContent: (id: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  contents: [],
  isLoading: false,
  error: null,

  fetchMyContents: async () => {
    set({ isLoading: true, error: null });
    const res = await api.get("/content/search?mine=true");
    set({ contents: res.data, isLoading: false });
  },

  searchContents: async (q: string) => {
    set({ isLoading: true, error: null });
    const res = await api.get(`/content/search?mine=true&q=${q}`);
    set({ contents: res.data, isLoading: false });
  },

  createContent: async () => {
    const res = await api.post("/content/create");
    // Add new content to list
    await get().fetchMyContents();
    return res.data.content_id;
  },

  deleteContent: async (id: string) => {
    await api.delete(`/content/${id}`);
    set((state) => ({
      contents: state.contents.filter((c) => c._id !== id),
    }));
  },
}));
