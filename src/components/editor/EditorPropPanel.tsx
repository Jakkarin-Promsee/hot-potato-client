import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ExternalLink,
  Trash2,
  Plus,
  Minus,
  Code,
  FileText,
  Clock,
  Download,
} from "lucide-react";

interface PropertiesPanelProps {
  editor: Editor | null;
}

type PanelMode =
  | "document"
  | "text"
  | "image"
  | "table"
  | "link"
  | "heading"
  | "codeBlock";

const EditroPropPanel = ({ editor }: PropertiesPanelProps) => {
  const [mode, setMode] = useState<PanelMode>("document");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      if (editor.isActive("image")) return setMode("image");
      if (editor.isActive("link")) {
        const attrs = editor.getAttributes("link");
        setLinkUrl(attrs.href || "");
        setLinkNewTab(attrs.target === "_blank");
        return setMode("link");
      }
      if (editor.isActive("table")) return setMode("table");
      if (editor.isActive("codeBlock")) return setMode("codeBlock");
      if (editor.isActive("heading")) return setMode("heading");
      const { from, to } = editor.state.selection;
      if (from !== to) return setMode("text");
      setMode("document");
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor) return null;

  // ── helpers ──
  const wordCount = editor.state.doc.textContent
    .split(/\s+/)
    .filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 265));

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-4">
      <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {title}
      </span>
      {children}
    </div>
  );

  const Row = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );

  const IconBtn = ({
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
  );

  // ──────────────────────────────────────────
  // PANELS
  // ──────────────────────────────────────────

  const DocumentPanel = () => (
    <>
      <Section title="Document">
        <Row label="Words">
          <span className="text-xs font-medium">{wordCount}</span>
        </Row>
        <Row label="Read time">
          <span className="text-xs font-medium">{readTime} min</span>
        </Row>
      </Section>
      <Section title="Export">
        <button
          className="mb-1.5 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
          onClick={() => {
            const html = editor.getHTML();
            const b = new Blob([html], { type: "text/html" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(b);
            a.download = "document.html";
            a.click();
          }}
        >
          <FileText size={13} /> Export HTML
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
          onClick={() => {
            const md =
              (editor.storage as any).markdown?.getMarkdown()?.() ??
              editor.getText();
            const b = new Blob([md], { type: "text/markdown" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(b);
            a.download = "document.md";
            a.click();
          }}
        >
          <Download size={13} /> Export Markdown
        </button>
      </Section>
    </>
  );

  const TextPanel = () => (
    <Section title="Text Style">
      <Row label="Align">
        <div className="flex gap-0.5">
          {[AlignLeft, AlignCenter, AlignRight, AlignJustify].map((Icon, i) => {
            const aligns = ["left", "center", "right", "justify"];
            return (
              <IconBtn
                key={i}
                icon={Icon}
                title={`Align ${aligns[i]}`}
                active={editor.isActive({ textAlign: aligns[i] })}
                onClick={() =>
                  aligns[i] &&
                  editor.chain().focus().setTextAlign(aligns[i]).run()
                }
              />
            );
          })}
        </div>
      </Row>
    </Section>
  );

  const HeadingPanel = () => {
    const level = editor.getAttributes("heading").level;
    const anchorId = editor.getAttributes("heading").id ?? "";
    return (
      <Section title="Heading">
        <Row label="Level">
          <div className="flex gap-0.5">
            {[1, 2, 3].map((l) => (
              <button
                key={l}
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .toggleHeading({ level: l as 1 | 2 | 3 })
                    .run()
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
  };

  const LinkPanel = () => (
    <Section title="Link">
      <div className="mb-2">
        <label className="mb-1 block text-xs text-muted-foreground">URL</label>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onBlur={() =>
            editor
              .chain()
              .focus()
              .setLink({ href: linkUrl, target: linkNewTab ? "_blank" : "" })
              .run()
          }
          placeholder="https://..."
          className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>
      <Row label="New tab">
        <button
          onClick={() => {
            setLinkNewTab(!linkNewTab);
            editor
              .chain()
              .focus()
              .setLink({ href: linkUrl, target: !linkNewTab ? "_blank" : "" })
              .run();
          }}
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

  const ImagePanel = () => {
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
            {[AlignLeft, AlignCenter, AlignRight].map((Icon, i) => {
              const aligns = ["left", "center", "right"];
              return (
                <IconBtn
                  key={i}
                  icon={Icon}
                  title={aligns[i]}
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", { "data-align": aligns[i] })
                      .run()
                  }
                />
              );
            })}
          </div>
        </Row>
      </Section>
    );
  };

  const TablePanel = () => (
    <Section title="Table">
      <div className="grid grid-cols-2 gap-1.5">
        {[
          {
            label: "+ Row After",
            fn: () => editor.chain().focus().addRowAfter().run(),
          },
          {
            label: "− Row",
            fn: () => editor.chain().focus().deleteRow().run(),
          },
          {
            label: "+ Col After",
            fn: () => editor.chain().focus().addColumnAfter().run(),
          },
          {
            label: "− Col",
            fn: () => editor.chain().focus().deleteColumn().run(),
          },
          {
            label: "Merge Cells",
            fn: () => editor.chain().focus().mergeCells().run(),
          },
          {
            label: "Split Cell",
            fn: () => editor.chain().focus().splitCell().run(),
          },
        ].map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
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
  );

  const CodePanel = () => {
    const LANGS = [
      "plaintext",
      "javascript",
      "typescript",
      "python",
      "html",
      "css",
      "json",
      "bash",
      "sql",
    ];
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
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Section>
    );
  };

  const modeLabel: Record<PanelMode, string> = {
    document: "Document",
    text: "Text Selected",
    image: "Image",
    table: "Table",
    link: "Link",
    heading: "Heading",
    codeBlock: "Code Block",
  };

  return (
    <div className="flex h-full w-72 flex-col overflow-y-auto border-l border-border bg-editor-surface">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-editor-surface px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Properties
        </span>
        <p className="text-xs font-medium text-foreground">{modeLabel[mode]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === "document" && <DocumentPanel />}
        {mode === "text" && (
          <>
            <TextPanel />
            <DocumentPanel />
          </>
        )}
        {mode === "heading" && (
          <>
            <HeadingPanel />
            <TextPanel />
          </>
        )}
        {mode === "link" && <LinkPanel />}
        {mode === "image" && <ImagePanel />}
        {mode === "table" && <TablePanel />}
        {mode === "codeBlock" && <CodePanel />}
      </div>
    </div>
  );
};

export default EditroPropPanel;
