import { useState } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Link,
  Quote,
  List,
  ListOrdered,
  Code,
  Minus,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  HelpCircle,
} from "lucide-react";

interface EditorSidebarProps {
  editor: Editor;
}

const EditorSidebar = ({ editor }: EditorSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const groups = [
    {
      label: "Text Style",
      items: [
        {
          icon: Type,
          label: "Normal Text",
          action: () => editor.chain().focus().setParagraph().run(),
          active: editor.isActive("paragraph") && !editor.isActive("heading"),
        },
        {
          icon: Heading1,
          label: "Heading 1",
          action: () =>
            editor.chain().focus().toggleHeading({ level: 1 }).run(),
          active: editor.isActive("heading", { level: 1 }),
        },
        {
          icon: Heading2,
          label: "Heading 2",
          action: () =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor.isActive("heading", { level: 2 }),
        },
        {
          icon: Heading3,
          label: "Heading 3",
          action: () =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
          active: editor.isActive("heading", { level: 3 }),
        },
      ],
    },
    {
      label: "Formatting",
      items: [
        {
          icon: Bold,
          label: "Bold",
          action: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive("bold"),
        },
        {
          icon: Italic,
          label: "Italic",
          action: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive("italic"),
        },
        {
          icon: Link,
          label: "Link",
          action: () => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              const url = window.prompt("Enter URL");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }
          },
          active: editor.isActive("link"),
        },
      ],
    },
    {
      label: "Blocks",
      items: [
        {
          icon: Quote,
          label: "Blockquote",
          action: () => editor.chain().focus().toggleBlockquote().run(),
          active: editor.isActive("blockquote"),
        },
        {
          icon: List,
          label: "Bullet List",
          action: () => editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive("bulletList"),
        },
        {
          icon: ListOrdered,
          label: "Ordered List",
          action: () => editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive("orderedList"),
        },
        {
          icon: Code,
          label: "Code Block",
          action: () => editor.chain().focus().toggleCodeBlock().run(),
          active: editor.isActive("codeBlock"),
        },
        {
          icon: Minus,
          label: "Divider",
          action: () => editor.chain().focus().setHorizontalRule().run(),
          active: false,
        },
      ],
    },
    {
      label: "Special",
      items: [
        {
          icon: LayoutDashboard,
          label: "Canvas Board",
          action: () =>
            editor
              .chain()
              .focus()
              .insertContent({ type: "fabricCanvas" })
              .run(),
          active: false,
        },
        {
          icon: HelpCircle,
          label: "Q&A Card",
          action: () =>
            editor
              .chain()
              .focus()
              .insertContent({ type: "questionAnswer" })
              .run(),
          active: false,
        },
      ],
    },
  ];

  return (
    <>
      {/* Toggle button - always visible */}
      {/* <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-20 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-editor-surface text-muted-foreground shadow-sm transition-all duration-200 hover:text-foreground hover:shadow-md"
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
      </button> */}

      {/* Sidebar panel */}
      <div
        className={`left-0 h-[calc(100vh-3.5rem)] w-56 border-r border-border bg-editor-surface transition-transform duration-300 ease-out `}
      >
        <div className="flex flex-col gap-1 overflow-y-auto p-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </span>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ${
                    item.active
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <item.icon size={15} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default EditorSidebar;
