import { useEffect, useState, useCallback, memo, useMemo } from "react";
import { Editor } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Trash2,
  FileText,
  Download,
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  Edit,
  Text,
  Link2,
  Link,
} from "lucide-react";

import {
  searchHighlightKey,
  findMatches,
  type SearchMatch,
} from "../extensions/searchHighlight";

// ─── Constants outside component ─────────────────────────────────────────────

// --- Constants outside component (never recreated) ---------------------------
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
  { Icon: AlignLeft, align: "left" },
  { Icon: AlignCenter, align: "center" },
  { Icon: AlignRight, align: "right" },
  { Icon: AlignJustify, align: "justify" },
] as const;

const IMAGE_ALIGNS = [
  { Icon: AlignLeft, align: "left" },
  { Icon: AlignCenter, align: "center" },
  { Icon: AlignRight, align: "right" },
] as const;

const TABLE_ACTIONS = [
  { label: "+ Row After", method: "addRowAfter" },
  { label: "− Row", method: "deleteRow" },
  { label: "+ Col After", method: "addColumnAfter" },
  { label: "− Col", method: "deleteColumn" },
  { label: "Merge Cells", method: "mergeCells" },
  { label: "Split Cell", method: "splitCell" },
] as const;

const CODE_LANGS = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "html",
  "css",
  "json",
  "bash",
  "sql",
] as const;

const MODE_LABELS = {
  document: "Document",
  text: "Text Selected",
  image: "Image",
  table: "Table",
  link: "Link",
  heading: "Heading",
  codeBlock: "Code Block",
} as const;

type PanelMode = keyof typeof MODE_LABELS;

// Toggle tools
type SectionKey = "document" | "outline" | "search" | "text";

// --- Sub-components memoized so they only re-render when their props change --
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
      className="flex w-full items-center justify-between rounded-md px-0 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground transition-colors"
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

// ─── Shared primitives ────────────────────────────────────────────────────────

const Section = memo(
  ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {title}
      </span>
      {children}
    </div>
  ),
);

const Row = memo(
  ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  ),
);

