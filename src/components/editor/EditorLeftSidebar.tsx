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
  Link,
  Quote,
  ImagePlus,
  Images,
  Video,
  VideoIcon,
  Table,
  ListTodo,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  HelpCircle,
  Columns,
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

type SectionKey = "text" | "image" | "video" | "other" | "special";
type TextAlign = "left" | "center" | "right" | "justify";

// All reactive isActive reads for the left sidebar
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

// ─── Primitives ───────────────────────────────────────────────────────────────

const SectionHeader = memo(
  ({
    sectionKey,
    icon: Icon,
    label,
    isOpen,
    onToggle,
  }: {
    sectionKey: SectionKey;
    icon: React.ElementType;
    label: string;
    isOpen: boolean;
    onToggle: (key: SectionKey) => void;
  }) => (
    <button
      onClick={() => onToggle(sectionKey)}
      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground transition-colors"
    >
      <span className="flex items-center gap-2">
        <Icon size={13} strokeWidth={2} />
        {label}
      </span>
      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
  ),
);

const ToolBtn = memo(
  ({
    icon: Icon,
    label,
    onClick,
    active = false,
    colorDot,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
    colorDot?: string;
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
      {colorDot && (
        <span
          className="h-3 w-3 rounded-full border border-border"
          style={{ background: colorDot }}
        />
      )}
    </button>
  ),
);

// ─── Section panels ───────────────────────────────────────────────────────────

// ✅ Headings derived from doc via useMemo — no isActive reads, always correct
const OutlinePanel = memo(({ editor }: { editor: Editor }) => {
  const headings = useMemo(() => {
    const items: { level: number; text: string; pos: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        items.push({ level: node.attrs.level, text: node.textContent, pos });
      }
    });
    return items;
  }, [editor.state.doc]);

  const jumpTo = useCallback(
    (pos: number) => editor.chain().focus().setTextSelection(pos).run(),
    [editor],
  );

  return (
    <div className="mb-2 flex flex-col gap-0.5 pl-1">
      {headings.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground/50">
          No headings yet
        </p>
      ) : (
        headings.map((h, i) => (
          <button
            key={i}
            onClick={() => jumpTo(h.pos)}
            className="truncate rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            style={{ paddingLeft: `${(h.level - 1) * 10 + 8}px` }}
          >
            {h.text || `Heading ${h.level}`}
          </button>
        ))
      )}
    </div>
  );
});

// ✅ active states from props — memo diffs plain booleans/strings correctly
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
      <div className="mb-2 flex flex-col gap-0.5 pl-1">
        <span className="px-2 pt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Structure
        </span>
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

        <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Alignment
        </span>
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

        <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Text Color
        </span>
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

        <span className="px-2 pt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Highlight
        </span>
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

// ✅ No isActive reads — pure command buttons, memo always safe
const ImagePanel = memo(({ editor }: { editor: Editor }) => (
  <div className="mb-2 flex flex-col gap-0.5 pl-1">
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
  <div className="mb-2 flex flex-col gap-0.5 pl-1">
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

// ✅ taskList active state comes from props
const OtherPanel = memo(
  ({ editor, taskListActive }: { editor: Editor; taskListActive: boolean }) => (
    <div className="mb-2 flex flex-col gap-0.5 pl-1">
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

// ✅ Pure command buttons — no isActive reads
const SpecialPanel = memo(({ editor }: { editor: Editor }) => (
  <div className="mb-2 flex flex-col gap-0.5 pl-1">
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

// ─── Main sidebar — single transaction listener, all reactive reads here ──────

const EditorLeftSidebar = ({
  editor,
  dynamicUpdate,
}: {
  editor: Editor;
  dynamicUpdate: Boolean;
}) => {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      text: true,
      image: false,
      video: false,
      other: false,
      special: false,
    },
  );

  const [active, setActive] = useState<LeftActiveFormats>(DEFAULT_ACTIVE);

  // Single listener — all isActive reads in one place
  useEffect(() => {
    if (!dynamicUpdate) return; // ← skip attaching listener entirely

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

  const toggle = useCallback(
    (key: SectionKey) =>
      setOpenSections((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  return (
    <div className="editor-sidebar-left flex h-full w-60 flex-col gap-0.5 overflow-y-auto border-r border-border bg-editor-surface p-3">
      <SectionHeader
        sectionKey="text"
        icon={Type}
        label="Text"
        isOpen={openSections.text}
        onToggle={toggle}
      />
      {openSections.text && <TextPanel editor={editor} active={active} />}

      <SectionHeader
        sectionKey="image"
        icon={Images}
        label="Image"
        isOpen={openSections.image}
        onToggle={toggle}
      />
      {openSections.image && <ImagePanel editor={editor} />}

      <SectionHeader
        sectionKey="video"
        icon={VideoIcon}
        label="Video"
        isOpen={openSections.video}
        onToggle={toggle}
      />
      {openSections.video && <VideoPanel editor={editor} />}

      <SectionHeader
        sectionKey="other"
        icon={Table}
        label="Other"
        isOpen={openSections.other}
        onToggle={toggle}
      />
      {openSections.other && (
        <OtherPanel editor={editor} taskListActive={active.taskList} />
      )}

      <SectionHeader
        sectionKey="special"
        icon={LayoutDashboard}
        label="Special"
        isOpen={openSections.special}
        onToggle={toggle}
      />
      {openSections.special && <SpecialPanel editor={editor} />}
    </div>
  );
};

export default EditorLeftSidebar;
