import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import Link from "@tiptap/extension-link";
import { SearchHighlightExtension } from "../extensions/searchHighlight";

import { common, createLowlight } from "lowlight";
import EditorHeader from "./EditorHeader";
import { FabricCanvasNode } from "../extensions/FabricCanvasNode";
import { QuestionAnswerNode } from "../extensions/QuestionAnswerNode";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import PropertiesPanel from "../design/PropertiesPanel";
import CanvasSidebar from "../design/CanvasSidebar";
import EditorLeftSidebar from "./EditorLeftSidebar";
import EditorRightSidebar from "./EditorRightSidebar";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1; // finer step for ctrl+scroll

const TipTapEditor = () => {
  const [dynamicUpdate, setDynamicUpdate] = useState(true);
  const [linkClickMode, setLinkClickMode] = useState<"ctrl" | "direct">("ctrl");
  const [zoom, setZoom] = useState(1.0);
  const mainRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "cursor-text",
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "Tell your story...",
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { class: "editor-image" },
      }),
      Youtube.configure({ width: 560, height: 315 }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      SearchHighlightExtension,
      FabricCanvasNode,
      QuestionAnswerNode,
    ],
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const { schema } = view.state;
              const node = schema.nodes.image?.create({ src });
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (pos && node) {
                const tr = view.state.tr.insert(pos.pos, node);
                view.dispatch(tr);
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");
        if (!anchor) return false;

        event.preventDefault();
        event.stopPropagation();

        if (linkClickMode === "direct" || event.ctrlKey || event.metaKey) {
          const href = anchor.getAttribute("href");
          if (href) window.open(href, "_blank");
        }

        return true;
      },
    },
    content: "",
  });

  const handleEditorClick = useCallback(() => {
    if (editor && !editor.isFocused) {
      editor.commands.focus("end");
    }
  }, [editor]);

  // ── Ctrl+Scroll zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const next = Math.round((prev + delta) * 100) / 100;
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      });
    };

    // passive: false so we can preventDefault (blocks browser native zoom)
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Ctrl +/- keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((prev) =>
          Math.min(ZOOM_MAX, Math.round((prev + 0.25) * 100) / 100),
        );
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) =>
          Math.max(ZOOM_MIN, Math.round((prev - 0.25) * 100) / 100),
        );
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1.0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const { canvas } = useCanvasContext();

  return (
    <div className="editor-layout">
      {/* ── TOP HEADER ── */}
      <header className="editor-header">
        <EditorHeader
          editor={editor}
          dynamicUpdate={dynamicUpdate}
          onDynamicUpdateChange={setDynamicUpdate}
          linkClickMode={linkClickMode}
          onLinkClickModeChange={setLinkClickMode}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      </header>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="editor-sidebar-left flex">
        {!canvas && editor && (
          <EditorLeftSidebar editor={editor} dynamicUpdate={dynamicUpdate} />
        )}
        {canvas && <CanvasSidebar />}
      </aside>

      {/* ── CENTER EDITOR ── */}
      <main ref={mainRef} className="editor-main" onClick={handleEditorClick}>
        <div
          className="w-fit mx-auto px-10 editor-card shadow-sm"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            marginBottom: `calc((${zoom} - 1) * 100%)`,
          }}
        >
          <div
            className="tiptap-editor mx-auto pt-16 pb-40"
            style={{ width: "600px" }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="editor-sidebar-right">
        {!canvas && (
          <EditorRightSidebar editor={editor} dynamicUpdate={dynamicUpdate} />
        )}
        {canvas && <PropertiesPanel />}
      </aside>
    </div>
  );
};

export default TipTapEditor;
