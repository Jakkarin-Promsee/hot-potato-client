import type {
  CloudinaryUploadResponse,
  UploadedImage,
} from "../types/cloudinary.types";

// ─── Config ───────────────────────────────────────────────────────────────────
// Replace with your values from https://cloudinary.com/console
// Create an *unsigned* upload preset under Settings → Upload → Upload presets

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? "your_cloud_name",
  uploadPreset:
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "your_upload_preset",
} as const;

export function isConfigured(): boolean {
  return (
    CLOUDINARY_CONFIG.cloudName !== "your_cloud_name" &&
    CLOUDINARY_CONFIG.uploadPreset !== "your_upload_preset"
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadOptions {
  /** Called repeatedly with 0–100 during the upload */
  onProgress?: (pct: number) => void;
}

/**
 * Uploads a single image file to Cloudinary via the unsigned REST endpoint.
 * Returns the normalised UploadedImage on success; throws on failure.
 *
 * Progress is simulated (fetch doesn't expose upload progress).
 * Swap the body for an XHR-based approach if you need real progress events.
 */
export async function uploadImage(
  file: File,
  options: UploadOptions = {},
): Promise<UploadedImage> {
  const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
  const { onProgress } = options;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  // Simulated progress — increments until 88 % then jumps to 100 on success
  let pct = 0;
  const tick = setInterval(() => {
    pct = Math.min(pct + 12, 88);
    onProgress?.(pct);
  }, 200);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData },
    );

    clearInterval(tick);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: { message?: string } })?.error?.message ??
          `Upload failed (${res.status})`,
      );
    }

    const data: CloudinaryUploadResponse = await res.json();
    onProgress?.(100);

    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      original_filename: data.original_filename,
      format: data.format,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
      created_at: data.created_at,
    };
  } catch (err) {
    clearInterval(tick);
    throw err;
  }
}

// ─── Transform URL helpers ────────────────────────────────────────────────────

export interface Transform {
  label: string;
  params: string; // Cloudinary transformation string, e.g. "w_800,c_scale"
}

export const QUICK_TRANSFORMS: Transform[] = [
  { label: "Thumbnail 150×150", params: "w_150,h_150,c_fill" },
  { label: "Resize width 800", params: "w_800,c_scale" },
  { label: "WebP quality 80", params: "f_webp,q_80" },
];

export function applyTransform(secureUrl: string, params: string): string {
  return secureUrl.replace("/upload/", `/upload/${params}/`);
}
