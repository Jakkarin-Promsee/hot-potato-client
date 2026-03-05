import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Editor } from "@tiptap/react";
import { Undo2, Redo2, Save, Loader2, Link2 } from "lucide-react";

// ✅ Moved OUTSIDE — no longer recreated on every render
const IconBtn = memo(
  ({
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
  ),
);

interface EditorHeaderProps {
  editor: Editor | null;
  linkClickMode: "ctrl" | "direct";
  onLinkClickModeChange: (mode: "ctrl" | "direct") => void;
}

const EditorHeader = memo(
  ({ editor, linkClickMode, onLinkClickModeChange }: EditorHeaderProps) => {
    const [title, setTitle] = useState("Untitled");
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
      "idle",
    );
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ✅ useCallback so this ref stays stable across renders
    const triggerSave = useCallback(() => {
      setSaveState("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      }, 1200);
    }, []);

    const handleTitleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        triggerSave();
      },
      [triggerSave],
    );

    useEffect(() => {
      if (!editor) return;

      // ✅ Named function so it can be cleanly removed
      const update = () => {
        setCanUndo(editor.can().undo());
        setCanRedo(editor.can().redo());
      };

      update();
      editor.on("transaction", update);
      return () => {
        editor.off("transaction", update);
      };
    }, [editor]);

    useEffect(() => {
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
    }, []);

    // ✅ Stable callbacks for undo/redo buttons
    const handleUndo = useCallback(
      () => editor?.chain().focus().undo().run(),
      [editor],
    );
    const handleRedo = useCallback(
      () => editor?.chain().focus().redo().run(),
      [editor],
    );
    const handleLinkToggle = useCallback(() => {
      onLinkClickModeChange(linkClickMode === "ctrl" ? "direct" : "ctrl");
    }, [linkClickMode, onLinkClickModeChange]);

    return (
      <div className="editor-header-inner">
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-48 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors hover:text-foreground focus:placeholder:opacity-0"
          />
          <div className="mx-1 h-4 w-px bg-border" />
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
          <IconBtn title="Undo" onClick={handleUndo} disabled={!canUndo}>
            <div className="flex">
              <p>Undo</p>
              <Undo2 size={15} strokeWidth={1.8} />
            </div>
          </IconBtn>
          <IconBtn title="Redo" onClick={handleRedo} disabled={!canRedo}>
            <div className="flex">
              <Redo2 size={15} strokeWidth={1.8} />
              <p>Redo</p>
            </div>
          </IconBtn>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleLinkToggle}
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
            {linkClickMode === "direct"
              ? "Open on Click"
              : "Open on Ctrl+Click"}
          </button>
          <div className="mx-1.5 h-4 w-px bg-border" />
          <button className="rounded-full bg-editor-highlight px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Publish
          </button>
        </div>
      </div>
    );
  },
);

export default EditorHeader;
