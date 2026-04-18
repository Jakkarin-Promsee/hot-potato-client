import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import QuestionWriteView from "./QuestionWriteView";
import { DEFAULT_QUESTION_FEEDBACK_MODE, type QuestionFeedbackMode } from "./questionMode";

export interface QuestionWriteAttrs {
  id: string;
  question: string;
  answer: string;
  feedbackMode: QuestionFeedbackMode;
}

export const QuestionWriteNode = Node.create({
  name: "QuestionWrite",

  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

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

      answer: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-answer") ?? "",
        renderHTML: (attrs) => ({ "data-answer": attrs.answer }),
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

  parseHTML() {
    return [{ tag: 'div[data-type="write-question"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "write-question" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionWriteView);
  },

  addCommands() {
    return {
      insertQuestionWrite:
        () =>
        ({ commands }) => {
          return commands.insertContent([
            {
              type: this.name,
              attrs: {
                id: crypto.randomUUID(),
                question: "",
                answer: "",
                feedbackMode: DEFAULT_QUESTION_FEEDBACK_MODE,
              } satisfies QuestionWriteAttrs,
            },
            { type: "paragraph" },
          ]);
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    QuestionWrite: {
      insertQuestionWrite: () => ReturnType;
    };
  }
}
