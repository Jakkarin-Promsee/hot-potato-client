import { create } from "zustand";
import api from "../lib/axios";

/** Fields returned by GET /content/search (mine or explore) */
export interface ContentItem {
  _id: string;
  title: string;
  title_image?: string;
  updatedAt: string;
  topics?: string[];
  description?: string;
  access_type?: "public" | "link-only" | "private";
  /** Denormalized owner display name */
  author_name?: string;
  /** Same order as server `collaborators` */
  collaborator_names?: string[];
}

interface ContentState {
  contents: ContentItem[];
  exploreContents: ContentItem[];
  isLoading: boolean;
  exploreLoading: boolean;
  error: string | null;
  fetchMyContents: () => Promise<void>;
  searchContents: (q: string) => Promise<void>;
  fetchExploreContents: () => Promise<void>;
  searchExploreContents: (q: string) => Promise<void>;
  createContent: () => Promise<string>; // returns content_id
  deleteContent: (id: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  contents: [],
  exploreContents: [],
  isLoading: false,
  exploreLoading: false,
  error: null,

  fetchMyContents: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<ContentItem[]>("/content/search?mine=true");
      set({ contents: res.data, isLoading: false });
    } catch {
      set({ error: "Failed to load your content.", isLoading: false });
    }
  },

  searchContents: async (q: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<ContentItem[]>(
        `/content/search?mine=true&q=${encodeURIComponent(q)}`,
      );
      set({ contents: res.data, isLoading: false });
    } catch {
      set({ error: "Search failed.", isLoading: false });
    }
  },

  fetchExploreContents: async () => {
    set({ exploreLoading: true, error: null });
    try {
      const res = await api.get<ContentItem[]>("/content/search?explore=true");
      set({ exploreContents: res.data, exploreLoading: false });
    } catch {
      set({
        error: "Failed to load explore content.",
        exploreLoading: false,
      });
    }
  },

  searchExploreContents: async (q: string) => {
    set({ exploreLoading: true, error: null });
    try {
      const res = await api.get<ContentItem[]>(
        `/content/search?explore=true&q=${encodeURIComponent(q)}`,
      );
      set({ exploreContents: res.data, exploreLoading: false });
    } catch {
      set({ error: "Search failed.", exploreLoading: false });
    }
  },

  createContent: async () => {
    const res = await api.post("/content/create");
    await get().fetchMyContents();
    return res.data.content_id;
  },

  deleteContent: async (id: string) => {
    await api.delete(`/content/${id}`);
    set((state) => ({
      contents: state.contents.filter((c) => c._id !== id),
      exploreContents: state.exploreContents.filter((c) => c._id !== id),
    }));
  },
}));
