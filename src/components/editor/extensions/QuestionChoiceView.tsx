import { useState, useCallback, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useAnswerStore } from "@/stores/content-answer.store";

import {
  Minus,
  Plus,
  HelpCircle,
  SquareDashedMousePointer,
  Eye,
  EyeOff,
  Check,
  X,
  Layers,
  CircleDot,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Choice {
  text: string;
  correct: boolean;
}

export interface QuestionChoiceAttrs {
  question: string;
  choices: Choice[];
  answerType: "single" | "multi";
}

// ─── Auto-grow hook ───────────────────────────────────────────────────────────

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(resize, [value, resize]);

  useEffect(() => {
    const raf = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}

// ─── Choice Input (Creator) ───────────────────────────────────────────────────
// Extracted so useAutoGrow is always called at the top level, never in a .map()

interface ChoiceInputProps {
  choice: Choice;
  answerType: "single" | "multi";
  onChange: (text: string) => void;
  onToggleCorrect: () => void;
  onBlur: () => void;
  onRemove?: () => void;
}

function ChoiceInput({
  choice,
  answerType,
  onChange,
  onToggleCorrect,
  onBlur,
  onRemove,
}: ChoiceInputProps) {
  const ref = useAutoGrow(choice.text);

  return (
    <div className="flex items-start gap-2">
      {/* Answer toggle — round for single, square for multi */}
      <button
        type="button"
        onClick={onToggleCorrect}
        aria-label={choice.correct ? "Mark as incorrect" : "Mark as correct"}
        className={[
          "mt-2 flex h-4 w-4 shrink-0 items-center justify-center border-2 transition",
          answerType === "single" ? "rounded-full" : "rounded",
          choice.correct
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300 bg-white hover:border-green-400",
        ].join(" ")}
      >
        {choice.correct && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>

      <textarea
        ref={ref}
        rows={1}
        value={choice.text}
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
  initialQuestion: string;
  initialChoices: Choice[];
  initialAnswerType: "single" | "multi";
  onFlush: (
    question: string,
    choices: Choice[],
    answerType: "single" | "multi",
  ) => void;
  onCommit: (
    question: string,
    choices: Choice[],
    answerType: "single" | "multi",
  ) => void;
}

function CreatorView({
  initialQuestion,
  initialChoices,
  initialAnswerType,
  onFlush,
  onCommit,
}: CreatorViewProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [choices, setChoices] = useState(initialChoices);
  const [answerType, setAnswerType] = useState(initialAnswerType);
  const questionRef = useAutoGrow(question);

  // Re-sync on undo/redo
  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);
  useEffect(() => {
    setChoices(initialChoices);
  }, [initialChoices]);
  useEffect(() => {
    setAnswerType(initialAnswerType);
  }, [initialAnswerType]);

  const flush = () => onFlush(question, choices, answerType);

  const handleToggleAnswerType = () => {
    const next = answerType === "single" ? "multi" : "single";
    // When switching back to single, keep only the first correct answer
    const nextChoices =
      next === "single"
        ? (() => {
            let found = false;
            return choices.map((c) => {
              if (c.correct && !found) {
                found = true;
                return c;
              }
              return { ...c, correct: false };
            });
          })()
        : choices;
    setAnswerType(next);
    setChoices(nextChoices);
    onCommit(question, nextChoices, next);
  };

  const handleToggleCorrect = (index: number) => {
    const next =
      answerType === "single"
        ? choices.map((c, i) => ({ ...c, correct: i === index }))
        : choices.map((c, i) =>
            i === index ? { ...c, correct: !c.correct } : c,
          );
    setChoices(next);
    onCommit(question, next, answerType);
  };

  const handleAddChoice = () => {
    const next = [
      ...choices,
      { text: `Option ${choices.length + 1}`, correct: false },
    ];
    setChoices(next);
    onCommit(question, next, answerType);
  };

  const handleRemoveChoice = (index: number) => {
    const next = choices.filter((_, i) => i !== index);
    setChoices(next);
    onCommit(question, next, answerType);
  };

  return (
    <div
      className="flex flex-col gap-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Answer type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Answer type:</span>
        <button
          type="button"
          onClick={handleToggleAnswerType}
          className={[
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition",
            answerType === "multi"
              ? "border-violet-300 bg-violet-50 text-violet-700"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
          ].join(" ")}
        >
          {answerType === "single" ? (
            <>
              <CircleDot className="h-3 w-3" /> Single correct
            </>
          ) : (
            <>
              <Layers className="h-3 w-3" /> Multiple correct
            </>
          )}
        </button>
      </div>

      {/* Question input */}
      <textarea
        ref={questionRef}
        rows={1}
        value={question}
        placeholder="Type your question here…"
        onChange={(e) => setQuestion(e.target.value)}
        onBlur={flush}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {/* Choice list */}
      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => (
          <ChoiceInput
            key={i}
            choice={choice}
            answerType={answerType}
            onChange={(text) => {
              const next = choices.map((c, ci) =>
                ci === i ? { ...c, text } : c,
              );
              setChoices(next);
            }}
            onToggleCorrect={() => handleToggleCorrect(i)}
            onBlur={flush}
            onRemove={
              choices.length > 1 ? () => handleRemoveChoice(i) : undefined
            }
          />
        ))}
      </div>

      {/* Add choice */}
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

// Each block answer shape
interface BlockAnswer {
  selected: number[]; // chosen indices
  submitted: boolean; // has user submitted?
}

function ViewerView({ attrs }: ViewerViewProps) {
  const { question, choices, answerType } = attrs;
  const blockId = (attrs as any).id as string;

  // ── Store ──────────────────────────────────────────────────────
  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);

  // Restore from store or default
  const savedAnswer = answers[blockId] as BlockAnswer | undefined;
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    savedAnswer?.selected ?? [],
  );
  const [submitted, setSubmitted] = useState<boolean>(
    savedAnswer?.submitted ?? false,
  );

  // ── Sync from store on load (when answers load after component mounts) ──
  useEffect(() => {
    if (savedAnswer) {
      setSelectedIndices(savedAnswer.selected ?? []);
      setSubmitted(savedAnswer.submitted ?? false);
    }
  }, [answers[blockId]]); // re-sync when this block's answer changes

  // ── Helpers ────────────────────────────────────────────────────
  const isSelected = (i: number) => selectedIndices.includes(i);
  const hasSelection = selectedIndices.length > 0;

  const handleSelect = (i: number) => {
    if (submitted) return;

    const next =
      answerType === "single"
        ? [i]
        : isSelected(i)
          ? selectedIndices.filter((s) => s !== i)
          : [...selectedIndices, i];

    setSelectedIndices(next);

    // Save selection instantly (not submitted yet)
    setAnswer(blockId, { selected: next, submitted: false });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    // Save with submitted: true — this triggers 30s sync to DB
    setAnswer(blockId, { selected: selectedIndices, submitted: true });
  };

  const handleReset = () => {
    setSelectedIndices([]);
    setSubmitted(false);
    setAnswer(blockId, { selected: [], submitted: false });
  };

  const isFullyCorrect =
    submitted && choices.every((c, i) => c.correct === isSelected(i));

  // ── Rest of your existing JSX — just replace state references ──
  return (
    <div className="flex flex-col gap-3">
      {/* Question */}
      <p className="text-sm font-semibold text-gray-900">
        {question || (
          <span className="italic text-gray-400">No question set</span>
        )}
      </p>

      {/* Hint */}
      {!submitted && (
        <p className="text-xs text-gray-400">
          {answerType === "multi"
            ? "Select all that apply."
            : "Select one answer."}
        </p>
      )}

      {/* Choices — same as your existing JSX, uses isSelected() */}
      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => {
          const sel = isSelected(i);
          const isCorrectChoice = choice.correct;

          const rowStyle = submitted
            ? sel && isCorrectChoice
              ? "border-green-400 bg-green-50 text-green-900"
              : sel && !isCorrectChoice
                ? "border-red-400 bg-red-50 text-red-900"
                : isCorrectChoice
                  ? "border-green-300 bg-green-50 text-green-800"
                  : "border-gray-200 bg-white text-gray-400"
            : sel
              ? "border-violet-400 bg-violet-50 text-violet-900"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50";

          const indicatorStyle = submitted
            ? sel && isCorrectChoice
              ? "border-green-500 bg-green-500 text-white"
              : sel && !isCorrectChoice
                ? "border-red-500 bg-red-500 text-white"
                : isCorrectChoice
                  ? "border-green-400 bg-green-100 text-green-600"
                  : "border-gray-200"
            : sel
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-gray-300";

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={submitted}
              className={[
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                rowStyle,
                submitted ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center border-2 transition",
                  answerType === "single" ? "rounded-full" : "rounded",
                  indicatorStyle,
                ].join(" ")}
              >
                {submitted ? (
                  (sel && isCorrectChoice) || (!sel && isCorrectChoice) ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : sel && !isCorrectChoice ? (
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : null
                ) : sel ? (
                  answerType === "single" ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  )
                ) : null}
              </span>

              {choice.text}

              {submitted && (
                <span className="ml-auto text-xs font-medium">
                  {sel && isCorrectChoice && (
                    <span className="text-green-600">Correct ✓</span>
                  )}
                  {sel && !isCorrectChoice && (
                    <span className="text-red-500">Wrong ✗</span>
                  )}
                  {!sel && isCorrectChoice && (
                    <span className="text-green-500">Correct answer</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit / result row */}
      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={handleSubmit} // 👈 updated
            disabled={!hasSelection}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        ) : (
          <>
            <span
              className={[
                "text-xs font-semibold",
                isFullyCorrect ? "text-green-600" : "text-red-500",
              ].join(" ")}
            >
              {isFullyCorrect
                ? "🎉 All correct!"
                : "Not quite — review the answers above."}
            </span>
            <button
              type="button"
              onClick={handleReset} // 👈 also resets store
              className="ml-auto text-xs text-gray-400 underline transition hover:text-gray-600"
            >
              Try again
            </button>
          </>
        )}
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
  const attrs = node.attrs as QuestionChoiceAttrs;

  // Local preview toggle — lets the creator peek at the viewer without
  // switching the editor to read-only. Only available in editable mode.
  const [previewMode, setPreviewMode] = useState(false);

  const handleFlush = useCallback(
    (question: string, choices: Choice[], answerType: "single" | "multi") => {
      updateAttributes({ question, choices, answerType });
    },
    [updateAttributes],
  );

  const handleCommit = useCallback(
    (question: string, choices: Choice[], answerType: "single" | "multi") => {
      updateAttributes({ question, choices, answerType });
    },
    [updateAttributes],
  );

  const selectNode = useCallback(() => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    const nodeSelection = NodeSelection.create(editor.state.doc, pos as number);
    editor.view.dispatch(editor.state.tr.setSelection(nodeSelection));
    editor.view.focus();
  }, [getPos, editor]);

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
            {isEditable
              ? previewMode
                ? "Choice question — preview"
                : "Choice question — creator"
              : "Choice question"}
          </span>

          {isEditable && (
            <div className="ml-auto flex items-center gap-1">
              {/* Preview toggle */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setPreviewMode((v) => !v)}
                className={[
                  "flex h-6 w-6 items-center justify-center rounded transition",
                  previewMode
                    ? "bg-violet-100 text-violet-600"
                    : "text-gray-300 hover:bg-violet-100 hover:text-violet-500",
                ].join(" ")}
                aria-label={
                  previewMode ? "Switch to creator" : "Preview as viewer"
                }
              >
                {previewMode ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Select block */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectNode();
                }}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition hover:bg-violet-100 hover:text-violet-500"
                aria-label="Select block"
              >
                <SquareDashedMousePointer className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {isEditable && !previewMode ? (
          <CreatorView
            initialQuestion={attrs.question}
            initialChoices={attrs.choices}
            initialAnswerType={attrs.answerType}
            onFlush={handleFlush}
            onCommit={handleCommit}
          />
        ) : (
          <ViewerView attrs={attrs} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
