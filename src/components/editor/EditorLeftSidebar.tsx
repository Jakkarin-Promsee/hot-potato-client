import { useState, useCallback, useEffect, useRef, memo } from "react";
import { Editor } from "@tiptap/react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Upload,
  Link2,
  Images,
  Table,
  ListTodo,
  LayoutDashboard,
  List,
  ListOrdered,
  Minus,
  X,
  ExternalLink,
  Sigma,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useUploadStore } from "@/stores/cloudinary.store";
import { useCategoryStore } from "@/stores/category.store";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import {
  emitFormulaToolbarAction,
  subscribeActiveFormulaBlock,
} from "./FormulaBlock/formulaToolbarBus";
import { createFormulaRow } from "./FormulaBlock/formulaReducer";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#000000",
];
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];

const ALIGN_OPTIONS = [
  { icon: AlignLeft, align: "left" },
  { icon: AlignCenter, align: "center" },
  { icon: AlignRight, align: "right" },
  { icon: AlignJustify, align: "justify" },
] as const;

type CategoryKey = "text" | "media" | "formular" | "special";
type TextAlign = "left" | "center" | "right" | "justify";

interface LeftActiveFormats {
  paragraph: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  blockquote: boolean;
  taskList: boolean;
  textAlign: TextAlign;
  textColor: string;
  highlightColor: string;
}

const DEFAULT_ACTIVE: LeftActiveFormats = {
  paragraph: false,
  h1: false,
  h2: false,
  h3: false,
  blockquote: false,
  taskList: false,
  textAlign: "left",
  textColor: "",
  highlightColor: "",
};

const CATEGORIES: {
  key: CategoryKey;
  icon: React.ElementType;
  label: string;
}[] = [
  { key: "text", icon: Type, label: "Text" },
  { key: "media", icon: Images, label: "Media" },
  { key: "formular", icon: Sigma, label: "Formula" },
  { key: "special", icon: LayoutDashboard, label: "Special" },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

const ToolBtn = memo(
  ({
    icon: Icon,
    label,
    onClick,
    active = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  ),
);

const QuickInsertBtn = memo(
  ({
    icon: Icon,
    label,
    onClick,
    active = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center gap-2 rounded-lg border px-2.5 py-2.5 text-xs font-semibold transition-colors ${
        active
          ? "border-border bg-accent/70 text-foreground"
          : "border-border/80 bg-background/60 text-muted-foreground hover:border-border hover:bg-accent/45 hover:text-foreground"
      }`}
    >
      <Icon size={14} strokeWidth={1.9} />
      <span>{label}</span>
    </button>
  ),
);

const SpecialBlockBtn = memo(
  ({
    label,
    preview,
    onClick,
  }: {
    label: string;
    preview: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className="w-full rounded-lg border-2 border-border/90 bg-background/25 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-accent/20"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight">
          {label}
        </p>
        <div className="mt-2 rounded-md border border-border/50 bg-background/20 px-2 py-1.5">
          {preview}
        </div>
      </div>
    </button>
  ),
);

const CategoryBtn = memo(
  ({
    icon: Icon,
    label,
    isActive,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-3 w-full transition-all duration-150 ${
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      }`}
    >
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-primary" />
      )}
      <Icon size={19} strokeWidth={isActive ? 2 : 1.8} />
      <span className="text-[10px] font-semibold tracking-wide leading-none">
        {label}
      </span>
    </button>
  ),
);

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 block">
    {children}
  </span>
);

const FormulaGroup = memo(
  ({
    title,
    defaultOpen = true,
    children,
  }: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
  }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="rounded-md border border-border/70 bg-background/50">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-2.5 py-2 text-left text-[11px] font-semibold text-foreground"
        >
          <span>{title}</span>
          {open ? (
            <ChevronDown size={13} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={13} className="text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">{children}</div>
        )}
      </div>
    );
  },
);

const FormulaBtn = memo(
  ({
    label,
    onClick,
    title,
  }: {
    label: string;
    onClick: () => void;
    title?: string;
  }) => (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className="rounded-md border border-border/70 bg-background/60 px-1.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent/45 hover:text-foreground"
    >
      {label}
    </button>
  ),
);

// ─── Gallery modal ────────────────────────────────────────────────────────────

