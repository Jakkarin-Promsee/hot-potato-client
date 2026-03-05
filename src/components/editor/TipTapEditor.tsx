import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
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

import { common, createLowlight } from "lowlight";
import EditorHeader from "./EditorHeader";
import { FabricCanvasNode } from "../extensions/FabricCanvasNode";
import { QuestionAnswerNode } from "../extensions/QuestionAnswerNode";
import { useCallback } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import PropertiesPanel from "../design/PropertiesPanel";
import CanvasSidebar from "../design/CanvasSidebar";
import EditorLeftSidebar from "./EditorLeftSidebar";
import EditorRightSidebar from "./EditorRightSidebar";

const lowlight = createLowlight(common);

const TipTapEditor = () => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
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
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
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
    },
    content: "",
  });

  const handleEditorClick = useCallback(() => {
    if (editor && !editor.isFocused) {
      editor.commands.focus("end");
    }
  }, [editor]);

  const { canvas } = useCanvasContext();

  return (
    <div className="editor-layout">
      {/* ── TOP HEADER ── */}
      <header className="editor-header">
        <EditorHeader editor={editor} />
      </header>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="editor-sidebar-left">
        {!canvas && editor && <EditorLeftSidebar editor={editor} />}
        {canvas && <CanvasSidebar />}
      </aside>

      {/* ── CENTER EDITOR ── */}
      <main className="editor-main" onClick={handleEditorClick}>
        <div className="w-fit mx-auto px-10 editor-card shadow-sm">
          {/* bg-editor-surface → editor-card */}
          <div
            className="tiptap-editor mx-auto pt-16 pb-40"
            style={{ width: "600px" }}
          >
            {/* {editor && (
              <>
                <EditorBubbleMenu editor={editor} />
                <EditorFloatingMenu editor={editor} />
              </>
            )} */}

            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="editor-sidebar-right">
        {!canvas && <EditorRightSidebar editor={editor} />}
        {canvas && <PropertiesPanel />}
      </aside>
    </div>
  );
};

export default TipTapEditor;
