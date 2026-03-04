import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import EditorBubbleMenu from "./EditorBubbleMenu";
import EditorFloatingMenu from "./EditorFloatingMenu";
import EditorHeader from "./EditorHeader";
import EditorSidebar from "./EditorSidebar";
import { FabricCanvasNode } from "../extensions/FabricCanvasNode";
import { QuestionAnswerNode } from "../extensions/QuestionAnswerNode";
import { useCallback } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import PropertiesPanel from "../design/PropertiesPanel";
import CanvasSidebar from "../design/CanvasSidebar";

const lowlight = createLowlight(common);

const TipTapEditor = () => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Placeholder.configure({
        placeholder: "Tell your story...",
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { class: "editor-image" },
      }),
      Youtube.configure({
        width: 720,
        height: 405,
        HTMLAttributes: { class: "editor-youtube" },
      }),
      CodeBlockLowlight.configure({ lowlight }),
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
    <div className="h-screen flex-col overflow-hidden bg-editor-canvas">
      {/* Top side bar */}
      <EditorHeader editor={editor} />

      <div className="flex flex-1">
        {/* Left side bar */}
        <aside className="shrink-0 w-60 overflow-y-auto border-r border-gray-200">
          {!canvas && editor && <EditorSidebar editor={editor} />}
          {canvas && <CanvasSidebar />}
        </aside>

        {/* Center side bar */}
        <main
          className="flex-1 overflow-y-auto cursor-text bg-editor-canvas"
          onClick={handleEditorClick}
        >
          <div
            className="tiptap-editor mx-auto bg-editor-surface shadow-sm pt-16 pb-40"
            style={{ maxWidth: "900px", minHeight: "100%" }}
          >
            {editor && (
              <>
                <EditorBubbleMenu editor={editor} />
                <EditorFloatingMenu editor={editor} />
              </>
            )}
            <EditorContent editor={editor} />
          </div>
        </main>

        {/* Right side bar */}
        <aside className="shrink-0 w-72 overflow-y-auto border-l border-gray-200">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
};

export default TipTapEditor;
