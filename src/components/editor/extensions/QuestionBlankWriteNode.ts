import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import QuestionBlankWriteView from "./QuestionBlankWriteView";
import { DEFAULT_QUESTION_FEEDBACK_MODE, type QuestionFeedbackMode } from "./questionMode";

export interface QuestionBlankWriteAttrs {
  id: string;
  template: string;
  blankAnswers: string[];
  feedbackMode: QuestionFeedbackMode;
}

export const QuestionBlankWriteNode = Node.create({
  name: "QuestionBlankWrite",

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

      template: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-template") ?? "",
        renderHTML: (attrs) => ({ "data-template": attrs.template }),
      },

      blankAnswers: {
        default: [] as string[],
        parseHTML: (el) => {
          try {
            return JSON.parse(
              el.getAttribute("data-blank-answers") ?? "[]",
            ) as string[];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-blank-answers": JSON.stringify(attrs.blankAnswers),
        }),
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
    return [{ tag: 'div[data-type="blank-write-question"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "blank-write-question",
        class: "text-base",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionBlankWriteView);
  },

  addCommands() {
    return {
      insertQuestionBlankWrite:
        () =>
        ({ commands }) => {
          return commands.insertContent([
            {
              type: this.name,
              attrs: {
                id: crypto.randomUUID(),
                template: "The capital of [Q-0] is [Q-1].",
                blankAnswers: ["", ""],
                feedbackMode: DEFAULT_QUESTION_FEEDBACK_MODE,
              } satisfies QuestionBlankWriteAttrs,
            },
            { type: "paragraph" },
          ]);
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    QuestionBlankWrite: {
      insertQuestionBlankWrite: () => ReturnType;
    };
  }
}
