import { useCallback, useEffect, useRef, useState } from "react";
import { useUploadStore } from "@/stores/cloudinary.store";
import {
  isConfigured,
  QUICK_TRANSFORMS,
  applyTransform,
} from "@/lib/cloudinary";
import { formatBytes, formatDate, formatDimensions } from "@/lib/format";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CloudinaryUpload() {
  const {
    isUploading,
    progress,
    error,
    previewUrl,
    history,
    selectedImage,
    upload,
    selectImage,
    deleteImage,
    clearHistory,
    fetchHistory,
  } = useUploadStore();

  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) upload(file);
    },
    [upload],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      e.target.value = "";
    },
    [handleFile],
  );

  const copyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">☁</span>
          </div>
          <span className="text-sm font-semibold tracking-widest text-zinc-300 uppercase">
            Cloudinary Tester
          </span>
        </div>
        <span className="text-xs text-zinc-500">
          {history.length} uploads stored
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10">
        {/* ── Left: uploader ──────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Upload image
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Sends directly to Cloudinary. URL saved locally.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={[
              "relative border-2 border-dashed rounded-xl cursor-pointer",
              "transition-all duration-200 flex flex-col items-center justify-center",
              "min-h-48 overflow-hidden",
              isDragging
                ? "border-violet-400 bg-violet-500/10"
                : "border-zinc-700 hover:border-zinc-500 bg-zinc-900",
              isUploading ? "cursor-not-allowed opacity-75" : "",
            ].join(" ")}
          >
            {isUploading && previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
                <div className="relative z-10 flex flex-col items-center gap-3 px-6 w-full">
                  <p className="text-xs text-zinc-400">Uploading…</p>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-violet-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-violet-400 font-semibold">
                    {progress}%
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 px-6 text-center">
                <div className="text-3xl text-zinc-600">↑</div>
                <p className="text-sm text-zinc-400">
                  {isDragging
                    ? "Release to upload"
                    : "Drop image here, or click to browse"}
                </p>
                <p className="text-xs text-zinc-600">
                  PNG, JPG, GIF, WebP, SVG…
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-xs text-red-400">
              ✕ {error}
            </div>
          )}

          {/* Config warning */}
          {!isConfigured() && (
            <div className="rounded-lg bg-amber-950/40 border border-amber-800/50 px-4 py-3 text-xs text-amber-400 space-y-1">
              <p className="font-semibold">⚠ Config needed</p>
              <p>
                Set{" "}
                <code className="bg-amber-900/40 px-1 rounded">
                  VITE_CLOUDINARY_CLOUD_NAME
                </code>{" "}
                and{" "}
                <code className="bg-amber-900/40 px-1 rounded">
                  VITE_CLOUDINARY_UPLOAD_PRESET
                </code>{" "}
                in your{" "}
                <code className="bg-amber-900/40 px-1 rounded">.env</code> file.
              </p>
              <p className="text-amber-600">
                Create an <strong>unsigned</strong> preset in Cloudinary →
                Settings → Upload.
              </p>
            </div>
          )}

          {/* Latest upload card */}
          {history[0] && !isUploading && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">
                Latest upload
              </p>
              <div className="flex gap-3 items-start">
                <img
                  src={history[0].secure_url}
                  alt={history[0].original_filename}
                  className="w-16 h-16 object-cover rounded-lg border border-zinc-700 shrink-0"
                />
                <div className="min-w-0 space-y-1 flex-1">
                  <p className="text-sm text-zinc-200 truncate">
                    {history[0].original_filename}.{history[0].format}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDimensions(history[0].width, history[0].height)} ·{" "}
                    {formatBytes(history[0].bytes)}
                  </p>
                  <p className="text-xs text-zinc-600 truncate">
                    {history[0].secure_url}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (history[0])
                    copyUrl(history[0].secure_url, history[0].public_id);
                }}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                  copiedId === history[0].public_id
                    ? "bg-green-900/50 text-green-400 border border-green-800"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                }`}
              >
                {copiedId === history[0].public_id ? "✓ Copied!" : "Copy URL"}
              </button>
            </div>
          )}
        </section>

        {/* ── Right: gallery ──────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                Upload history
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Stored in localStorage. Click an image to inspect.
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 flex items-center justify-center h-48 text-xs text-zinc-600">
              No uploads yet
            </div>
          ) : (
            <>
              {/* Thumbnail grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {history.map((img) => (
                  <div
                    key={img.public_id}
                    onClick={() =>
                      selectImage(
                        selectedImage?.public_id === img.public_id ? null : img,
                      )
                    }
                    className={[
                      "relative group aspect-square rounded-lg overflow-hidden cursor-pointer",
                      "border-2 transition-all duration-150",
                      selectedImage?.public_id === img.public_id
                        ? "border-violet-500"
                        : "border-transparent hover:border-zinc-600",
                    ].join(" ")}
                  >
                    <img
                      src={img.secure_url}
                      alt={img.original_filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteImage(img.public_id);
                        }}
                        className="text-xs bg-red-900/80 hover:bg-red-700 text-red-300 rounded px-2 py-0.5 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detail panel */}
              {selectedImage && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                      Image details
                    </p>
                    <button
                      onClick={() => selectImage(null)}
                      className="text-xs text-zinc-600 hover:text-zinc-400"
                    >
                      ✕
                    </button>
                  </div>

                  <img
                    src={selectedImage.secure_url}
                    alt={selectedImage.original_filename}
                    className="w-full max-h-48 object-contain rounded-lg bg-zinc-800"
                  />

                  {/* Metadata rows */}
                  <div className="text-xs space-y-1">
                    {(
                      [
                        [
                          "Filename",
                          `${selectedImage.original_filename}.${selectedImage.format}`,
                        ],
                        ["Size", formatBytes(selectedImage.bytes)],
                        [
                          "Dimensions",
                          formatDimensions(
                            selectedImage.width,
                            selectedImage.height,
                          ),
                        ],
                        ["Public ID", selectedImage.public_id],
                        ["Uploaded", formatDate(selectedImage.created_at)],
                      ] as [string, string][]
                    ).map(([label, val]) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-zinc-600 w-24 shrink-0">
                          {label}
                        </span>
                        <span className="text-zinc-300 truncate font-mono">
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Secure URL copy */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600">Secure URL</p>
                    <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                      <code className="text-xs text-violet-300 flex-1 truncate">
                        {selectedImage.secure_url}
                      </code>
                      <button
                        onClick={() =>
                          copyUrl(
                            selectedImage.secure_url,
                            selectedImage.public_id,
                          )
                        }
                        className={`text-xs px-2 py-1 rounded shrink-0 transition-colors ${
                          copiedId === selectedImage.public_id
                            ? "bg-green-800/50 text-green-400"
                            : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                        }`}
                      >
                        {copiedId === selectedImage.public_id ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Quick transforms */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600">
                      Quick transforms (copy &amp; use):
                    </p>
                    <div className="space-y-1">
                      {QUICK_TRANSFORMS.map(({ label, params }) => {
                        const tUrl = applyTransform(
                          selectedImage.secure_url,
                          params,
                        );
                        const key = `${selectedImage.public_id}-${params}`;
                        return (
                          <div
                            key={params}
                            className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-1.5"
                          >
                            <span className="text-xs text-zinc-500">
                              {label}
                            </span>
                            <button
                              onClick={() => copyUrl(tUrl, key)}
                              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                                copiedId === key
                                  ? "bg-green-800/50 text-green-400"
                                  : "text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {copiedId === key ? "✓ Copied" : "Copy URL"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
