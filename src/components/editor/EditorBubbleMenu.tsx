import { useRef, useEffect, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Link,
  Quote,
  Truck,
} from "lucide-react";
import { useCanvasContext } from "@/contexts/CanvasContext";

interface EditorBubbleMenuProps {
  editor: Editor;
}

const EditorBubbleMenu = ({ editor }: EditorBubbleMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  const { canvas } = useCanvasContext();

  const canvasRef = useRef(canvas);

  // Keep ref in sync with latest canvas value
  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el || !editor) return;

    const plugin = BubbleMenuPlugin({
      pluginKey: "bubbleMenu",
      editor,
      element: el,
      updateDelay: 100,
      shouldShow: () => {
        // ✅ Always reads the latest value, not the stale closure
        if (canvasRef.current) return false;

        const { selection } = editor.state;
        return !selection.empty;
      },
      options: {
        placement: "top-start",
        onShow: () => setIsVisible(true),
        onHide: () => {
          setIsVisible(false);
          setShowLinkInput(false);
        },
      },
    });

    editor.registerPlugin(plugin);
    return () => {
      editor.unregisterPlugin("bubbleMenu");
    };
  }, [editor]); // ← editor only, canvas intentionally excluded

  const toggleLink = useCallback(() => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setShowLinkInput(true);
    setLinkUrl("");
  }, [editor]);

  const submitLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const buttons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      label: "Bold",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      label: "Italic",
    },
    {
      icon: Heading1,
      action: () => {
        console.log("H1 clicked");
        console.log("selection:", editor.state.selection.empty);
        console.log("can run:", editor.can().toggleHeading({ level: 1 }));
        const result = editor.chain().toggleHeading({ level: 1 }).run();
        console.log("result:", result);
      },
      active: editor.isActive("heading", { level: 1 }),
      label: "H1",
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      label: "H2",
    },
    {
      icon: Link,
      action: toggleLink,
      active: editor.isActive("link"),
      label: "Link",
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
      label: "Quote",
    },
  ];

  return (
    <div
      ref={menuRef}
      className={`absolute transition-opacity duration-150 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="flex items-center gap-0.5 rounded-lg bg-editor-toolbar px-1.5 py-1 shadow-cinematic"
        style={
          {
            // transform: "translateX(calc(-100% + 12px))",
          }
        }
      >
        {showLinkInput ? (
          <div className="flex items-center gap-1.5 px-1">
            <input
              type="url"
              placeholder="Paste link..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitLink()}
              className="h-7 w-44 rounded bg-editor-toolbar-fg/10 px-2 text-xs text-editor-toolbar-fg outline-none placeholder:text-editor-toolbar-fg/40"
              autoFocus
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                submitLink();
              }}
              className="text-xs font-medium text-editor-toolbar-fg/80 hover:text-editor-toolbar-fg transition-colors"
            >
              ↵
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setShowLinkInput(false);
              }}
              className="text-xs text-editor-toolbar-fg/50 hover:text-editor-toolbar-fg transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          buttons.map((btn) => (
            <button
              key={btn.label}
              onMouseDown={(e) => {
                e.preventDefault();
                btn.action();
              }}
              title={btn.label}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150 ${
                btn.active
                  ? "bg-editor-toolbar-fg/20 text-editor-toolbar-fg"
                  : "text-editor-toolbar-fg/70 hover:bg-editor-toolbar-fg/10 hover:text-editor-toolbar-fg"
              }`}
            >
              <btn.icon size={16} strokeWidth={2} />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default EditorBubbleMenu;
