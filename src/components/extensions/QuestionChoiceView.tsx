import { useState, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionChoiceAttrs {
  question: string;
  choices: string[];
}

// ─── Creator Mode ─────────────────────────────────────────────────────────────

interface CreatorViewProps {
  attrs: QuestionChoiceAttrs;
  onUpdateQuestion: (value: string) => void;
  onUpdateChoice: (index: number, value: string) => void;
  onAddChoice: () => void;
  onRemoveChoice: (index: number) => void;
  onFlush: () => void;
}

function CreatorView({
  attrs,
  onUpdateQuestion,
  onUpdateChoice,
  onAddChoice,
  onRemoveChoice,
  onFlush,
}: CreatorViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Question input */}
      <input
        type="text"
        value={attrs.question}
        placeholder="Type your question here…"
        onChange={(e) => onUpdateQuestion(e.target.value)}
        onBlur={onFlush}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {/* Choice list */}
      <div className="flex flex-col gap-2">
        {attrs.choices.map((choice, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Radio-style indicator (decorative in creator mode) */}
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-gray-300" />

            <input
              type="text"
              value={choice}
              onChange={(e) => onUpdateChoice(i, e.target.value)}
              onBlur={onFlush}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />

            {/* Remove button — only show when more than 1 choice remains */}
            {attrs.choices.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveChoice(i)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label="Remove choice"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M2 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Z" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add choice button */}
      <button
        type="button"
        onClick={onAddChoice}
        className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
        Add choice
      </button>
    </div>
  );
}

// ─── Viewer Mode ──────────────────────────────────────────────────────────────

interface ViewerViewProps {
  attrs: QuestionChoiceAttrs;
}

function ViewerView({ attrs }: ViewerViewProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {/* Question text */}
      <p className="text-sm font-semibold text-gray-900">
        {attrs.question || (
          <span className="italic text-gray-400">No question set</span>
        )}
      </p>

      {/* Choice list */}
      <div className="flex flex-col gap-2">
        {attrs.choices.map((choice, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={[
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                isSelected
                  ? "border-violet-400 bg-violet-50 text-violet-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
              ].join(" ")}
            >
              {/* Radio dot */}
              <span
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition",
                  isSelected ? "border-violet-500" : "border-gray-300",
                ].join(" ")}
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                )}
              </span>
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main NodeView Component ───────────────────────────────────────────────────

export default function QuestionChoiceView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const isEditable = editor.isEditable;

  // ── Local state ─────────────────────────────────────────────────────────────
  // We keep local state so inputs feel instant while the user types.
  // We only flush to Tiptap (updateAttributes) on blur — not on every keystroke.
  // Flushing on every keystroke fires a transaction per character which causes
  // the cursor to jump back to the start of the input.
  const [localQuestion, setLocalQuestion] = useState<string>(
    node.attrs.question,
  );
  const [localChoices, setLocalChoices] = useState<string[]>(
    node.attrs.choices,
  );

  // Combine question + choices into one updateAttributes call so Tiptap
  // records them as a single undo-able transaction.
  const flush = useCallback(
    (question: string, choices: string[]) => {
      updateAttributes({ question, choices });
    },
    [updateAttributes],
  );

  const handleUpdateQuestion = useCallback((value: string) => {
    setLocalQuestion(value);
  }, []);

  const handleUpdateChoice = useCallback((index: number, value: string) => {
    setLocalChoices((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleAddChoice = useCallback(() => {
    const next = [...localChoices, `Option ${localChoices.length + 1}`];
    setLocalChoices(next);
    updateAttributes({ question: localQuestion, choices: next });
  }, [localChoices, localQuestion, updateAttributes]);

  const handleRemoveChoice = useCallback(
    (index: number) => {
      const next = localChoices.filter((_, i) => i !== index);
      setLocalChoices(next);
      updateAttributes({ question: localQuestion, choices: next });
    },
    [localChoices, localQuestion, updateAttributes],
  );

  const handleFlush = useCallback(() => {
    flush(localQuestion, localChoices);
  }, [localQuestion, localChoices, flush]);

  // ── Render ──────────────────────────────────────────────────────────────────
  // IMPORTANT — structure notes:
  //
  // 1. NodeViewWrapper is mandatory as the root. It automatically sets
  //    contenteditable="false" on its DOM element, which is what stops
  //    ProseMirror from treating the contents as editable text.
  //
  // 2. The inner div has onMouseDown={e => e.stopPropagation()}.
  //    This is a safety net: if ProseMirror tries to intercept the mousedown
  //    to select the node, we stop it before it reaches the editor view.
  //    Without this, clicking an input can sometimes still trigger node selection.
  //
  // 3. We do NOT use e.preventDefault() on mousedown — that would break
  //    native input focus.

  return (
    <NodeViewWrapper>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="my-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
      >
        {/* Block header */}
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3 w-3 text-violet-600"
            >
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 0 0 1.5h.25v2.25h-.25a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5H9.5V5.25a.75.75 0 0 0-.75-.75h-1.5Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {isEditable ? "Choice question — creator" : "Choice question"}
          </span>
        </div>

        {/* Mode-specific content */}
        {isEditable ? (
          <CreatorView
            attrs={{ question: localQuestion, choices: localChoices }}
            onUpdateQuestion={handleUpdateQuestion}
            onUpdateChoice={handleUpdateChoice}
            onAddChoice={handleAddChoice}
            onRemoveChoice={handleRemoveChoice}
            onFlush={handleFlush}
          />
        ) : (
          <ViewerView attrs={node.attrs as QuestionChoiceAttrs} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
