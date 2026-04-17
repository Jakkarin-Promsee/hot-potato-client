import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useAnswerStore } from "@/stores/content-answer.store";
import { requestQuestionFeedback } from "./questionFeedbackApi";
import { Check, Eye, EyeOff, HelpCircle, SquareDashedMousePointer, X } from "lucide-react";
import type { QuestionBlankWriteAttrs } from "./QuestionBlankWriteNode";

interface BlockAnswer {
  inputs: string[];
  submitted: boolean;
  aiFeedback?: string;
}

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

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Supports both:
// - New: [Q-0], [Q-1], ...
// - Legacy: {{0}}, {{1}}, ...
const BLANK_TOKEN_REGEX = /\[Q-(\d+)\]|\{\{(\d+)\}\}/g;

const getBlankIndices = (template: string): number[] => {
  const unique = new Set<number>();
  let match: RegExpExecArray | null = null;
  while ((match = BLANK_TOKEN_REGEX.exec(template)) !== null) {
    const idx = match[1] ?? match[2];
    unique.add(Number(idx));
  }
  return [...unique].sort((a, b) => a - b);
};

const buildAnswers = (
  prevTemplate: string,
  prevAnswers: string[],
  nextTemplate: string,
) => {
  const prevIndices = getBlankIndices(prevTemplate);
  const nextIndices = getBlankIndices(nextTemplate);

  const prevMap = new Map<number, string>();
  prevIndices.forEach((blankTokenIdx, i) => {
    prevMap.set(blankTokenIdx, prevAnswers[i] ?? "");
  });

  return nextIndices.map((blankTokenIdx) => prevMap.get(blankTokenIdx) ?? "");
};

const renderTemplatePieces = (template: string) => {
  const pieces: Array<{ text?: string; blank?: number }> = [];
  let last = 0;
  let match: RegExpExecArray | null = null;
  while ((match = BLANK_TOKEN_REGEX.exec(template)) !== null) {
    if (match.index > last) {
      pieces.push({ text: template.slice(last, match.index) });
    }
    const idx = match[1] ?? match[2];
    pieces.push({ blank: Number(idx) });
    last = BLANK_TOKEN_REGEX.lastIndex;
  }
  if (last < template.length) {
    pieces.push({ text: template.slice(last) });
  }
  return pieces;
};

interface CreatorViewProps {
  initialTemplate: string;
  initialBlankAnswers: string[];
  onFlush: (template: string, blankAnswers: string[]) => void;
}

