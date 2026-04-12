// ─── Domain types shared across lib/ and stores/ ─────────────────────────────

// cloudinary.types.ts
export interface UploadedImage {
  _id: string; // ← add this, server returns MongoDB _id now
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
  category_id: string | null; // ← add this
}

export interface Category {
  _id: string;
  name: string;
  description: string;
  created_at: string;
}

/** Raw shape returned by the Cloudinary REST upload endpoint */
export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
  // Cloudinary returns many more fields; extend as needed
}
