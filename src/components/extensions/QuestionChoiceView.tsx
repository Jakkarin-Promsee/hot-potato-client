import { useState, useCallback, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  Minus,
  Plus,
  HelpCircle,
  SquareDashedMousePointer,
} from "lucide-react";

// ─── Auto-grow hook ───────────────────────────────────────────────────────────
// Resizes a textarea to fit its content so it never scrolls horizontally or
// clips text — it just grows downward instead.

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Typing / undo-redo: resize whenever value changes.
  useEffect(resize, [value, resize]);

  // Mount: defer to after the browser has painted so scrollHeight is accurate.
  useEffect(() => {
    const raf = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionChoiceAttrs {
  question: string;
  choices: string[];
}

// ─── Choice Input ─────────────────────────────────────────────────────────────
// Extracted so useAutoGrow (a hook) is always called at the top level — never
// conditionally inside a .map().

interface ChoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onRemove?: () => void;
}

function ChoiceInput({ value, onChange, onBlur, onRemove }: ChoiceInputProps) {
  const ref = useAutoGrow(value);
  return (
    <div className="flex items-start gap-2">
      <span className="mt-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-gray-300" />
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="flex-1 resize-none overflow-hidden rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label="Remove choice"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Creator Mode ─────────────────────────────────────────────────────────────

interface CreatorViewProps {
  // Initial values only — CreatorView owns its own input state.
  // The parent is only called on blur (flush) or on structural changes
  // (add/remove choice), never on every keystroke.
  initialQuestion: string;
  initialChoices: string[];
  onFlush: (question: string, choices: string[]) => void;
  onAddChoice: (question: string, choices: string[]) => void;
  onRemoveChoice: (index: number, question: string, choices: string[]) => void;
}

function CreatorView({
  initialQuestion,
  initialChoices,
  onFlush,
  onAddChoice,
  onRemoveChoice,
}: CreatorViewProps) {
  // Local state lives here — typing never triggers a re-render in the parent.
  const [question, setQuestion] = useState(initialQuestion);
  const [choices, setChoices] = useState(initialChoices);
  const questionRef = useAutoGrow(question);

  // Re-sync when the parent pushes new values (undo/redo).
  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);
  useEffect(() => {
    setChoices(initialChoices);
  }, [initialChoices]);

  const handleAddChoice = () => {
    const next = [...choices, `Option ${choices.length + 1}`];
    setChoices(next);
    onAddChoice(question, next);
  };

  const handleRemoveChoice = (index: number) => {
    const next = choices.filter((_, i) => i !== index);
    setChoices(next);
    onRemoveChoice(index, question, next);
  };

  return (
    <div
      className="flex flex-col gap-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Question input */}
      <textarea
        ref={questionRef}
        rows={1}
        value={question}
        placeholder="Type your question here…"
        onChange={(e) => setQuestion(e.target.value)}
        onBlur={() => onFlush(question, choices)}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {/* Choice list */}
      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => (
          <ChoiceInput
            key={i}
            value={choice}
            onChange={(val) => {
              const next = [...choices];
              next[i] = val;
              setChoices(next);
            }}
            onBlur={() => onFlush(question, choices)}
            onRemove={
              choices.length > 1 ? () => handleRemoveChoice(i) : undefined
            }
          />
        ))}
      </div>

      {/* Add choice button */}
      <button
        type="button"
        onClick={handleAddChoice}
        className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
      >
        <Plus className="h-3.5 w-3.5" />
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
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const isEditable = editor.isEditable;

  // The parent no longer tracks input text — CreatorView owns that state.
  // The parent only calls updateAttributes when CreatorView signals a flush
  // (on blur) or a structural change (add/remove choice).
  // This means typing never causes a re-render here.

  // Combine question + choices into one updateAttributes call so Tiptap
  // records them as a single undo-able transaction.
  const handleFlush = useCallback(
    (question: string, choices: string[]) => {
      updateAttributes({ question, choices });
    },
    [updateAttributes],
  );

  const handleAddChoice = useCallback(
    (question: string, choices: string[]) => {
      updateAttributes({ question, choices });
    },
    [updateAttributes],
  );

  const handleRemoveChoice = useCallback(
    (_index: number, question: string, choices: string[]) => {
      updateAttributes({ question, choices });
    },
    [updateAttributes],
  );

  // Manually select this node in ProseMirror when the wrapper background is clicked.
  const selectNode = useCallback(() => {
    if (typeof getPos !== "function") return;

    const pos = getPos();
    const nodeSelection = NodeSelection.create(editor.state.doc, pos as number);
    editor.view.dispatch(editor.state.tr.setSelection(nodeSelection));

    // Restore focus so the cursor remains visible.
    setTimeout(() => {
      editor.view.focus();
    }, 0);
  }, [getPos, editor]);

  // ── Render ──────────────────────────────────────────────────────────────────
  // Structure notes:
  //
  // 1. NodeViewWrapper is mandatory as the root. It automatically sets
  //    contenteditable="false" on its DOM element, preventing ProseMirror
  //    from treating the contents as editable text.
  //
  // 2. The inner div intercepts onMouseDown on the background only. This stops
  //    ProseMirror from hijacking the click for node selection while still
  //    allowing native input focus to work correctly (no preventDefault).

  return (
    <NodeViewWrapper>
      <div
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectNode();
        }}
        className={`my-3 rounded-xl border bg-gray-50 p-4 ${
          selected ? "" : "border-accent-foreground shadow-md"
        }`}
      >
        {/* Block header */}
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-100">
            <HelpCircle className="h-3 w-3 text-violet-600" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {isEditable ? "Choice question — creator" : "Choice question"}
          </span>

          {/* Select-block button — only in editable mode */}
          {isEditable && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                selectNode();
              }}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded text-gray-300 transition hover:bg-violet-100 hover:text-violet-500"
              aria-label="Select block"
            >
              <SquareDashedMousePointer className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mode-specific content */}
        {isEditable ? (
          <CreatorView
            initialQuestion={node.attrs.question}
            initialChoices={node.attrs.choices}
            onFlush={handleFlush}
            onAddChoice={handleAddChoice}
            onRemoveChoice={handleRemoveChoice}
          />
        ) : (
          <ViewerView attrs={node.attrs as QuestionChoiceAttrs} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
