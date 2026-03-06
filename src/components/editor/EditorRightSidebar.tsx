import { useEffect, useState, useCallback, memo, useMemo } from "react";
import { Editor } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Trash2,
  Search,
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
  Text,
  Link,
} from "lucide-react";

import {
  searchHighlightKey,
  findMatches,
  type SearchMatch,
} from "../extensions/SearchHighlight";

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelMode = keyof typeof MODE_LABELS;
type SectionKey = "document" | "outline" | "search" | "text";
type TextAlign = "left" | "center" | "right" | "justify";

// All reactive isActive / getAttributes reads — computed once per transaction
// in EditorRightSidebar and passed down as plain props for memo to diff
interface ActiveFormats {
  paragraph: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  blockquote: boolean;
  link: boolean;
  textAlign: TextAlign;
  textColor: string;
  highlightColor: string;
}

interface ImageAttrs {
  alt: string;
  align: string;
}

interface CodeAttrs {
  language: string;
}

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

const DEFAULT_ACTIVE_FORMATS: ActiveFormats = {
  paragraph: false,
  h1: false,
  h2: false,
  h3: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  blockquote: false,
  link: false,
  textAlign: "left",
  textColor: "",
  highlightColor: "",
};

// ─── Shared primitives ────────────────────────────────────────────────────────

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

// ─── Panel components ─────────────────────────────────────────────────────────

// ✅ No editor.isActive() calls — all active states come from props
const DocumentPanel = memo(
  ({ wordCount, readTime }: { wordCount: number; readTime: number }) => (
    <Section title="Document">
      <Row label="Words">
        <span className="text-xs font-medium">{wordCount}</span>
      </Row>
      <Row label="Read time">
        <span className="text-xs font-medium">{readTime} min</span>
      </Row>
    </Section>
  ),
);

