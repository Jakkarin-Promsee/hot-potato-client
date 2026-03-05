import { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { Undo2, Redo2, Save, Loader2, Link2 } from "lucide-react";

interface EditorHeaderProps {
  editor: Editor | null;
  linkClickMode: "ctrl" | "direct";
  onLinkClickModeChange: (mode: "ctrl" | "direct") => void;
}

const EditorHeader = ({
  editor,
  linkClickMode,
  onLinkClickModeChange,
}: EditorHeaderProps) => {
  const [title, setTitle] = useState("Untitle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mock auto-save trigger whenever title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    triggerSave();
  };

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      setCanUndo(editor.can().undo());
      setCanRedo(editor.can().redo());
    };

    update(); // run once on mount
    editor.on("transaction", update);

    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  const triggerSave = () => {
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    }, 1200);
  };

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const IconBtn = ({
    onClick,
    disabled = false,
    title: tip,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tip}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );

  return (
    <div className="editor-header-inner">
      {/* ── LEFT: Undo/Redo + Title + Save ── */}
      <div className="flex items-center gap-1.5">
        {/* Title input */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-48 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors hover:text-foreground focus:placeholder:opacity-0"
        />

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          {saveState === "saving" && (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Saving…</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <Save size={12} />
              <span>Saved</span>
            </>
          )}
          {saveState === "idle" && (
            <button
              onClick={triggerSave}
              title="Save"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Save size={12} />
              <span>Save</span>
            </button>
          )}
        </div>

        <div className="mx-1.5 h-4 w-px bg-border" />

        {/* Undo / Redo */}
        <IconBtn
          title="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!canUndo}
        >
          <div className="flex">
            <p>Undo</p>
            <Undo2 size={15} strokeWidth={1.8} />
          </div>
        </IconBtn>
        <IconBtn
          title="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!canRedo}
        >
          <div className="flex">
            <Redo2 size={15} strokeWidth={1.8} />
            <p>Redo</p>
          </div>
        </IconBtn>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Link click mode toggle */}
        <button
          onClick={() =>
            onLinkClickModeChange(linkClickMode === "ctrl" ? "direct" : "ctrl")
          }
          title={
            linkClickMode === "ctrl"
              ? "Links open on Ctrl+Click"
              : "Links open on Click"
          }
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
            linkClickMode === "direct"
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          <Link2 size={12} strokeWidth={1.8} />
          <p>Link:</p>
          {linkClickMode === "direct" ? "Open on Click" : "Open on Ctrl+Click"}
        </button>
        <div className="mx-1.5 h-4 w-px bg-border" />

        {/* ── RIGHT: Publish ── */}
        <button className=" rounded-full bg-editor-highlight px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
          Publish
        </button>
      </div>
    </div>
  );
};

export default EditorHeader;