function CreatorView({
  initialTemplate,
  initialBlankAnswers,
  onFlush,
}: CreatorViewProps) {
  const [template, setTemplate] = useState(initialTemplate);
  const [blankAnswers, setBlankAnswers] = useState(initialBlankAnswers);
  const templateRef = useAutoGrow(template);

  useEffect(() => setTemplate(initialTemplate), [initialTemplate]);
  useEffect(() => setBlankAnswers(initialBlankAnswers), [initialBlankAnswers]);

  const indices = useMemo(() => getBlankIndices(template), [template]);

  const flush = useCallback(
    (nextTemplate: string, nextAnswers: string[]) => {
      const fixedAnswers = buildAnswers(template, nextAnswers, nextTemplate);
      onFlush(nextTemplate, fixedAnswers);
    },
    [onFlush, template],
  );

  const insertTokenAtCursor = useCallback(
    (token: string) => {
      const el = templateRef.current;
      const start = el?.selectionStart ?? template.length;
      const end = el?.selectionEnd ?? template.length;
      const nextTemplate = `${template.slice(0, start)}${token}${template.slice(end)}`;
      const nextAnswers = buildAnswers(template, blankAnswers, nextTemplate);

      setTemplate(nextTemplate);
      setBlankAnswers(nextAnswers);

      requestAnimationFrame(() => {
        const nextPos = start + token.length;
        if (!templateRef.current) return;
        templateRef.current.focus();
        templateRef.current.setSelectionRange(nextPos, nextPos);
      });
    },
    [templateRef, template, blankAnswers],
  );

  const handleAddBlank = useCallback(() => {
    const maxIdx = indices.length ? Math.max(...indices) : -1;
    const nextIdx = maxIdx + 1;
    insertTokenAtCursor(`[Q-${nextIdx}]`);
  }, [indices, insertTokenAtCursor]);

  const previewPieces = useMemo(() => renderTemplatePieces(template), [template]);

  return (
    <div className="flex flex-col gap-3" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddBlank}
          className="rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
        >
          Add blank
        </button>

        <span className="text-[11px] text-gray-400">
          Tip: click inside the text, then press “Add blank”.
        </span>

        {indices.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {indices.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertTokenAtCursor(`[Q-${i}]`)}
                className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 transition hover:border-violet-300 hover:text-violet-700"
                title="Insert this blank token at cursor"
              >
                {`[Q-${i}]`}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        ref={templateRef}
        rows={2}
        value={template}
        placeholder="Type your sentence here, then use “Add blank” to insert [Q-0], [Q-1], ..."
        onChange={(e) => {
          const nextTemplate = e.target.value;
          const nextAnswers = buildAnswers(template, blankAnswers, nextTemplate);
          setTemplate(nextTemplate);
          setBlankAnswers(nextAnswers);
        }}
        onBlur={() => flush(template, blankAnswers)}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Preview
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-900">
          {previewPieces.map((piece, idx) =>
            piece.text !== undefined ? (
              <span key={`pt-${idx}`} className="whitespace-pre-wrap">
                {piece.text}
              </span>
            ) : (
              <span
                key={`pb-${idx}`}
                className="inline-flex min-w-16 items-center justify-center rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
              >
                Blank {piece.blank}
              </span>
            ),
          )}
        </div>
      </div>

      {indices.length === 0 ? (
        <p className="text-xs text-amber-600">
          Add at least one blank using the “Add blank” button.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {indices.map((blankIdx, i) => (
            <input
              key={blankIdx}
              type="text"
              value={blankAnswers[i] ?? ""}
              placeholder={`Answer for blank [Q-${blankIdx}]`}
              onChange={(e) => {
                const next = [...blankAnswers];
                next[i] = e.target.value;
                setBlankAnswers(next);
              }}
              onBlur={() => flush(template, blankAnswers)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ViewerView({ attrs }: { attrs: QuestionBlankWriteAttrs }) {
  const { id: blockId, template, blankAnswers } = attrs;
  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);

  const blankIndices = useMemo(() => getBlankIndices(template), [template]);
  const pieces = useMemo(() => renderTemplatePieces(template), [template]);
  const blankPosByToken = useMemo(() => {
    const m = new Map<number, number>();
    blankIndices.forEach((tokenIdx, pos) => m.set(tokenIdx, pos));
    return m;
  }, [blankIndices]);

  const saved = answers[blockId] as BlockAnswer | undefined;
  const [inputs, setInputs] = useState<string[]>(
    saved?.inputs ?? blankAnswers.map(() => ""),
  );
  const [submitted, setSubmitted] = useState<boolean>(saved?.submitted ?? false);
  const [aiFeedback, setAiFeedback] = useState<string>(saved?.aiFeedback ?? "");
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  useEffect(() => {
    const next = saved?.inputs ?? blankAnswers.map(() => "");
    setInputs(blankAnswers.map((_, i) => next[i] ?? ""));
    setSubmitted(saved?.submitted ?? false);
    setAiFeedback(saved?.aiFeedback ?? "");
  }, [answers[blockId], blankAnswers]);

  const hasInput = inputs.some((v) => v.trim().length > 0);
  const isCorrectList = blankAnswers.map(
    (ans, i) => normalize(inputs[i] ?? "") === normalize(ans),
  );
  const isAllCorrect = submitted && isCorrectList.every(Boolean);

  const updateInput = (i: number, value: string) => {
    const next = [...inputs];
    next[i] = value;
    setInputs(next);
    setAnswer(blockId, { inputs: next, submitted: false, aiFeedback: "" });
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    setAiFeedback("");
    setAnswer(blockId, { inputs, submitted: true, aiFeedback: "" });

    setIsFeedbackLoading(true);
    try {
      const totalBlanks = blankAnswers.length;
      const matchedCount = isCorrectList.filter(Boolean).length;
      const accuracyPercent =
        totalBlanks > 0 ? Math.round((matchedCount / totalBlanks) * 100) : 0;
      const evaluationLevel =
        accuracyPercent === 100
          ? "correct"
          : accuracyPercent >= 60
            ? "almost"
            : "incorrect";
      const correctAnswer = blankAnswers
        .map((value, idx) => `[Q-${blankIndices[idx] ?? idx}] = ${value}`)
        .join(" | ");
      const userAnswer = inputs
        .map(
          (value, idx) =>
            `[Q-${blankIndices[idx] ?? idx}] = ${value.trim() || "(empty)"}`,
        )
        .join(" | ");
      const diagnostics = blankAnswers
        .map((correct, i) => {
          if (isCorrectList[i]) return "";
          const token = blankIndices[i] ?? i;
          const user = inputs[i]?.trim() || "(empty)";
          return `[Q-${token}] expected="${correct}" got="${user}"`;
        })
        .filter(Boolean)
        .join(" ; ");

      const feedback = await requestQuestionFeedback({
        question: template || "Fill blank write question",
        correctAnswer,
        userAnswer,
        evaluationLevel,
        accuracyPercent,
        diagnostics,
      });
      setAiFeedback(feedback);
      setAnswer(blockId, { inputs, submitted: true, aiFeedback: feedback });
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const handleReset = () => {
    const empty = blankAnswers.map(() => "");
    setInputs(empty);
    setSubmitted(false);
    setAiFeedback("");
    setAnswer(blockId, { inputs: empty, submitted: false, aiFeedback: "" });
  };

  if (blankIndices.length === 0) {
    return <p className="text-sm italic text-gray-400">No blanks configured.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-900">
        {pieces.map((piece, idx) =>
          piece.text !== undefined ? (
            <span key={`t-${idx}`} className="whitespace-pre-wrap">
              {piece.text}
            </span>
          ) : (
            (() => {
              const tokenIdx = piece.blank ?? 0;
              const pos = blankPosByToken.get(tokenIdx) ?? 0;
              return (
                <input
                  key={`b-${idx}`}
                  type="text"
                  disabled={submitted}
                  value={inputs[pos] ?? ""}
                  onChange={(e) => updateInput(pos, e.target.value)}
                  className={[
                    "min-w-28 rounded border px-2 py-1 text-sm outline-none transition",
                    submitted
                      ? isCorrectList[pos]
                        ? "border-green-400 bg-green-50 text-green-900"
                        : "border-red-400 bg-red-50 text-red-900"
                      : "border-gray-300 bg-white text-gray-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
                  ].join(" ")}
                  placeholder={`[Q-${tokenIdx}]`}
                />
              );
            })()
          ),
        )}
      </div>

      {submitted && (
        <div className="flex flex-col gap-1">
          {blankAnswers.map((correct, i) => (
            <p
              key={i}
              className={[
                "flex items-center gap-1 text-xs",
                isCorrectList[i] ? "text-green-600" : "text-red-500",
              ].join(" ")}
            >
              {isCorrectList[i] ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Blank {"{{"}
              {i}
              {"}}"}: {isCorrectList[i] ? "Correct" : `Expected "${correct}"`}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!hasInput}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        ) : (
          <>
            <span
              className={[
                "text-xs font-semibold",
                isAllCorrect ? "text-green-600" : "text-red-500",
              ].join(" ")}
            >
              {isAllCorrect ? "All blanks are correct." : "Some blanks are not correct."}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto text-xs text-gray-400 underline transition hover:text-gray-600"
            >
              Try again
            </button>
          </>
        )}
      </div>
      {submitted && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            AI feedback
          </p>
          <p className="mt-1 text-sm text-violet-900">
            {isFeedbackLoading
              ? "AI กำลังเขียนคำแนะนำแบบละเอียดให้..."
              : aiFeedback || "ยังไม่มีคำแนะนำ"}
          </p>
        </div>
      )}
    </div>
  );
}

export default function QuestionBlankWriteView({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const isEditable = editor.isEditable;
  const attrs = node.attrs as QuestionBlankWriteAttrs;
  const [previewMode, setPreviewMode] = useState(false);

  const handleFlush = useCallback(
    (template: string, blankAnswers: string[]) => {
      updateAttributes({ template, blankAnswers });
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
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-100">
            <HelpCircle className="h-3 w-3 text-violet-600" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {isEditable
              ? previewMode
                ? "Fill blank (write) - preview"
                : "Fill blank (write) - creator"
              : "Fill blank (write)"}
          </span>

          {isEditable && (
            <div className="ml-auto flex items-center gap-1">
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
                aria-label={previewMode ? "Switch to creator" : "Preview as viewer"}
              >
                {previewMode ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>

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
            initialTemplate={attrs.template}
            initialBlankAnswers={attrs.blankAnswers}
            onFlush={handleFlush}
          />
        ) : (
          <ViewerView attrs={attrs} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
