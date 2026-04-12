import { create } from "zustand";
import { uploadImage } from "@/lib/cloudinary";
import type { UploadedImage } from "@/types/cloudinary.types";
import api from "@/lib/axios";

interface UploadState {
  isUploading: boolean;
  isFetching: boolean;
  progress: number;
  error: string | null;
  previewUrl: string | null;
  history: UploadedImage[];
  selectedImage: UploadedImage | null;

  fetchHistory: () => Promise<void>;
  upload: (file: File, category_id?: string | null) => Promise<void>;
  uploadFromUrl: (url: string, category_id?: string | null) => Promise<void>;
  assignCategory: (
    public_id: string,
    category_id: string | null,
  ) => Promise<void>;
  selectImage: (img: UploadedImage | null) => void;
  deleteImage: (public_id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  clearError: () => void;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  isUploading: false,
  isFetching: false,
  progress: 0,
  error: null,
  previewUrl: null,
  history: [],
  selectedImage: null,

  fetchHistory: async () => {
    set({ isFetching: true, error: null });
    try {
      const { data } = await api.get<UploadedImage[]>("/images");
      set({ history: data });
    } catch {
      set({ error: "Failed to load images." });
    } finally {
      set({ isFetching: false });
    }
  },

  upload: async (file, category_id = null) => {
    if (!file.type.startsWith("image/")) {
      set({ error: "Only image files are supported." });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    set({ isUploading: true, progress: 0, error: null, previewUrl });

    try {
      const uploaded = await uploadImage(file, {
        onProgress: (pct) => set({ progress: pct }),
      });

      const { data: saved } = await api.post<UploadedImage>("/images", {
        ...uploaded,
        category_id, // ← pass category at upload time if known
      });

      set((state) => ({ history: [saved, ...state.history] }));

      setTimeout(() => {
        set({ isUploading: false, progress: 0, previewUrl: null });
      }, 600);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Upload failed.",
        isUploading: false,
        progress: 0,
        previewUrl: null,
      });
    }
  },

  uploadFromUrl: async (url, category_id = null) => {
    if (!url.trim()) return;

    set({ isUploading: true, error: null, previewUrl: url }); // use the url itself as preview

    try {
      const { data: saved } = await api.post<UploadedImage>("/images/url", {
        url,
        category_id,
      });

      set((state) => ({ history: [saved, ...state.history] }));

      setTimeout(() => {
        set({ isUploading: false, previewUrl: null });
      }, 600);
    } catch (err: any) {
      set({
        error: err.response?.data?.message ?? "Failed to save image from URL.",
        isUploading: false,
        previewUrl: null,
      });
    }
  },

  // Assign or remove a category from an already-uploaded image
  assignCategory: async (public_id, category_id) => {
    const previous = get().history;
    // Optimistic update
    set((state) => ({
      history: state.history.map((img) =>
        img.public_id === public_id ? { ...img, category_id } : img,
      ),
    }));
    try {
      const { data } = await api.patch<UploadedImage>(
        `/images/${encodeURIComponent(public_id)}/category`,
        { category_id },
      );
      set((state) => ({
        history: state.history.map((img) =>
          img.public_id === public_id ? data : img,
        ),
      }));
    } catch {
      set({ history: previous, error: "Failed to assign category." });
    }
  },

  selectImage: (img) => set({ selectedImage: img }),

  deleteImage: async (public_id) => {
    const previous = get().history;
    set((state) => ({
      history: state.history.filter((img) => img.public_id !== public_id),
      selectedImage:
        state.selectedImage?.public_id === public_id
          ? null
          : state.selectedImage,
    }));
    try {
      await api.delete(`/images/${encodeURIComponent(public_id)}`);
    } catch {
      set({ history: previous, error: "Failed to delete image." });
    }
  },

  clearHistory: async () => {
    const previous = get().history;
    set({ history: [], selectedImage: null });
    try {
      await api.delete("/images");
    } catch {
      set({ history: previous, error: "Failed to clear history." });
    }
  },

  clearError: () => set({ error: null }),
}));
