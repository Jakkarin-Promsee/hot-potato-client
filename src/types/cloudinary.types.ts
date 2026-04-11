// ─── Domain types shared across lib/ and stores/ ─────────────────────────────

export interface UploadedImage {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
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