const IconBtn = memo(
  ({
    icon: Icon,
    onClick,
    active = false,
    title,
  }: {
    icon: React.ElementType;
    onClick: () => void;
    active?: boolean;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50"
      }`}
    >
      <Icon size={13} strokeWidth={1.8} />
    </button>
  ),
);

// ─── Panel components (memoized, defined at module level) ─────────────────────

const DocumentPanel = memo(({ editor }: { editor: Editor }) => {
  const { wordCount, readTime } = useMemo(() => {
    const words = editor.state.doc.textContent
      .split(/\s+/)
      .filter(Boolean).length;
    return { wordCount: words, readTime: Math.max(1, Math.ceil(words / 265)) };
  }, [editor.state.doc]); // recomputes only when doc content changes

  return (
    <>
      <Section title="Document">
        <Row label="Words">
          <span className="text-xs font-medium">{wordCount}</span>
        </Row>
        <Row label="Read time">
          <span className="text-xs font-medium">{readTime} min</span>
        </Row>
      </Section>
    </>
  );
});

const TextPanel = memo(({ editor }: { editor: Editor }) => {
  const setColor = useCallback(
    (color: string) => editor.chain().focus().setColor(color).run(),
    [editor],
  );
  const setHighlight = useCallback(
    (color: string) => editor.chain().focus().toggleHighlight({ color }).run(),
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
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph") && !editor.isActive("heading")}
      />
      <ToolBtn
        icon={Heading1}
        label="Heading 1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
      />
      <ToolBtn
        icon={Heading2}
        label="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
      />
      <ToolBtn
        icon={Heading3}
        label="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
      />

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
            return;
          }
          const url = window.prompt("Enter URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        active={editor.isActive("link")}
      />

      <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
        Alignment
      </span>
      <div className="flex gap-1 px-2 py-1">
        {ALIGN_OPTIONS.map(({ Icon: Icon, align }) => (
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
  );
});

const TextTogglePanel = memo(({ editor }: { editor: Editor }) => {
  const [openSections, setOpenSections] = useState({
    document: false,
    outline: false,
    search: false,
    text: true,
  });

  // Stable toggle — never recreated
  const toggle = useCallback(
    (key: SectionKey) =>
      setOpenSections((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  return (
    <>
      <SectionHeader
        sectionKey="search"
        icon={Search}
        label="Search & Replace"
        isOpen={openSections.search}
        onToggle={toggle}
      />
      {openSections.search && (
        <div className="px-2">
          <SearchPanel editor={editor} />
        </div>
      )}

      <SectionHeader
        sectionKey="text"
        icon={Text}
        label="text"
        isOpen={openSections.text}
        onToggle={toggle}
      />
      {openSections.text && <TextPanel editor={editor} />}
    </>
  );
});

const LinkPanel = memo(
  ({
    editor,
    linkUrl,
    linkNewTab,
    setLinkUrl,
    setLinkNewTab,
  }: {
    editor: Editor;
    linkUrl: string;
    linkNewTab: boolean;
    setLinkUrl: (v: string) => void;
    setLinkNewTab: (v: boolean) => void;
  }) => {
    const applyLink = useCallback(
      (url: string, newTab: boolean) => {
        editor
          .chain()
          .focus()
          .setLink({ href: url, target: newTab ? "_blank" : "" })
          .run();
      },
      [editor],
    );

    const toggleNewTab = useCallback(() => {
      const next = !linkNewTab;
      setLinkNewTab(next);
      applyLink(linkUrl, next);
    }, [linkNewTab, linkUrl, applyLink, setLinkNewTab]);

    return (
      <Section title="Link">
        <div className="mb-2">
          <label className="mb-1 block text-xs text-muted-foreground">
            URL
          </label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onBlur={() => applyLink(linkUrl, linkNewTab)}
            placeholder="https://..."
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <Row label="New tab">
          <button
            onClick={toggleNewTab}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              linkNewTab ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                linkNewTab ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </Row>
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={12} /> Remove Link
        </button>
      </Section>
    );
  },
);

const ImagePanel = memo(({ editor }: { editor: Editor }) => {
  const attrs = editor.getAttributes("image");
  return (
    <Section title="Image">
      <div className="mb-2">
        <label className="mb-1 block text-xs text-muted-foreground">
          Alt Text
        </label>
        <input
          defaultValue={attrs.alt ?? ""}
          placeholder="Describe the image…"
          className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
          onChange={(e) =>
            editor
              .chain()
              .focus()
              .updateAttributes("image", { alt: e.target.value })
              .run()
          }
        />
      </div>
      <Row label="Align">
        <div className="flex gap-0.5">
          {IMAGE_ALIGNS.map(({ Icon, align }) => (
            <IconBtn
              key={align}
              icon={Icon}
              title={align}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("image", { "data-align": align })
                  .run()
              }
            />
          ))}
        </div>
      </Row>
    </Section>
  );
});

const TablePanel = memo(({ editor }: { editor: Editor }) => (
  <Section title="Table">
    <div className="grid grid-cols-2 gap-1.5">
      {TABLE_ACTIONS.map(({ label, method }) => (
        <button
          key={label}
          onClick={() => (editor.chain().focus() as any)[method]().run()}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
    <button
      onClick={() => editor.chain().focus().deleteTable().run()}
      className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
    >
      <Trash2 size={12} /> Delete Table
    </button>
  </Section>
));

const CodePanel = memo(({ editor }: { editor: Editor }) => {
  const current = editor.getAttributes("codeBlock").language ?? "plaintext";
  return (
    <Section title="Code Block">
      <label className="mb-1 block text-xs text-muted-foreground">
        Language
      </label>
      <select
        value={current}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .updateAttributes("codeBlock", { language: e.target.value })
            .run()
        }
        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
      >
        {CODE_LANGS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </Section>
  );
});

const SearchPanel = memo(({ editor }: { editor: Editor }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replaceOnceStage, setReplaceOnceStage] = useState<"idle" | "preview">(
    "idle",
  );
  const [replaceAllStage, setReplaceAllStage] = useState<"idle" | "preview">(
    "idle",
  );

  const isSearchActive = matches.length > 0 || searchQuery !== "";

  // Push new state into the plugin
  const pushPluginState = useCallback(
    (term: string, index: number, newMatches: SearchMatch[]) => {
      const { state, dispatch } = editor.view;
      const tr = state.tr.setMeta(searchHighlightKey, {
        searchTerm: term,
        currentIndex: index,
        matches: newMatches,
      });
      dispatch(tr);
    },
    [editor],
  );

  const scrollToMatch = useCallback(
    (index: number, newMatches: SearchMatch[]) => {
      const match = newMatches[index];
      if (!match) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from: match.from, to: match.to })
        .run();
    },
    [editor],
  );

  const handleSearch = useCallback(() => {
    if (!searchQuery) return;

    // If already active, clear
    if (matches.length > 0) {
      setMatches([]);
      setCurrentIndex(0);
      setReplaceOnceStage("idle");
      setReplaceAllStage("idle");
      pushPluginState("", 0, []);
      return;
    }

    const found = findMatches(editor.state.doc, searchQuery);
    if (!found.length) {
      setMatches([]);
      pushPluginState(searchQuery, 0, []);
      return;
    }

    // Find closest match to cursor
    const cursorPos = editor.state.selection.from;
    const closest = found.reduce(
      (best, r, i) =>
        Math.abs(r.from - cursorPos) < Math.abs(found[best]!.from - cursorPos)
          ? i
          : best,
      0,
    );

    setMatches(found);
    setCurrentIndex(closest);
    pushPluginState(searchQuery, closest, found);
    scrollToMatch(closest, found);
  }, [searchQuery, matches, editor, pushPluginState, scrollToMatch]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (!matches.length) return;
      const next = (currentIndex + dir + matches.length) % matches.length;
      setCurrentIndex(next);
      pushPluginState(searchQuery, next, matches);
      scrollToMatch(next, matches);
    },
    [matches, currentIndex, searchQuery, pushPluginState, scrollToMatch],
  );

  const handleReplaceOnce = useCallback(() => {
    if (!matches.length) return;

    if (replaceOnceStage === "idle") {
      scrollToMatch(currentIndex, matches);
      setReplaceOnceStage("preview");
      setReplaceAllStage("idle");
      return;
    }

    // Confirm: do the replacement
    const match = matches[currentIndex];
    editor
      .chain()
      .focus()
      .deleteRange({ from: match!.from, to: match!.to })
      .insertContentAt(match!.from, replaceQuery)
      .run();
    setReplaceOnceStage("idle");

    // Recompute matches after replacement
    setTimeout(() => {
      const newMatches = findMatches(editor.state.doc, searchQuery);
      const next = newMatches.length ? currentIndex % newMatches.length : 0;
      setMatches(newMatches);
      setCurrentIndex(next);
      pushPluginState(searchQuery, next, newMatches);
      if (newMatches.length) scrollToMatch(next, newMatches);
    }, 0);
  }, [
    matches,
    currentIndex,
    replaceOnceStage,
    replaceQuery,
    searchQuery,
    editor,
    pushPluginState,
    scrollToMatch,
  ]);

  const handleReplaceAll = useCallback(() => {
    if (!matches.length) return;

    if (replaceAllStage === "idle") {
      setReplaceAllStage("preview");
      setReplaceOnceStage("idle");
      return;
    }

    // Confirm: replace all (iterate in reverse to preserve positions)
    const chain = editor.chain().focus();
    [...matches].reverse().forEach((match) => {
      chain
        .deleteRange({ from: match.from, to: match.to })
        .insertContentAt(match.from, replaceQuery);
    });
    chain.run();

    setMatches([]);
    setCurrentIndex(0);
    setReplaceAllStage("idle");
    pushPluginState("", 0, []);
  }, [matches, replaceAllStage, replaceQuery, editor, pushPluginState]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setReplaceQuery("");
    setMatches([]);
    setCurrentIndex(0);
    setReplaceOnceStage("idle");
    setReplaceAllStage("idle");
    pushPluginState("", 0, []);
  }, [pushPluginState]);

  return (
    <div className="mb-2 flex flex-col gap-1.5 px-1">
      {/* Search row */}
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="Find…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value) handleClear();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
        />
        <button
          onClick={handleSearch}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            matches.length > 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-accent text-foreground hover:bg-accent/70"
          }`}
        >
          {matches.length > 0 ? "✕" : "Search"}
        </button>
      </div>

      {/* Match count + navigation */}
      {isSearchActive && (
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] text-muted-foreground">
            {matches.length === 0
              ? "No matches"
              : `${currentIndex + 1} / ${matches.length}`}
          </span>
          {matches.length > 1 && (
            <div className="flex gap-0.5">
              <button
                onClick={() => navigate(-1)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent/50 text-base"
              >
                ‹
              </button>
              <button
                onClick={() => navigate(1)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent/50 text-base"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Replace input */}
      <input
        type="text"
        placeholder="Replace with…"
        value={replaceQuery}
        onChange={(e) => setReplaceQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
      />

      {/* Replace buttons */}
      <div className="flex gap-1">
        <button
          onClick={handleReplaceOnce}
          disabled={!matches.length}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            replaceOnceStage === "preview"
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
              : "bg-accent text-foreground hover:bg-accent/70"
          }`}
        >
          {replaceOnceStage === "preview" ? "Confirm Replace" : "Replace Once"}
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={!matches.length}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            replaceAllStage === "preview"
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
              : "bg-accent text-foreground hover:bg-accent/70"
          }`}
        >
          {replaceAllStage === "preview"
            ? `Confirm All (${matches.length})`
            : "Replace All"}
        </button>
      </div>
    </div>
  );
});

// ─── Main panel ───────────────────────────────────────────────────────────────

const EditorRightSidebar = ({ editor }: { editor: Editor }) => {
  const [mode, setMode] = useState<PanelMode>("document");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      if (editor.isActive("image")) {
        setMode("image");
        return;
      }
      if (editor.isActive("link")) {
        const attrs = editor.getAttributes("link");
        setLinkUrl(attrs.href ?? "");
        setLinkNewTab(attrs.target === "_blank");
        setMode("link");
        return;
      }
      if (editor.isActive("table")) {
        setMode("table");
        return;
      }
      if (editor.isActive("codeBlock")) {
        setMode("codeBlock");
        return;
      }
      if (editor.isActive("heading")) {
        setMode("heading");
        return;
      }

      const { from, to, $from } = editor.state.selection;

      // Activate text mode if cursor is inside a text-containing block (e.g. paragraph)
      const isInTextBlock = $from.parent.isTextblock;

      setMode(isInTextBlock ? "text" : "document");
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="editor-sidebar-left flex h-full w-72 flex-col overflow-y-auto border-l border-border bg-editor-surface">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-editor-surface px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Properties
        </span>
        <p className="text-xs font-medium text-foreground">
          {MODE_LABELS[mode]}
        </p>
      </div>

      <div className="editor-sidebar-left flex-1 overflow-y-auto p-4">
        {(mode === "text" || mode === "heading") && (
          <>
            <TextTogglePanel editor={editor} />
          </>
        )}
        {mode === "link" && (
          <>
            <LinkPanel
              editor={editor}
              linkUrl={linkUrl}
              linkNewTab={linkNewTab}
              setLinkUrl={setLinkUrl}
              setLinkNewTab={setLinkNewTab}
            />
            <TextTogglePanel editor={editor} />
          </>
        )}
        {mode === "image" && <ImagePanel editor={editor} />}
        {mode === "table" && <TablePanel editor={editor} />}
        {mode === "codeBlock" && <CodePanel editor={editor} />}
      </div>
    </div>
  );
};

export default EditorRightSidebar;
