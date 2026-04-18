import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useAnswerStore } from "@/stores/content-answer.store";
import api from "@/lib/axios";
import {
  Bot,
  SendHorizontal,
  SquareDashedMousePointer,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { QuestionAgentAttrs } from "./QuestionAgentNode";
import {
  buildQuestionAgentUserContext,
  getQuestionAgentContextAbove,
} from "./questionAgentContext";

export interface ChatMessage {
  question: string;
  answer: string;
  createdAt: string;
}

interface BlockAnswer {
  chatHistory: ChatMessage[];
  collapsed: boolean;
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

const buildFallbackReply = (question: string) =>
  `I couldn't get an AI response right now. Your question was: "${question}". Please try again.`;

async function askAi(
  question: string,
  context: string,
  userContext: string,
): Promise<string> {
  try {
    const response = await api.post<{ answer?: string }>("/chat/ask", {
      prompt: question,
      context,
      userContext,
    });

    const answer = response.data?.answer?.trim();
    if (!answer) return buildFallbackReply(question);
    return answer;
  } catch {
    return buildFallbackReply(question);
  }
}

export default function QuestionAgentView({
  node,
  selected,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as QuestionAgentAttrs;
  const isEditable = editor.isEditable;
  const blockId = attrs.id as string;

  const answers = useAnswerStore((s) => s.answers);
  const setAnswer = useAnswerStore((s) => s.setAnswer);
  const savedAnswer = answers[blockId] as BlockAnswer | undefined;

  const [title, setTitle] = useState(attrs.title ?? "Ask AI");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(
    savedAnswer?.chatHistory ?? attrs.chatHistory ?? [],
  );
  const [collapsed, setCollapsed] = useState<boolean>(
    savedAnswer?.collapsed ?? attrs.collapsed ?? true,
  );
  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const inputRef = useAutoGrow(questionInput);
  const hasAsked = chatHistory.length > 0;

  useEffect(() => setTitle(attrs.title ?? "Ask AI"), [attrs.title]);
  useEffect(() => {
    if (!savedAnswer) return;
    setChatHistory(savedAnswer.chatHistory ?? []);
    setCollapsed(savedAnswer.collapsed ?? true);
  }, [answers[blockId]]);

  const latestMessage = useMemo(
    () => (chatHistory.length ? chatHistory[chatHistory.length - 1] : null),
    [chatHistory],
  );

  const commit = useCallback(
    (next: Partial<QuestionAgentAttrs>) => {
      updateAttributes(next);
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

  const handleAsk = async () => {
    const question = questionInput.trim();
    if (!question || isAsking) return;

    setIsAsking(true);
    try {
      const context = getQuestionAgentContextAbove(editor, getPos);
      const userContext = buildQuestionAgentUserContext(
        answers,
        blockId,
        chatHistory,
      );
      const answer = await askAi(question, context, userContext);
      const nextHistory = [
        ...chatHistory,
        { question, answer, createdAt: new Date().toISOString() },
      ];
      setChatHistory(nextHistory);
      setQuestionInput("");
      // Enter special mode automatically after first question.
      setCollapsed(false);
      setAnswer(blockId, { chatHistory: nextHistory, collapsed: false });
    } finally {
      setIsAsking(false);
    }
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    setAnswer(blockId, { chatHistory, collapsed: next });
  };

  const clearHistory = () => {
    setChatHistory([]);
    setCollapsed(true);
    setAnswer(blockId, { chatHistory: [], collapsed: true });
  };

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
              <Bot className="h-3 w-3 text-violet-600" />
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => commit({ title })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-40 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 outline-none focus:border-violet-200 focus:bg-white"
            />

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
          </div>
        )}

        {!hasAsked ? (
          <div className="flex items-start gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={questionInput}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleAsk();
                }
              }}
              placeholder="Ask AI something..."
              className="flex-1 resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => void handleAsk()}
              disabled={isAsking || !questionInput.trim()}
              className="flex h-9 items-center gap-1 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal className="h-3.5 w-3.5" />
              Ask
            </button>
          </div>
        ) : !collapsed ? (
          <div className="flex flex-col gap-3">
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
              {chatHistory.map((msg, i) => (
                <div key={`${msg.createdAt}-${i}`} className="space-y-1">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-3 py-2 text-base text-violet-900 shadow-sm">
                      {msg.question}
                    </div>
                  </div>
                  <div className="flex justify-start -mt-1">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-800 shadow-sm">
                      {msg.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={questionInput}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleAsk();
                  }
                }}
                placeholder="Ask AI something..."
                className="flex-1 resize-none overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => void handleAsk()}
                disabled={isAsking || !questionInput.trim()}
                className="flex h-9 items-center gap-1 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendHorizontal className="h-3.5 w-3.5" />
                Ask
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            {latestMessage ? (
              <div className="space-y-1.5">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-3 py-2 text-base text-violet-900 shadow-sm">
                    {latestMessage.question}
                  </p>
                </div>
                <div className="flex justify-start -mt-1">
                  <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-800 shadow-sm">
                    {latestMessage.answer}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">
                No chat yet. Expand to ask AI.
              </p>
            )}
          </div>
        )}

        {hasAsked && (
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={toggleCollapsed}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 underline transition hover:text-gray-700"
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show chat
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Hide chat
                </>
              )}
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={clearHistory}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-400 underline transition hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear history
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