// ✅ active states from props — memo diffs primitives correctly
const TextPanel = memo(
  ({ editor, active }: { editor: Editor; active: ActiveFormats }) => {
    const setColor = useCallback(
      (color: string) => editor.chain().focus().setColor(color).run(),
      [editor],
    );
    const setHighlight = useCallback(
      (color: string) =>
        editor.chain().focus().toggleHighlight({ color }).run(),
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

        <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Format
        </span>
        <ToolBtn
          icon={Bold}
          label="Bold"
          active={active.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolBtn
          icon={Italic}
          label="Italic"
          active={active.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolBtn
          icon={Underline}
          label="Underline"
          active={active.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolBtn
          icon={Strikethrough}
          label="Strikethrough"
          active={active.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolBtn
          icon={Quote}
          label="Blockquote"
          active={active.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolBtn
          icon={Link}
          label="Link"
          active={active.link}
          onClick={() => {
            if (active.link) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            const url = window.prompt("Enter URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        />

        <span className="px-2 pt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Alignment
        </span>
        <div className="flex gap-1 px-2 py-1">
          {ALIGN_OPTIONS.map(({ Icon, align }) => (
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

// ✅ openSections is local UI state — fine inside memo, doesn't relate to editor state
const TextTogglePanel = memo(
  ({ editor, active }: { editor: Editor; active: ActiveFormats }) => {
    const [openSections, setOpenSections] = useState({
      search: false,
      text: true,
    });

    const toggle = useCallback(
      (key: "search" | "text") =>
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
          onToggle={toggle as any}
        />
        {openSections.search && (
          <div className="px-2">
            <SearchPanel editor={editor} />
          </div>
        )}

        <SectionHeader
          sectionKey="text"
          icon={Text}
          label="Text"
          isOpen={openSections.text}
          onToggle={toggle as any}
        />
        {openSections.text && <TextPanel editor={editor} active={active} />}
      </>
    );
  },
);

// ✅ linkUrl, linkNewTab come from props (lifted to sidebar) — memo diffs them correctly
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
      (url: string, newTab: boolean) =>
        editor
          .chain()
          .focus()
          .setLink({ href: url, target: newTab ? "_blank" : "" })
          .run(),
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

// ✅ imageAttrs from props — no editor.getAttributes() inside memo
const ImagePanel = memo(
  ({ editor, imageAttrs }: { editor: Editor; imageAttrs: ImageAttrs }) => (
    <Section title="Image">
      <div className="mb-2">
        <label className="mb-1 block text-xs text-muted-foreground">
          Alt Text
        </label>
        <input
          defaultValue={imageAttrs.alt}
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
              active={imageAttrs.align === align}
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
  ),
);

// ✅ No reactive reads inside — TablePanel is pure commands, always safe with memo
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

// ✅ codeAttrs.language from props — no editor.getAttributes() inside memo
const CodePanel = memo(
  ({ editor, codeAttrs }: { editor: Editor; codeAttrs: CodeAttrs }) => (
    <Section title="Code Block">
      <label className="mb-1 block text-xs text-muted-foreground">
        Language
      </label>
      <select
        value={codeAttrs.language}
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
  ),
);

// ✅ SearchPanel manages its own isolated state — no isActive reads, memo is fine as-is
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

  const pushPluginState = useCallback(
    (term: string, index: number, newMatches: SearchMatch[]) => {
      const { state, dispatch } = editor.view;
      dispatch(
        state.tr.setMeta(searchHighlightKey, {
          searchTerm: term,
          currentIndex: index,
          matches: newMatches,
        }),
      );
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
    const match = matches[currentIndex]!;
    editor
      .chain()
      .focus()
      .deleteRange({ from: match.from, to: match.to })
      .insertContentAt(match.from, replaceQuery)
      .run();
    setReplaceOnceStage("idle");
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
      <input
        type="text"
        placeholder="Replace with…"
        value={replaceQuery}
        onChange={(e) => setReplaceQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
      />
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

// ─── Main sidebar — single transaction listener, all reactive reads here ──────

const EditorRightSidebar = ({
  editor,
  dynamicUpdate,
}: {
  editor: Editor;
  dynamicUpdate: Boolean;
}) => {
  const [mode, setMode] = useState<PanelMode>("document");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(
    DEFAULT_ACTIVE_FORMATS,
  );
  const [imageAttrs, setImageAttrs] = useState<ImageAttrs>({
    alt: "",
    align: "left",
  });
  const [codeAttrs, setCodeAttrs] = useState<CodeAttrs>({
    language: "plaintext",
  });

  // Word count / read time derived from doc — stable via useMemo
  const { wordCount, readTime } = useMemo(() => {
    if (!editor) return { wordCount: 0, readTime: 1 };
    const words = editor.state.doc.textContent
      .split(/\s+/)
      .filter(Boolean).length;
    return { wordCount: words, readTime: Math.max(1, Math.ceil(words / 265)) };
  }, [editor?.state.doc]);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      // ── Mode ──────────────────────────────────────────────────────────────
      if (editor.isActive("image")) {
        const attrs = editor.getAttributes("image");
        setImageAttrs({
          alt: attrs.alt ?? "",
          align: attrs["data-align"] ?? "left",
        });
        setMode("image");
      } else if (editor.isActive("link")) {
        const attrs = editor.getAttributes("link");
        setLinkUrl(attrs.href ?? "");
        setLinkNewTab(attrs.target === "_blank");
        setMode("link");
      } else if (editor.isActive("table")) {
        setMode("table");
      } else if (editor.isActive("codeBlock")) {
        const attrs = editor.getAttributes("codeBlock");
        setCodeAttrs({ language: attrs.language ?? "plaintext" });
        setMode("codeBlock");
      } else if (editor.isActive("heading")) {
        setMode("heading");
      } else {
        setMode(
          editor.state.selection.$from.parent.isTextblock ? "text" : "document",
        );
      }

      // ── Active formats — all reads in ONE place ───────────────────────────
      if (!dynamicUpdate) return; // ← skip attaching listener entirely

      setActiveFormats({
        textColor: editor.getAttributes("textStyle").color ?? "#000000",
        highlightColor: editor.getAttributes("highlight").color ?? "",
        paragraph: editor.isActive("paragraph") && !editor.isActive("heading"),
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        blockquote: editor.isActive("blockquote"),
        link: editor.isActive("link"),
        textAlign:
          (editor.getAttributes("paragraph").textAlign as TextAlign) ?? "left",
      });
    };

    update(); // run once on mount
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, dynamicUpdate]);

  if (!editor) return null;

  return (
    <div className="editor-sidebar-left flex h-full  flex-col overflow-y-auto border-l border-border bg-editor-surface">
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
        {mode === "document" && (
          <DocumentPanel wordCount={wordCount} readTime={readTime} />
        )}
        {(mode === "text" || mode === "heading") && (
          <TextTogglePanel editor={editor} active={activeFormats} />
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
            <TextTogglePanel editor={editor} active={activeFormats} />
          </>
        )}
        {mode === "image" && (
          <ImagePanel editor={editor} imageAttrs={imageAttrs} />
        )}
        {mode === "table" && <TablePanel editor={editor} />}
        {mode === "codeBlock" && (
          <CodePanel editor={editor} codeAttrs={codeAttrs} />
        )}
      </div>
    </div>
  );
};

export default EditorRightSidebar;
