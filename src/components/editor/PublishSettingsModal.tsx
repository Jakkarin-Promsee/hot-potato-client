import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Images, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/axios";
import { useCanvasStore } from "@/stores/canvas.store";
import { useUploadStore } from "@/stores/cloudinary.store";

/** Picker: all uploaded images in a grid; one click sets the title image and closes. */
const TitleImageGalleryModal = memo(
  ({
    onClose,
    onPick,
    currentUrl,
  }: {
    onClose: () => void;
    onPick: (url: string) => void;
    currentUrl: string;
  }) => {
    const history = useUploadStore((s) => s.history);
    const isFetching = useUploadStore((s) => s.isFetching);
    const fetchHistory = useUploadStore((s) => s.fetchHistory);

    useEffect(() => {
      void fetchHistory();
    }, [fetchHistory]);

    return (
      <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          className="relative z-10 flex max-h-[78vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
            <div>
              <span className="text-sm font-semibold text-foreground">
                Choose from gallery
              </span>
              <p className="text-[11px] text-muted-foreground">
                Click an image to use it as the title image.
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {isFetching ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                No images in your gallery yet. Use{" "}
                <span className="font-medium text-foreground">Upload</span>{" "}
                above first, then try again.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {history.map((img) => {
                  const selected = currentUrl === img.secure_url;
                  return (
                    <button
                      key={img.public_id}
                      type="button"
                      title={img.original_filename}
                      onClick={() => {
                        onPick(img.secure_url);
                        onClose();
                      }}
                      className={[
                        "relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary ring-1 ring-primary/30"
                          : "border-transparent hover:border-border",
                      ].join(" ")}
                    >
                      <img
                        src={img.secure_url}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

TitleImageGalleryModal.displayName = "TitleImageGalleryModal";

type PublishSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

const ACCESS_TYPES: Array<"public" | "link-only" | "private"> = [
  "public",
  "link-only",
  "private",
];

function PublishSettingsModal({ open, onClose }: PublishSettingsModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [collaboratorDraft, setCollaboratorDraft] = useState("");
  const [topicDraft, setTopicDraft] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const contentId = useCanvasStore((s) => s.contentId);
  const title = useCanvasStore((s) => s.title);
  const titleImage = useCanvasStore((s) => s.titleImage);
  const collaborators = useCanvasStore((s) => s.collaborators);
  const accessType = useCanvasStore((s) => s.accessType);
  const topics = useCanvasStore((s) => s.topics);
  const description = useCanvasStore((s) => s.description);
  const isSaving = useCanvasStore((s) => s.isSaving);
  const setTitle = useCanvasStore((s) => s.setTitle);
  const setTitleImage = useCanvasStore((s) => s.setTitleImage);
  const setCollaborators = useCanvasStore((s) => s.setCollaborators);
  const setAccessType = useCanvasStore((s) => s.setAccessType);
  const setTopics = useCanvasStore((s) => s.setTopics);
  const setDescription = useCanvasStore((s) => s.setDescription);
  const saveContent = useCanvasStore((s) => s.saveContent);
  const forceSave = useCanvasStore((s) => s.forceSave);
  const upload = useUploadStore((s) => s.upload);
  const isUploading = useUploadStore((s) => s.isUploading);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (galleryOpen) setGalleryOpen(false);
        else onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose, galleryOpen]);

  useEffect(() => {
    if (!open) setGalleryOpen(false);
  }, [open]);

  const addCollaborator = () => {
    const next = collaboratorDraft.trim();
    if (!next) return;
    if (collaborators.includes(next)) {
      setCollaboratorDraft("");
      return;
    }
    setCollaborators([...collaborators, next]);
    setCollaboratorDraft("");
  };

  const updateCollaborator = (idx: number, value: string) => {
    const next = [...collaborators];
    next[idx] = value;
    setCollaborators(next);
  };

  const removeCollaborator = (idx: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== idx));
  };

  const addTopic = () => {
    const next = topicDraft.trim();
    if (!next) return;
    setTopics([...topics, next]);
    setTopicDraft("");
  };

  const updateTopic = (idx: number, value: string) => {
    const next = [...topics];
    next[idx] = value;
    setTopics(next);
  };

  const removeTopic = (idx: number) => {
    setTopics(topics.filter((_, i) => i !== idx));
  };

  const handleUploadTitleImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const uploaded = await upload(file);
    if (uploaded?.secure_url) {
      setTitleImage(uploaded.secure_url);
    }
  };

  const handleCopyShare = async () => {
    if (!contentId) return;
    const shareUrl = `${window.location.origin}/view/${contentId}`;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1600);
  };

  const handleDelete = async () => {
    if (!contentId) return;
    const yes = window.confirm(
      "Delete this content permanently? This action cannot be undone.",
    );
    if (!yes) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/content/${contentId}`);
      onClose();
      navigate("/create");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveAndClose = async () => {
    await saveContent();
    onClose();
  };

  const handlePublishNow = async () => {
    if (!contentId) return;
    if (accessType === "private") setAccessType("public");
    await forceSave();
    const id = useCanvasStore.getState().contentId;
    onClose();
    if (id) navigate(`/view/${id}`);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 p-4"
        onMouseDown={onClose}
      >
        <div
          className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-background shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Publish settings</h2>
            <p className="text-xs text-muted-foreground">
              Configure visibility, collaborators, and discoverability.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
            />
          </div>

          <div className="space-y-2">
            <Label>Title image URL</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => setGalleryOpen(true)}
            >
              <Images className="size-3.5" />
              Choose from gallery
            </Button>
            <div className="flex gap-2">
              <Input
                value={titleImage}
                onChange={(e) => setTitleImage(e.target.value)}
                placeholder="https://..."
                className="min-w-0 flex-1"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadTitleImage}
              />
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Upload
              </Button>
            </div>
            {titleImage && (
              <img
                src={titleImage}
                alt="Title preview"
                className="mt-2 h-28 w-full rounded-lg border border-border object-cover"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Access type</Label>
            <div className="flex flex-wrap gap-2">
              {ACCESS_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={accessType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAccessType(type)}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Collaborators (User ID)</Label>
            <div className="flex gap-2">
              <Input
                value={collaboratorDraft}
                onChange={(e) => setCollaboratorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCollaborator();
                  }
                }}
                placeholder="64f2... user id"
              />
              <Button variant="outline" onClick={addCollaborator}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {collaborators.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No collaborators yet.
                </p>
              )}
              {collaborators.map((id, idx) => (
                <div key={`${id}-${idx}`} className="flex gap-2">
                  <Input
                    value={id}
                    onChange={(e) => updateCollaborator(idx, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeCollaborator(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Topics</Label>
            <div className="flex gap-2">
              <Input
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                placeholder="Math, Biology, ..."
              />
              <Button variant="outline" onClick={addTopic}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {topics.length === 0 && (
                <p className="text-xs text-muted-foreground">No topics yet.</p>
              )}
              {topics.map((topic, idx) => (
                <div key={`${topic}-${idx}`} className="flex gap-2">
                  <Input
                    value={topic}
                    onChange={(e) => updateTopic(idx, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeTopic(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a longer description for this content..."
              className="min-h-24"
            />
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 md:col-span-2">
            <p className="text-xs text-muted-foreground">
              Share link:{" "}
              {contentId ? `${window.location.origin}/view/${contentId}` : "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!contentId || deleteLoading}
          >
            {deleteLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCopyShare} disabled={!contentId}>
              {shareCopied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
              {shareCopied ? "Copied" : "Share link"}
            </Button>
            <Button variant="outline" onClick={handleSaveAndClose} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save settings
            </Button>
            <Button
              onClick={handlePublishNow}
              disabled={isSaving || !contentId}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Publish now
            </Button>
          </div>
        </div>
      </div>
      </div>
      {galleryOpen && (
        <TitleImageGalleryModal
          currentUrl={titleImage}
          onPick={(url) => setTitleImage(url)}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </>
  );
}

export default PublishSettingsModal;