const GalleryModal = memo(({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

    {/* Modal */}
    <div className="relative z-10 w-[90vw] max-w-5xl h-[85vh] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col">
      {/* Modal header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Image Vault
        </span>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Vault page embedded */}
      <div className="flex-1 overflow-hidden">
        <CloudinaryUpload />
      </div>
    </div>
  </div>
));

// ─── Media Panel ─────────────────────────────────────────────────────────────

const MediaPanel = memo(({ editor }: { editor: Editor }) => {
  const {
    history,
    fetchHistory,
    isFetching,
    upload,
    uploadFromUrl,
    isUploading,
    progress,
  } = useUploadStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [urlInput, setUrlInput] = useState("");
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
    fetchCategories();
  }, []);

  // activeCatId === null means "All" → upload with no category (null)
  // a real id means upload into that category
  const uploadCategoryId = activeCatId;

  const filtered = activeCatId
    ? history.filter((img) => img.category_id === activeCatId)
    : history;

  const insertImage = useCallback(
    (src: string) => {
      editor.chain().focus().setImage({ src }).run();
      editor
        .chain()
        .focus()
        .updateAttributes("image", { "data-align": "center" })
        .run();
    },
    [editor],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file, uploadCategoryId);
    e.target.value = "";
  };

  const handleUrlInsert = () => {
    if (!urlInput.trim()) return;
    uploadFromUrl(urlInput.trim(), uploadCategoryId);
    setUrlInput("");
    setShowUrlBox(false);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* ── Upload buttons ─────────────────────────────────────────────── */}
      <PanelLabel>Upload</PanelLabel>

      <div className="px-2 flex flex-col gap-2">
        {/* Upload from device */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 px-3 py-3 text-sm font-medium text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={15} strokeWidth={2} />
          {isUploading ? `Uploading… ${progress}%` : "Upload from device"}
        </button>

        {/* Upload from URL */}
        <button
          onClick={() => setShowUrlBox((v) => !v)}
          className={`flex items-center justify-center gap-2 w-full rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
            showUrlBox
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background hover:bg-accent hover:border-border text-foreground"
          }`}
        >
          <Link2 size={15} strokeWidth={2} />
          Upload from URL
        </button>

        {showUrlBox && (
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUrlInsert();
                if (e.key === "Escape") setShowUrlBox(false);
              }}
              placeholder="https://…"
              className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              onClick={handleUrlInsert}
              disabled={!urlInput.trim() || isUploading}
              className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-40 transition-colors hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        )}

        {/* Upload progress bar */}
        {isUploading && (
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Go to gallery button ──────────────────────────────────────── */}
      <div className="px-2 pt-1">
        <button
          onClick={() => setShowGallery(true)}
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-background hover:bg-accent px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink size={12} strokeWidth={1.8} />
          Manage gallery
        </button>
      </div>

      {/* ── Category filter pills ─────────────────────────────────────── */}
      <PanelLabel>
        Filter
        {activeCatId
          ? " — uploading to this group"
          : " — uploading uncategorized"}
      </PanelLabel>
      <div className="px-2 flex flex-wrap gap-1 pb-1">
        <button
          onClick={() => setActiveCatId(null)}
          className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
            activeCatId === null
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-muted-foreground"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() =>
              setActiveCatId(activeCatId === cat._id ? null : cat._id)
            }
            className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors truncate max-w-20 ${
              activeCatId === cat._id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* ── Image grid ───────────────────────────────────────────────── */}
      <PanelLabel>Vault ({filtered.length})</PanelLabel>

      {isFetching ? (
        <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-md bg-accent animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-3 py-6 text-center text-[11px] text-muted-foreground/40">
          No images yet
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
          {filtered.map((img) => (
            <button
              key={img.public_id}
              onClick={() => insertImage(img.secure_url)}
              title={img.original_filename}
              className="group relative aspect-square overflow-hidden rounded-md border border-border hover:border-primary transition-all"
            >
              <img
                src={img.secure_url}
                alt={img.original_filename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-[10px] font-medium">
                  Insert
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Gallery modal */}
      {showGallery && (
        <GalleryModal
          onClose={() => {
            setShowGallery(false);
            fetchHistory();
          }}
        />
      )}
    </div>
  );
});

// ─── Text Panel ───────────────────────────────────────────────────────────────

const TextPanel = memo(
  ({ editor, active }: { editor: Editor; active: LeftActiveFormats }) => {
    const setColor = useCallback(
      (c: string) => editor.chain().focus().setColor(c).run(),
      [editor],
    );
    const setHighlight = useCallback(
      (c: string) => editor.chain().focus().toggleHighlight({ color: c }).run(),
      [editor],
    );

    return (
      <div className="flex flex-col gap-0.5">
        <PanelLabel>Structure</PanelLabel>
        <ToolBtn
          icon={Type}
          label="Normal Text"
          active={active.paragraph}
          onClick={() => editor.chain().focus().setParagraph().run()}
        />
        <ToolBtn
          icon={Heading1}
          label="Heading 1"
          active={active.h1}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />
        <ToolBtn
          icon={Heading2}
          label="Heading 2"
          active={active.h2}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolBtn
          icon={Heading3}
          label="Heading 3"
          active={active.h3}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <ToolBtn
          icon={Quote}
          label="Blockquote"
          active={active.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />

        <PanelLabel>Alignment</PanelLabel>
        <div className="flex gap-1.5 px-2 py-1">
          {ALIGN_OPTIONS.map(({ icon: Icon, align }) => (
            <button
              key={align}
              onClick={() => editor.chain().focus().setTextAlign(align).run()}
              title={`Align ${align}`}
              className={`flex-1 flex items-center justify-center rounded py-2 transition-colors ${
                active.textAlign === align
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
            </button>
          ))}
        </div>

        <PanelLabel>Text Color</PanelLabel>
        <div className="flex flex-wrap gap-2 px-2 py-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className="h-6 w-6 rounded-full transition-all"
              style={{
                background: c,
                outline:
                  active.textColor === c
                    ? "2px solid currentColor"
                    : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>

        <PanelLabel>Highlight</PanelLabel>
        <div className="flex flex-wrap gap-2 px-2 py-1">
          {HIGHLIGHTS.map((c) => (
            <button
              key={c}
              onClick={() => setHighlight(c)}
              title={c}
              className="h-6 w-6 rounded-full transition-all"
              style={{
                background: c,
                outline:
                  active.highlightColor === c
                    ? "2px solid currentColor"
                    : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>

        <div className="mt-3">
          <PanelLabel>Quick Insert</PanelLabel>
          <div className="grid grid-cols-1 gap-1.5 px-2 py-1">
            <QuickInsertBtn
              icon={Minus}
              label="Add line"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            />
            <QuickInsertBtn
              icon={List}
              label="Add bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <QuickInsertBtn
              icon={ListOrdered}
              label="Add numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
          </div>

          <PanelLabel>Other Insert</PanelLabel>
          <div className="grid grid-cols-1 gap-1.5 px-2 py-0.5">
            <QuickInsertBtn
              icon={Table}
              label="Add table"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            />
            <QuickInsertBtn
              icon={ListTodo}
              label="Add checklist"
              active={active.taskList}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            />
            <QuickInsertBtn
              icon={LayoutDashboard}
              label="Add canvas board"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({ type: "fabricCanvas" })
                  .run()
              }
            />
          </div>
        </div>
      </div>
    );
  },
);

const FormularPanel = memo(({ editor }: { editor: Editor }) => {
  const [activeFormulaBlockId, setActiveFormulaBlockId] = useState<
    string | null
  >(null);

  useEffect(() => {
    return subscribeActiveFormulaBlock((blockId) => {
      setActiveFormulaBlockId(blockId);
    });
  }, []);

  const insertFormulaBlockWithId = useCallback(() => {
    const blockId = crypto.randomUUID();
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "formulaBlock",
          attrs: {
            id: blockId,
            formula: createFormulaRow(),
            latex: "",
          },
        },
        { type: "paragraph" },
      ])
      .run();
    return blockId;
  }, [editor]);

  const sendAction = useCallback(
    (action: Parameters<typeof emitFormulaToolbarAction>[0]) => {
      const targetBlockId = activeFormulaBlockId ?? insertFormulaBlockWithId();
      emitFormulaToolbarAction(action, targetBlockId);
    },
    [activeFormulaBlockId, insertFormulaBlockWithId],
  );

  return (
    <div className="flex flex-col gap-2 px-1 pb-1">
      <div className="px-1 pb-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().insertFormulaBlock().run()}
          className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          Add Formula Block
        </button>
      </div>

      <FormulaGroup title="Powers & indices" defaultOpen>
        <FormulaBtn
          label="x²"
          onClick={() =>
            sendAction({ type: "insert-power", position: "top-right" })
          }
        />
        <FormulaBtn
          label="x₂"
          onClick={() =>
            sendAction({ type: "insert-power", position: "bottom-right" })
          }
        />
        <FormulaBtn
          label="²x"
          onClick={() =>
            sendAction({ type: "insert-power", position: "top-left" })
          }
        />
        <FormulaBtn
          label="₂x"
          onClick={() =>
            sendAction({ type: "insert-power", position: "bottom-left" })
          }
        />
      </FormulaGroup>

      <FormulaGroup title="Structure" defaultOpen>
        <FormulaBtn
          label="√"
          onClick={() => sendAction({ type: "insert-structure", kind: "sqrt" })}
        />
        <FormulaBtn
          label="ⁿ√"
          onClick={() =>
            sendAction({ type: "insert-structure", kind: "nth-root" })
          }
        />
        <FormulaBtn
          label="a/b"
          onClick={() =>
            sendAction({ type: "insert-structure", kind: "fraction" })
          }
        />
        <FormulaBtn
          label="|x|"
          onClick={() => sendAction({ type: "insert-structure", kind: "abs" })}
        />
        <FormulaBtn
          label="( )"
          onClick={() =>
            sendAction({ type: "insert-structure", kind: "paren" })
          }
        />
        <FormulaBtn
          label="[ ]"
          onClick={() =>
            sendAction({ type: "insert-structure", kind: "bracket" })
          }
        />
        <FormulaBtn
          label="Σ"
          onClick={() =>
            sendAction({ type: "insert-structure", kind: "summation" })
          }
        />
      </FormulaGroup>

      <FormulaGroup title="Trig" defaultOpen={false}>
        {["sin", "cos", "tan", "cot", "sec", "csc"].map((fn) => (
          <FormulaBtn
            key={fn}
            label={fn}
            onClick={() =>
              sendAction({
                type: "insert-trig",
                name: fn as "sin" | "cos" | "tan" | "cot" | "sec" | "csc",
              })
            }
          />
        ))}
        {["sin", "cos", "tan"].map((fn) => (
          <FormulaBtn
            key={`${fn}-1`}
            label={`${fn}⁻¹`}
            onClick={() =>
              sendAction({
                type: "insert-invtrig",
                name: fn as "sin" | "cos" | "tan",
              })
            }
          />
        ))}
      </FormulaGroup>

      <FormulaGroup title="Logarithms" defaultOpen={false}>
        <FormulaBtn
          label="log"
          onClick={() => sendAction({ type: "insert-log" })}
        />
        <FormulaBtn
          label="ln"
          onClick={() => sendAction({ type: "insert-ln" })}
        />
      </FormulaGroup>

      <FormulaGroup title="Constants" defaultOpen={false}>
        {["π", "e", "∞", "φ", "i"].map((s) => (
          <FormulaBtn
            key={s}
            label={s}
            onClick={() => sendAction({ type: "insert-symbol", value: s })}
          />
        ))}
      </FormulaGroup>

      <FormulaGroup title="Operators & relations" defaultOpen={false}>
        {[
          "+",
          "−",
          "×",
          "÷",
          "±",
          "=",
          "≠",
          "<",
          ">",
          "≤",
          "≥",
          "≈",
          "∝",
          "→",
          "⇒",
          "⟺",
        ].map((s) => (
          <FormulaBtn
            key={s}
            label={s}
            onClick={() => sendAction({ type: "insert-symbol", value: s })}
          />
        ))}
      </FormulaGroup>

      <FormulaGroup title="Physics symbols" defaultOpen={false}>
        <FormulaBtn
          label="∫"
          onClick={() =>
            sendAction({ type: "insert-structure", kind: "integral" })
          }
        />
        <FormulaBtn
          label="∮"
          onClick={() =>
            sendAction({ type: "insert-structure", kind: "line-integral" })
          }
        />
        {["Δ", "∂", "∇", "ℏ", "F_g", "v_x", "a_y"].map((s) => (
          <FormulaBtn
            key={s}
            label={s}
            onClick={() => sendAction({ type: "insert-symbol", value: s })}
          />
        ))}
      </FormulaGroup>

      <FormulaGroup title="Wrap selected" defaultOpen={false}>
        <FormulaBtn
          label="/"
          title="Wrap selected node in fraction"
          onClick={() => sendAction({ type: "wrap-fraction" })}
        />
        <FormulaBtn
          label="^"
          title="Wrap selected node in power"
          onClick={() => sendAction({ type: "wrap-power-top-right" })}
        />
        <FormulaBtn
          label="(x)"
          title="Wrap selected node in parentheses"
          onClick={() => sendAction({ type: "wrap-paren" })}
        />
      </FormulaGroup>
    </div>
  );
});

const SpecialPanel = memo(({ editor }: { editor: Editor }) => (
  <div className="flex flex-col gap-1.5">
    <PanelLabel>Choose Block Type</PanelLabel>
    <div className="grid grid-cols-1 gap-3 px-2 py-0.5">
      <SpecialBlockBtn
        label="Multiple Choice Question"
        preview={
          <div className="space-y-1.5 text-[11px]">
            <p className="line-clamp-1 font-medium text-muted-foreground">
              The force makes speed...
            </p>
            <div className="rounded border border-border bg-background/80 px-2 py-1 text-muted-foreground">
              ○ increase
            </div>
            <div className="rounded border border-border bg-background/80 px-2 py-1 text-muted-foreground">
              ○ decrease
            </div>
          </div>
        }
        onClick={() => editor.chain().focus().insertQuestionChoice().run()}
      />
      <SpecialBlockBtn
        label="Written Reflection"
        preview={
          <div className="space-y-1.5 text-[11px]">
            <p className="line-clamp-1 font-medium text-muted-foreground">
              Explain why this happens:
            </p>
            <div className="rounded border border-border bg-background/80 px-2 py-1 text-muted-foreground">
              Your answer...
            </div>
          </div>
        }
        onClick={() => editor.chain().focus().insertQuestionWrite().run()}
      />
      <SpecialBlockBtn
        label="Fill in the Blank (Choice)"
        preview={
          <div className="space-y-1.5 text-[11px] text-muted-foreground">
            <p className="line-clamp-1">
              Force and motion are{" "}
              <span className="inline-block h-[1.1em] w-14 rounded-sm border-b-2 border-border/80 align-middle" />
            </p>
            <div className="flex flex-wrap gap-1">
              <span className="rounded border border-border px-1.5 py-0.5">
                related
              </span>
              <span className="rounded border border-border px-1.5 py-0.5">
                random
              </span>
            </div>
          </div>
        }
        onClick={() => editor.chain().focus().insertQuestionBlankChoice().run()}
      />
      <SpecialBlockBtn
        label="Fill in the Blank (Write)"
        preview={
          <div className="space-y-1.5 text-[11px] text-muted-foreground">
            <p className="line-clamp-1">
              The formula is{" "}
              <span className="inline-block h-[1.1em] w-14 rounded-sm border-b-2 border-border/80 align-middle" />
            </p>
            <div className="rounded border border-border bg-background/80 px-2 py-1">
              Type missing word...
            </div>
          </div>
        }
        onClick={() => editor.chain().focus().insertQuestionBlankWrite().run()}
      />
      <SpecialBlockBtn
        label="Ask AI Helper"
        preview={
          <div className="space-y-1.5 text-[11px]">
            <p className="line-clamp-1 font-medium text-muted-foreground">
              Ask for a hint:
            </p>
            <div className="rounded border border-border bg-background/80 px-2 py-1 text-muted-foreground">
              Why does this answer work?
            </div>
          </div>
        }
        onClick={() => editor.chain().focus().insertQuestionAgent().run()}
      />
    </div>
  </div>
));

// ─── Main sidebar ─────────────────────────────────────────────────────────────

const EditorLeftSidebar = ({
  editor,
  dynamicUpdate,
  activeCategory,
  onCategoryChange,
}: {
  editor: Editor;
  dynamicUpdate: Boolean;
  activeCategory: CategoryKey;
  onCategoryChange: (key: CategoryKey) => void;
}) => {
  const [active, setActive] = useState<LeftActiveFormats>(DEFAULT_ACTIVE);

  useEffect(() => {
    if (!dynamicUpdate) return;
    const update = () => {
      setActive({
        textColor: editor.getAttributes("textStyle").color ?? "#000000",
        highlightColor: editor.getAttributes("highlight").color ?? "",
        paragraph: editor.isActive("paragraph") && !editor.isActive("heading"),
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        blockquote: editor.isActive("blockquote"),
        taskList: editor.isActive("taskList"),
        textAlign:
          (editor.getAttributes("paragraph").textAlign as TextAlign) ?? "left",
      });
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, dynamicUpdate]);

  const renderPanel = () => {
    switch (activeCategory) {
      case "text":
        return <TextPanel editor={editor} active={active} />;
      case "media":
        return <MediaPanel editor={editor} />;
      case "formular":
        return <FormularPanel editor={editor} />;
      case "special":
        return <SpecialPanel editor={editor} />;
    }
  };

  return (
    <div className="editor-sidebar-left flex h-full border-r border-border bg-editor-surface">
      {/* Icon rail */}
      <div className="flex w-20 flex-col items-center gap-1.5 border-r border-border/60 px-2 py-3">
        {CATEGORIES.map(({ key, icon, label }) => (
          <CategoryBtn
            key={key}
            icon={icon}
            label={label}
            isActive={activeCategory === key}
            onClick={() => onCategoryChange(key)}
          />
        ))}
      </div>

      {/* Tool panel */}
      <div className="flex w-120 flex-col overflow-y-auto p-2.5">
        <p className="mb-2 px-1 text-sm font-semibold text-foreground capitalize">
          {activeCategory}
        </p>
        {renderPanel()}
      </div>
    </div>
  );
};

export default EditorLeftSidebar;
