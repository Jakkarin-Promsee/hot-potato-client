import { useRef, useEffect, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { FloatingMenuPlugin } from "@tiptap/extension-floating-menu";
import { Plus, Image, Video, Code } from "lucide-react";
import { useCanvasContext } from "@/contexts/CanvasContext";

interface EditorFloatingMenuProps {
  editor: Editor;
}

const EditorFloatingMenu = ({ editor }: EditorFloatingMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = menuRef.current;
    if (!el || !editor) return;

    const plugin = FloatingMenuPlugin({
      pluginKey: "floatingMenu",
      editor,
      element: el,
      shouldShow: ({ state }) => {
        const { $from } = state.selection;
        const currentLineText =
          $from.nodeBefore?.textContent || $from.nodeAfter?.textContent;
        const isEmptyLine =
          !currentLineText && $from.parent.type.name === "paragraph";
        return isEmptyLine;
      },
      options: {
        onShow: () => setIsVisible(true),
        onHide: () => {
          setIsVisible(false);
          setIsOpen(false);
        },
      },
    });

    editor.registerPlugin(plugin);
    return () => {
      editor.unregisterPlugin("floatingMenu");
    };
  }, [editor]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
      setIsOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [editor],
  );

  const handleVideoEmbed = useCallback(() => {
    const url = window.prompt("Paste YouTube or Vimeo URL");
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
    setIsOpen(false);
  }, [editor]);

  const handleCodeBlock = useCallback(() => {
    editor.chain().focus().toggleCodeBlock().run();
    setIsOpen(false);
  }, [editor]);

  const menuItems = [
    {
      icon: Image,
      label: "Image",
      action: () => fileInputRef.current?.click(),
    },
    { icon: Video, label: "Video", action: handleVideoEmbed },
    { icon: Code, label: "Code", action: handleCodeBlock },
  ];

  return (
    <div
      ref={menuRef}
      className={`transition-opacity duration-150 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ visibility: isVisible ? "visible" : "hidden" }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 hover:border-foreground/30 hover:text-foreground ${
            isOpen ? "rotate-45 border-foreground/30 text-foreground" : ""
          }`}
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>

        <div
          className={`flex items-center gap-1 overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              title={item.label}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:border-foreground/30 hover:text-foreground"
            >
              <item.icon size={16} strokeWidth={1.5} />
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default EditorFloatingMenu;
