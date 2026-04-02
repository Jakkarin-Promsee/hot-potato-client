import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import QuestionChoiceView, { type Choice } from "./QuestionChoiceView";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionChoiceAttrs {
  question: string;
  choices: Choice[];
  answerType: "single" | "multi";
}

// ─── Node Definition ──────────────────────────────────────────────────────────

export const QuestionChoiceNode = Node.create({
  name: "QuestionChoice",

  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  // ─── Attributes ────────────────────────────────────────────────────────────

  addAttributes() {
    return {
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
          return commands.insertContent({
            type: this.name,
            attrs: {
              question: "",
              choices: [
                { text: "Option 1", correct: false },
                { text: "Option 2", correct: false },
              ],
              answerType: "single",
            } satisfies QuestionChoiceAttrs,
          });
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
