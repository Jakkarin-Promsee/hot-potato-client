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
} from "lucide-react";

// ─── Constants outside component ─────────────────────────────────────────────

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
type SectionKey = "document" | "outline" | "search";

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

const DocumentTogglePanel = memo(({ editor }: { editor: Editor }) => {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      document: true,
      outline: true,
      search: true,
    },
  );

  // Stable toggle — never recreated
  const toggle = useCallback(
    (key: SectionKey) =>
      setOpenSections((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  return (
    <>
      <SectionHeader
        sectionKey="document"
        icon={BookOpen}
        label="Document"
        isOpen={openSections.document}
        onToggle={toggle}
      />
      {openSections.document && (
        <div className="px-2">
          <DocumentPanel editor={editor} />
        </div>
      )}

      <SectionHeader
        sectionKey="outline"
        icon={BookOpen}
        label="Outline"
        isOpen={openSections.outline}
        onToggle={toggle}
      />
      {openSections.outline && <OutlinePanel editor={editor} />}

      <SectionHeader
        sectionKey="search"
        icon={Search}
        label="Search & Replace"
        isOpen={openSections.search}
        onToggle={toggle}
      />
      {openSections.search && <SearchPanel editor={editor} />}
    </>
  );
});

const TextPanel = memo(({ editor }: { editor: Editor }) => (
  <Section title="Text Style">
    <Row label="Align">
      <div className="flex gap-0.5">
        {ALIGN_OPTIONS.map(({ Icon, align }) => (
          <IconBtn
            key={align}
            icon={Icon}
            title={`Align ${align}`}
            active={editor.isActive({ textAlign: align })}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
          />
        ))}
      </div>
    </Row>
  </Section>
));

const HeadingPanel = memo(({ editor }: { editor: Editor }) => {
  const attrs = editor.getAttributes("heading");
  const level = attrs.level as 1 | 2 | 3;
  const anchorId = attrs.id ?? "";

  return (
    <Section title="Heading">
      <Row label="Level">
        <div className="flex gap-0.5">
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: l }).run()
              }
              className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-colors ${
                level === l
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              H{l}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Anchor ID">
        <input
          defaultValue={anchorId}
          placeholder="e.g. intro"
          className="w-28 rounded border border-border bg-background px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
          onChange={(e) =>
            editor
              .chain()
              .focus()
              .updateAttributes("heading", { id: e.target.value })
              .run()
          }
        />
      </Row>
    </Section>
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

const OutlinePanel = memo(({ editor }: { editor: Editor }) => {
  // Compute headings only when this panel is actually rendered
  const headings = useMemo(() => {
    const items: { level: number; text: string; pos: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        items.push({ level: node.attrs.level, text: node.textContent, pos });
      }
    });
    return items;
  }, [editor.state.doc]); // re-runs only when doc changes, not on every keystroke

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

const SearchPanel = memo(({ editor }: { editor: Editor }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");

  const handleReplace = useCallback(() => {
    if (!searchQuery) return;
    const { state, dispatch } = editor.view;
    const { tr, doc } = state;
    let replaced = false;
    doc.descendants((node, pos) => {
      if (!node.isText || !node.text || replaced) return;
      const idx = node.text.indexOf(searchQuery);
      if (idx !== -1) {
        tr.replaceWith(
          pos + idx,
          pos + idx + searchQuery.length,
          state.schema.text(replaceQuery),
        );
        replaced = true;
      }
    });
    if (replaced) dispatch(tr);
  }, [editor, searchQuery, replaceQuery]);

  return (
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

      const { from, to } = editor.state.selection;
      setMode(from !== to ? "text" : "document");
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
    <div className="flex h-full w-72 flex-col overflow-y-auto border-l border-border bg-editor-surface">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-editor-surface px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Properties
        </span>
        <p className="text-xs font-medium text-foreground">
          {MODE_LABELS[mode]}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === "document" && (
          <>
            <DocumentTogglePanel editor={editor} />
          </>
        )}
        {mode === "text" && (
          <>
            <TextPanel editor={editor} />
            <DocumentPanel editor={editor} />
          </>
        )}
        {mode === "heading" && (
          <>
            <HeadingPanel editor={editor} />
            <TextPanel editor={editor} />
          </>
        )}
        {mode === "link" && (
          <LinkPanel
            editor={editor}
            linkUrl={linkUrl}
            linkNewTab={linkNewTab}
            setLinkUrl={setLinkUrl}
            setLinkNewTab={setLinkNewTab}
          />
        )}
        {mode === "image" && <ImagePanel editor={editor} />}
        {mode === "table" && <TablePanel editor={editor} />}
        {mode === "codeBlock" && <CodePanel editor={editor} />}
      </div>
    </div>
  );
};

export default EditorRightSidebar;
