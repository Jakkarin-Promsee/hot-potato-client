import { create } from "zustand";
import api from "@/lib/axios";
import type { Category } from "@/types/cloudinary.types";

interface CategoryState {
  categories: Category[];
  isFetching: boolean;
  error: string | null;

  fetchCategories: () => Promise<void>;
  createCategory: (name: string, description?: string) => Promise<void>;
  updateCategory: (
    id: string,
    name: string,
    description?: string,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isFetching: false,
  error: null,

  fetchCategories: async () => {
    set({ isFetching: true, error: null });
    try {
      const { data } = await api.get<Category[]>("/categories");
      set({ categories: data });
    } catch {
      set({ error: "Failed to load categories." });
    } finally {
      set({ isFetching: false });
    }
  },

  createCategory: async (name, description = "") => {
    try {
      const { data } = await api.post<Category>("/categories", {
        name,
        description,
      });
      set((state) => ({ categories: [data, ...state.categories] }));
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "Failed to create category.";
      set({ error: msg });
    }
  },

  updateCategory: async (id, name, description) => {
    const previous = get().categories;
    // Optimistic update
    set((state) => ({
      categories: state.categories.map((c) =>
        c._id === id
          ? { ...c, name, description: description ?? c.description }
          : c,
      ),
    }));
    try {
      const { data } = await api.patch<Category>(`/categories/${id}`, {
        name,
        description,
      });
      set((state) => ({
        categories: state.categories.map((c) => (c._id === id ? data : c)),
      }));
    } catch (err: any) {
      set({
        categories: previous,
        error: err.response?.data?.message ?? "Failed to update.",
      });
    }
  },

  deleteCategory: async (id) => {
    const previous = get().categories;
    set((state) => ({
      categories: state.categories.filter((c) => c._id !== id),
    }));
    try {
      await api.delete(`/categories/${id}`);
    } catch {
      set({ categories: previous, error: "Failed to delete category." });
    }
  },

  clearError: () => set({ error: null }),
}));
