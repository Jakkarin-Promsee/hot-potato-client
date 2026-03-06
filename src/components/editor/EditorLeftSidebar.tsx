import { useState, useCallback, useMemo, memo, useEffect } from "react";
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
  ImagePlus,
  Images,
  Video,
  VideoIcon,
  Table,
  ListTodo,
  LayoutDashboard,
  HelpCircle,
  Columns,
  List,
} from "lucide-react";

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

type CategoryKey = "text" | "image" | "video" | "other" | "special";
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

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES: {
  key: CategoryKey;
  icon: React.ElementType;
  label: string;
}[] = [
  { key: "text", icon: Type, label: "Text" },
  { key: "image", icon: Images, label: "Image" },
  { key: "video", icon: VideoIcon, label: "Video" },
  { key: "other", icon: List, label: "Other" },
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
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon size={14} strokeWidth={1.8} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  ),
);

// ─── Category icon rail button ────────────────────────────────────────────────

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
      className={`relative flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2.5 w-full transition-all duration-150 group ${
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      }`}
    >
      {/* Active indicator bar on the right edge */}
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />
      )}
      <Icon size={16} strokeWidth={isActive ? 2 : 1.8} />
      <span className="text-[9px] font-semibold tracking-wide leading-none">
        {label}
      </span>
    </button>
  ),
);

// ─── Panel: Section label ─────────────────────────────────────────────────────

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block">
    {children}
  </span>
);

// ─── Tool Panels ──────────────────────────────────────────────────────────────

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
        <div className="flex gap-1 px-2 py-1">
          {ALIGN_OPTIONS.map(({ icon: Icon, align }) => (
            <button
              key={align}
              onClick={() => editor.chain().focus().setTextAlign(align).run()}
              title={`Align ${align}`}
              className={`flex-1 flex items-center justify-center rounded py-1.5 transition-colors ${
                active.textAlign === align
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              <Icon size={13} strokeWidth={1.8} />
            </button>
          ))}
        </div>

        <PanelLabel>Text Color</PanelLabel>
        <div className="flex flex-wrap gap-1.5 px-2 py-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className="h-5 w-5 rounded-full transition-all"
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
        <div className="flex flex-wrap gap-1.5 px-2 py-1">
          {HIGHLIGHTS.map((c) => (
            <button
              key={c}
              onClick={() => setHighlight(c)}
              title={c}
              className="h-5 w-5 rounded-full transition-all"
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
      </div>
    );
  },
);

const ImagePanel = memo(({ editor }: { editor: Editor }) => (
  <div className="flex flex-col gap-0.5">
    <PanelLabel>Insert</PanelLabel>
    <ToolBtn
      icon={ImagePlus}
      label="Add by URL"
      onClick={() => {
        const url = window.prompt("Image URL");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }}
    />
    <ToolBtn
      icon={Images}
      label="Gallery"
      onClick={() => alert("Gallery coming soon")}
    />
  </div>
));

const VideoPanel = memo(({ editor: _ }: { editor: Editor }) => (
  <div className="flex flex-col gap-0.5">
    <PanelLabel>Insert</PanelLabel>
    <ToolBtn
      icon={Video}
      label="Embed by URL"
      onClick={() => alert("Video embed coming soon")}
    />
    <ToolBtn
      icon={VideoIcon}
      label="Gallery"
      onClick={() => alert("Gallery coming soon")}
    />
  </div>
));

const OtherPanel = memo(
  ({ editor, taskListActive }: { editor: Editor; taskListActive: boolean }) => (
    <div className="flex flex-col gap-0.5">
      <PanelLabel>Elements</PanelLabel>
      <ToolBtn
        icon={Table}
        label="Table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <ToolBtn
        icon={ListTodo}
        label="Task List"
        active={taskListActive}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
    </div>
  ),
);

const SpecialPanel = memo(({ editor }: { editor: Editor }) => (
  <div className="flex flex-col gap-0.5">
    <PanelLabel>Blocks</PanelLabel>
    <ToolBtn
      icon={LayoutDashboard}
      label="Canvas Board"
      onClick={() =>
        editor.chain().focus().insertContent({ type: "fabricCanvas" }).run()
      }
    />
    <ToolBtn
      icon={HelpCircle}
      label="Q&A Card"
      onClick={() =>
        editor.chain().focus().insertContent({ type: "questionAnswer" }).run()
      }
    />
    <ToolBtn
      icon={Columns}
      label="Layout"
      onClick={() => alert("Layout coming soon")}
    />
  </div>
));

// ─── Main sidebar ─────────────────────────────────────────────────────────────

const EditorLeftSidebar = ({
  editor,
  dynamicUpdate,
}: {
  editor: Editor;
  dynamicUpdate: Boolean;
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("text");
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
      case "image":
        return <ImagePanel editor={editor} />;
      case "video":
        return <VideoPanel editor={editor} />;
      case "other":
        return <OtherPanel editor={editor} taskListActive={active.taskList} />;
      case "special":
        return <SpecialPanel editor={editor} />;
    }
  };

  return (
    <div className="editor-sidebar-left flex w-fit h-full border-r border-border bg-editor-surface">
      {/* ── Icon rail (left column) ── */}
      <div className="flex w-14 flex-col items-center gap-1 border-r border-border/60 px-1.5 py-3">
        {CATEGORIES.map(({ key, icon, label }) => (
          <CategoryBtn
            key={key}
            icon={icon}
            label={label}
            isActive={activeCategory === key}
            onClick={() => setActiveCategory(key)}
          />
        ))}
      </div>

      {/* ── Tool panel (right column) ── */}
      <div className="flex w-64 flex-col overflow-y-auto p-2">
        {/* Panel title */}
        <p className="mb-2 px-1 text-xs font-semibold text-foreground capitalize">
          {activeCategory}
        </p>
        {renderPanel()}
      </div>
    </div>
  );
};

export default EditorLeftSidebar;
