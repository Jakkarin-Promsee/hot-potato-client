/**
 * useUploadStore
 *
 * Central state for the Cloudinary upload workflow.
 * Uses Zustand for simple, boilerplate-free state management.
 *
 * Install if not already present:
 *   npm install zustand
 */

import { create } from "zustand";
import { uploadImage } from "../lib/cloudinary";
import type { UploadedImage } from "../types/cloudinary.types";

// ─── localStorage persistence helpers ────────────────────────────────────────

const STORAGE_KEY = "cloudinary_upload_history";

function loadHistory(): UploadedImage[] {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as UploadedImage[];
  } catch {
    return [];
  }
}

function persistHistory(images: UploadedImage[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface UploadState {
  // Upload status
  isUploading: boolean;
  progress: number;
  error: string | null;
  previewUrl: string | null; // object URL of the file being uploaded

  // History (latest first)
  history: UploadedImage[];
  selectedImage: UploadedImage | null;

  // Actions
  upload: (file: File) => Promise<void>;
  selectImage: (img: UploadedImage | null) => void;
  deleteImage: (public_id: string) => void;
  clearHistory: () => void;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUploadStore = create<UploadState>((set, get) => ({
  isUploading: false,
  progress: 0,
  error: null,
  previewUrl: null,
  history: loadHistory(),
  selectedImage: null,

  // ── upload ────────────────────────────────────────────────────────────────

  upload: async (file: File) => {
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

      const next = [uploaded, ...get().history];
      persistHistory(next);
      set({ history: next });

      // Brief pause at 100 % before resetting
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

  deleteImage: (public_id) => {
    const next = get().history.filter((img) => img.public_id !== public_id);
    persistHistory(next);
    set({
      history: next,
      selectedImage:
        get().selectedImage?.public_id === public_id
          ? null
          : get().selectedImage,
    });
  },

  clearHistory: () => {
    persistHistory([]);
    set({ history: [], selectedImage: null });
  },

  clearError: () => set({ error: null }),
}));
