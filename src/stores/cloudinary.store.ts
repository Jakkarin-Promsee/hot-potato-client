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

  // Actions
  fetchHistory: () => Promise<void>;
  upload: (file: File) => Promise<void>;
  selectImage: (img: UploadedImage | null) => void;
  deleteImage: (public_id: string) => void;
  clearHistory: () => void;
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

  // ── fetch history from server ─────────────────────────────────────────────
  fetchHistory: async () => {
    set({ isFetching: true, error: null });
    try {
      const { data } = await api.get<UploadedImage[]>("/images");
      set({ history: data });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load images.",
      });
    } finally {
      set({ isFetching: false });
    }
  },

  // ── upload ────────────────────────────────────────────────────────────────
  upload: async (file: File) => {
    if (!file.type.startsWith("image/")) {
      set({ error: "Only image files are supported." });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    set({ isUploading: true, progress: 0, error: null, previewUrl });

    try {
      // 1. Upload to Cloudinary
      const uploaded = await uploadImage(file, {
        onProgress: (pct) => set({ progress: pct }),
      });

      // 2. Persist the returned URL/metadata to your Node API
      const { data: saved } = await api.post<UploadedImage>(
        "/images",
        uploaded,
      );

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

  // ── history actions ───────────────────────────────────────────────────────
  selectImage: (img) => set({ selectedImage: img }),

  deleteImage: async (public_id: string) => {
    // Optimistic update — remove locally first
    const previous = get().history;
    set((state) => ({
      history: state.history.filter((img) => img.public_id !== public_id),
      selectedImage:
        state.selectedImage?.public_id === public_id
          ? null
          : state.selectedImage,
    }));

    try {
      await api.delete(`/images/${public_id}`);
    } catch (err) {
      // Roll back on failure
      set({ history: previous, error: "Failed to delete image." });
    }
  },

  clearHistory: async () => {
    const previous = get().history;
    set({ history: [], selectedImage: null });
    try {
      await api.delete("/images");
    } catch (err) {
      set({ history: previous, error: "Failed to clear history." });
    }
  },

  clearError: () => set({ error: null }),
}));
