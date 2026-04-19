import { useState, useCallback, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useAnswerStore } from "@/stores/content-answer.store";
import {
  Eye,
  EyeOff,
  HelpCircle,
  SquareDashedMousePointer,
} from "lucide-react";
import FeedbackDiscussionPanel, {
  type FeedbackThreadMessage,
} from "./FeedbackDiscussionPanel";
import QuestionFeedbackModeToggle from "./QuestionFeedbackModeToggle";
import type { QuestionFeedbackMode } from "./questionMode";
import {
  requestFeedbackFollowup,
  requestWriteEvaluation,
} from "./questionFeedbackApi";
import BlockMoveControls from "./BlockMoveControls";

export interface QuestionWriteAttrs {
  id: string;
  question: string;
  answer: string;
  feedbackMode: QuestionFeedbackMode;
}

interface BlockAnswer {
  answer: string;
  submitted: boolean;
  aiFeedback?: string;
  feedbackThread?: FeedbackThreadMessage[];
  threadOpen?: boolean;
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

interface CreatorViewProps {
  initialQuestion: string;
  initialAnswer: string;
  initialFeedbackMode: QuestionFeedbackMode;
  onFlush: (
    question: string,
    answer: string,
    feedbackMode: QuestionFeedbackMode,
  ) => void;
}

function CreatorView({
  initialQuestion,
  initialAnswer,
  initialFeedbackMode,
  onFlush,
}: CreatorViewProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [feedbackMode, setFeedbackMode] = useState<QuestionFeedbackMode>(
    initialFeedbackMode,
  );
  const questionRef = useAutoGrow(question);
  const answerRef = useAutoGrow(answer);

  useEffect(() => setQuestion(initialQuestion), [initialQuestion]);
  useEffect(() => setAnswer(initialAnswer), [initialAnswer]);
  useEffect(() => setFeedbackMode(initialFeedbackMode), [initialFeedbackMode]);

  return (
    <div
      className="flex flex-col gap-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <QuestionFeedbackModeToggle
        mode={feedbackMode}
        onChange={(nextMode) => {
          setFeedbackMode(nextMode);
          onFlush(question, answer, nextMode);
        }}
      />

      <textarea
        ref={questionRef}
        rows={1}
        value={question}
        placeholder="Type your writing question here..."
        onChange={(e) => setQuestion(e.target.value)}
        onBlur={() => onFlush(question, answer, feedbackMode)}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      <textarea
        ref={answerRef}
        rows={1}
        value={answer}
        placeholder="Set the correct writing answer..."
        onChange={(e) => setAnswer(e.target.value)}
        onBlur={() => onFlush(question, answer, feedbackMode)}
        className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}

interface ViewerViewProps {
  attrs: QuestionWriteAttrs;
}

function ViewerView({ attrs }: ViewerViewProps) {
  const { id: blockId, question, answer, feedbackMode } = attrs;
  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);

  const savedAnswer = answers[blockId] as BlockAnswer | undefined;
  const [input, setInput] = useState(savedAnswer?.answer ?? "");
  const [submitted, setSubmitted] = useState(savedAnswer?.submitted ?? false);
  const [aiFeedback, setAiFeedback] = useState(savedAnswer?.aiFeedback ?? "");
  const [threadOpen, setThreadOpen] = useState(savedAnswer?.threadOpen ?? false);
  const [feedbackThread, setFeedbackThread] = useState<FeedbackThreadMessage[]>(
    savedAnswer?.feedbackThread ?? [],
  );
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const inputRef = useAutoGrow(input);

  const persistAnswer = useCallback(
    (next: Partial<BlockAnswer>) => {
      setAnswer(blockId, {
        answer: input,
        submitted,
        aiFeedback,
        feedbackThread,
        threadOpen,
        ...next,
      });
    },
    [aiFeedback, blockId, feedbackThread, input, setAnswer, submitted, threadOpen],
  );

  useEffect(() => {
    if (!savedAnswer) return;
    setInput(savedAnswer.answer ?? "");
    setSubmitted(savedAnswer.submitted ?? false);
    setAiFeedback(savedAnswer.aiFeedback ?? "");
    setFeedbackThread(savedAnswer.feedbackThread ?? []);
    setThreadOpen(savedAnswer.threadOpen ?? false);
  }, [answers[blockId]]);

  const canSubmit = input.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitted(true);
    setAiFeedback("");
    setFeedbackThread([]);
    setThreadOpen(false);
    persistAnswer({
      answer: input,
      submitted: true,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
    });

    setIsEvaluating(true);
    try {
      const feedback = await requestWriteEvaluation({
        question: question || "Writing question",
        guideAnswer: answer,
        studentAnswer: input,
        feedbackMode,
      });
      setAiFeedback(feedback);
      persistAnswer({
        answer: input,
        submitted: true,
        aiFeedback: feedback,
        feedbackThread: [],
        threadOpen: false,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setInput("");
    setSubmitted(false);
    setAiFeedback("");
    setThreadOpen(false);
    setFeedbackThread([]);
    persistAnswer({
      answer: "",
      submitted: false,
      aiFeedback: "",
      feedbackThread: [],
      threadOpen: false,
    });
  };

  const handleSendThreadMessage = useCallback(
    async (message: string) => {
      if (!aiFeedback.trim()) return;
      const studentMessage: FeedbackThreadMessage = {
        role: "student",
        text: message,
        createdAt: new Date().toISOString(),
      };
      const threadWithStudent = [...feedbackThread, studentMessage];
      setFeedbackThread(threadWithStudent);
      persistAnswer({ feedbackThread: threadWithStudent, threadOpen: true });

      setIsThreadLoading(true);
      try {
        const aiReply = await requestFeedbackFollowup({
          topic: question || "Writing question",
          studentAnswer: input,
          initialFeedback: aiFeedback,
          followupQuestion: message,
          expectedAnswer: answer,
          feedbackMode,
          thread: threadWithStudent.map((entry) => ({
            role: entry.role,
            text: entry.text,
          })),
        });
        const aiMessage: FeedbackThreadMessage = {
          role: "ai",
          text: aiReply,
          createdAt: new Date().toISOString(),
        };
        const nextThread = [...threadWithStudent, aiMessage];
        setFeedbackThread(nextThread);
        persistAnswer({ feedbackThread: nextThread, threadOpen: true });
      } finally {
        setIsThreadLoading(false);
      }
    },
    [aiFeedback, answer, feedbackMode, feedbackThread, input, persistAnswer, question],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-gray-900">
        {question || (
          <span className="italic text-gray-400">No question set</span>
        )}
      </p>

      <textarea
        ref={inputRef}
        rows={2}
        disabled={submitted}
        value={input}
        placeholder="Write your answer..."
        onChange={(e) => {
          const next = e.target.value;
          setInput(next);
          setAiFeedback("");
          setFeedbackThread([]);
          setThreadOpen(false);
          persistAnswer({
            answer: next,
            submitted: false,
            aiFeedback: "",
            feedbackThread: [],
            threadOpen: false,
          });
        }}
        className={[
          "w-full resize-none overflow-hidden rounded-lg border bg-white px-3 py-2 text-base outline-none transition",
          submitted
            ? "border-violet-300 text-gray-900"
            : "border-gray-200 text-gray-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
        ].join(" ")}
      />

      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-400 underline transition hover:text-gray-600"
            >
              Try again
            </button>
          </>
        )}
      </div>
      {submitted && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            AI deep evaluation
          </p>
          <p className="mt-1 whitespace-pre-wrap text-base text-violet-900">
            {isEvaluating
              ? "AI กำลังวิเคราะห์คำตอบแบบละเอียด..."
              : aiFeedback || "ยังไม่มีผลวิเคราะห์"}
          </p>
        </div>
      )}
      {submitted && aiFeedback && (
        <FeedbackDiscussionPanel
          messages={feedbackThread}
          open={threadOpen}
          loading={isThreadLoading}
          onToggle={() => {
            const next = !threadOpen;
            setThreadOpen(next);
            persistAnswer({ threadOpen: next });
          }}
          onSend={handleSendThreadMessage}
        />
      )}
    </div>
  );
}

export default function QuestionWriteView({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const isEditable = editor.isEditable;
  const attrs = node.attrs as QuestionWriteAttrs;
  const [previewMode, setPreviewMode] = useState(false);

  const handleFlush = useCallback(
    (
      question: string,
      answer: string,
      feedbackMode: QuestionFeedbackMode,
    ) => {
      updateAttributes({ question, answer, feedbackMode });
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
    <NodeViewWrapper className="text-base">
      <div
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectNode();
        }}
        className={`my-3 rounded-xl border bg-gray-50 p-4 ${
          selected ? "" : "border-accent-foreground shadow-md"
        }`}
      >
        {isEditable && (
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-100">
              <HelpCircle className="h-3 w-3 text-violet-600" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {previewMode ? "Writing question - preview" : "Writing question - creator"}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <BlockMoveControls editor={editor} getPos={getPos} />

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
          </div>
        )}

        {isEditable && !previewMode ? (
          <CreatorView
            initialQuestion={attrs.question}
            initialAnswer={attrs.answer}
            initialFeedbackMode={attrs.feedbackMode}
            onFlush={handleFlush}
          />
        ) : (
          <ViewerView attrs={attrs} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
