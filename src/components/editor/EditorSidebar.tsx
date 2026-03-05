import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Quote,
  Highlighter,
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
  Search,
  BookOpen,
  Palette,
} from "lucide-react";

interface EditorSidebarProps {
  editor: Editor;
}

type SectionKey =
  | "outline"
  | "search"
  | "text"
  | "image"
  | "video"
  | "other"
  | "special";

const EditorSidebar = ({ editor }: EditorSidebarProps) => {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      outline: false,
      search: false,
      text: true,
      image: false,
      video: false,
      other: false,
      special: false,
    },
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");

  const toggle = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ---- Outline ----
  const headings = useCallback(() => {
    if (!editor) return [];
    const items: { level: number; text: string; pos: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        items.push({ level: node.attrs.level, text: node.textContent, pos });
      }
    });
    return items;
  }, [editor])();

  const jumpTo = (pos: number) => {
    editor.chain().focus().setTextSelection(pos).run();
  };

  // ---- Search & Replace ----
  const handleReplace = () => {
    const { state, dispatch } = editor.view;
    const { tr, doc } = state;
    let replaced = false;
    doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      const idx = node.text.indexOf(searchQuery);
      if (idx !== -1 && searchQuery) {
        tr.replaceWith(
          pos + idx,
          pos + idx + searchQuery.length,
          state.schema.text(replaceQuery),
        );
        replaced = true;
        return false;
      }
    });
    if (replaced) dispatch(tr);
  };

  // ---- Color ----
  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };
  const setHighlight = (color: string) => {
    editor.chain().focus().toggleHighlight({ color }).run();
  };

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

  // ---- Section Header ----
  const SectionHeader = ({
    sectionKey,
    icon: Icon,
    label,
  }: {
    sectionKey: SectionKey;
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={() => toggle(sectionKey)}
      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground transition-colors"
    >
      <span className="flex items-center gap-2">
        <Icon size={13} strokeWidth={2} />
        {label}
      </span>
      {openSections[sectionKey] ? (
        <ChevronDown size={12} />
      ) : (
        <ChevronRight size={12} />
      )}
    </button>
  );

  // ---- Tool Button ----
  const ToolBtn = ({
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
  );

  return (
    <div className="flex h-full w-60 flex-col gap-0.5 overflow-y-auto border-r border-border bg-editor-surface p-3">
      {/* ── OUTLINE ── */}
      <SectionHeader sectionKey="outline" icon={BookOpen} label="Outline" />
      {openSections.outline && (
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
      )}

      {/* ── SEARCH & REPLACE ── */}
      <SectionHeader
        sectionKey="search"
        icon={Search}
        label="Search & Replace"
      />
      {openSections.search && (
        <div className="mb-2 flex flex-col gap-1.5 px-1">
          <input
            type="text"
            placeholder="Find…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
          />
          <input
            type="text"
            placeholder="Replace with…"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={handleReplace}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/70 transition-colors"
          >
            Replace First Match
          </button>
        </div>
      )}

      <div className="my-1 border-t border-border/50" />

      {/* ── TEXT ── */}
      <SectionHeader sectionKey="text" icon={Type} label="Text" />
      {openSections.text && (
        <div className="mb-2 flex flex-col gap-0.5 pl-1">
          {/* Structure */}
          <span className="px-2 pt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Structure
          </span>
          <ToolBtn
            icon={Type}
            label="Normal Text"
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive("paragraph") && !editor.isActive("heading")}
          />
          <ToolBtn
            icon={Heading1}
            label="Heading 1"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
          />
          <ToolBtn
            icon={Heading2}
            label="Heading 2"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
          />
          <ToolBtn
            icon={Heading3}
            label="Heading 3"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive("heading", { level: 3 })}
          />

          {/* Format */}
          <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Format
          </span>
          <ToolBtn
            icon={Bold}
            label="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
          />
          <ToolBtn
            icon={Italic}
            label="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
          />
          <ToolBtn
            icon={Underline}
            label="Underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
          />
          <ToolBtn
            icon={Strikethrough}
            label="Strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
          />
          <ToolBtn
            icon={Quote}
            label="Blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
          />
          <ToolBtn
            icon={Link}
            label="Link"
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                const url = window.prompt("Enter URL");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            active={editor.isActive("link")}
          />

          {/* Alignment */}
          <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Alignment
          </span>
          <div className="flex gap-1 px-2 py-1">
            {[
              { icon: AlignLeft, align: "left" },
              { icon: AlignCenter, align: "center" },
              { icon: AlignRight, align: "right" },
              { icon: AlignJustify, align: "justify" },
            ].map(({ icon: Icon, align }) => (
              <button
                key={align}
                onClick={() => editor.chain().focus().setTextAlign(align).run()}
                title={`Align ${align}`}
                className={`flex-1 flex items-center justify-center rounded py-1.5 transition-colors ${
                  editor.isActive({ textAlign: align })
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <Icon size={13} strokeWidth={1.8} />
              </button>
            ))}
          </div>

          {/* Color */}
          <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Text Color
          </span>
          <div className="flex flex-wrap gap-1.5 px-2 py-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                className="h-5 w-5 rounded-full border-2 border-transparent hover:border-foreground/30 transition-all"
                style={{ background: c }}
              />
            ))}
          </div>

          {/* Highlight */}
          <span className="px-2 pt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Highlight
          </span>
          <div className="flex flex-wrap gap-1.5 px-2 py-1">
            {HIGHLIGHTS.map((c) => (
              <button
                key={c}
                onClick={() => setHighlight(c)}
                title={c}
                className="h-5 w-5 rounded-full border-2 border-transparent hover:border-foreground/30 transition-all"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── IMAGE ── */}
      <SectionHeader sectionKey="image" icon={Images} label="Image" />
      {openSections.image && (
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
      )}

      {/* ── VIDEO ── */}
      <SectionHeader sectionKey="video" icon={VideoIcon} label="Video" />
      {openSections.video && (
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
      )}

      {/* ── OTHER ── */}
      <SectionHeader sectionKey="other" icon={Table} label="Other" />
      {openSections.other && (
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
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive("taskList")}
          />
        </div>
      )}

      {/* ── SPECIAL ── */}
      <SectionHeader
        sectionKey="special"
        icon={LayoutDashboard}
        label="Special"
      />
      {openSections.special && (
        <div className="mb-2 flex flex-col gap-0.5 pl-1">
          <ToolBtn
            icon={LayoutDashboard}
            label="Canvas Board"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertContent({ type: "fabricCanvas" })
                .run()
            }
          />
          <ToolBtn
            icon={HelpCircle}
            label="Q&A Card"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertContent({ type: "questionAnswer" })
                .run()
            }
          />
          <ToolBtn
            icon={Columns}
            label="Layout"
            onClick={() => alert("Layout coming soon")}
          />
        </div>
      )}
    </div>
  );
};

export default EditorSidebar;
