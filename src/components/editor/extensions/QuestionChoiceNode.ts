import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import QuestionChoiceView, { type Choice } from "./QuestionChoiceView";
import {
  DEFAULT_QUESTION_FEEDBACK_MODE,
  type QuestionFeedbackMode,
} from "./questionMode";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionChoiceAttrs {
  id: string;
  question: string;
  choices: Choice[];
  answerType: "single" | "multi";
  feedbackMode: QuestionFeedbackMode;
}

// ─── Node Definition ──────────────────────────────────────────────────────────

export const QuestionChoiceNode = Node.create({
  name: "QuestionChoice",

  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  // ─── Attributes ────────────────────────────────────────────────────────────

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-id"),
        renderHTML: (attrs) => ({ "data-id": attrs.id }),
      },

      question: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-question") ?? "",
        renderHTML: (attrs) => ({ "data-question": attrs.question }),
      },

      choices: {
        default: [
          { text: "Option 1", correct: false },
          { text: "Option 2", correct: false },
        ] satisfies Choice[],
        parseHTML: (el) => {
          try {
            return JSON.parse(
              el.getAttribute("data-choices") ?? "[]",
            ) as Choice[];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-choices": JSON.stringify(attrs.choices),
        }),
      },

      answerType: {
        default: "single" as const,
        parseHTML: (el) =>
          (el.getAttribute("data-answer-type") ?? "single") as
            | "single"
            | "multi",
        renderHTML: (attrs) => ({ "data-answer-type": attrs.answerType }),
      },

      feedbackMode: {
        default: DEFAULT_QUESTION_FEEDBACK_MODE,
        parseHTML: (el) =>
          (el.getAttribute("data-feedback-mode") ??
            DEFAULT_QUESTION_FEEDBACK_MODE) as QuestionFeedbackMode,
        renderHTML: (attrs) => ({ "data-feedback-mode": attrs.feedbackMode }),
      },
    };
  },

  // ─── HTML serialisation ────────────────────────────────────────────────────

  parseHTML() {
    return [{ tag: 'div[data-type="choice-question"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "choice-question" }),
    ];
  },

  // ─── Node View ─────────────────────────────────────────────────────────────

  addNodeView() {
    return ReactNodeViewRenderer(QuestionChoiceView);
  },

  // ─── Commands ──────────────────────────────────────────────────────────────

  addCommands() {
    return {
      insertQuestionChoice:
        () =>
        ({ commands }) => {
          return commands.insertContent([
            {
              type: this.name,
              attrs: {
                id: crypto.randomUUID(),
                question: "",
                choices: [
                  { text: "Option 1", correct: false },
                  { text: "Option 2", correct: false },
                ],
                answerType: "single",
                feedbackMode: DEFAULT_QUESTION_FEEDBACK_MODE,
              } satisfies QuestionChoiceAttrs,
            },
            { type: "paragraph" },
          ]);
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    QuestionChoice: {
      insertQuestionChoice: () => ReturnType;
    };
  }
}
