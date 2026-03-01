import { Editor } from '@tiptap/react';

interface EditorHeaderProps {
  editor: Editor | null;
}

const EditorHeader = ({ editor }: EditorHeaderProps) => {
  const wordCount = editor
    ? editor.state.doc.textContent.split(/\s+/).filter(Boolean).length
    : 0;

  const readTime = Math.max(1, Math.ceil(wordCount / 265));

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-lg items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground font-sans">
            Draft
          </span>
          <span className="text-xs text-muted-foreground">
            {wordCount > 0 && `${wordCount} words · ${readTime} min read`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-editor-highlight px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Publish
          </button>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
