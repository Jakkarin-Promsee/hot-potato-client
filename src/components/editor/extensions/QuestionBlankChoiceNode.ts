import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import QuestionBlankChoiceView from "./QuestionBlankChoiceView";

export interface QuestionBlankChoiceAttrs {
  id: string;
  template: string;
  choices: string[];
  correctByBlank: number[];
}

export const QuestionBlankChoiceNode = Node.create({
  name: "QuestionBlankChoice",

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
      choices: {
        default: [] as string[],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute("data-choices") ?? "[]") as string[];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-choices": JSON.stringify(attrs.choices),
        }),
      },
      correctByBlank: {
        default: [] as number[],
        parseHTML: (el) => {
          try {
            return JSON.parse(
              el.getAttribute("data-correct-by-blank") ?? "[]",
            ) as number[];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-correct-by-blank": JSON.stringify(attrs.correctByBlank),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="blank-choice-question"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "blank-choice-question" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionBlankChoiceView);
  },

  addCommands() {
    return {
      insertQuestionBlankChoice:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: crypto.randomUUID(),
              template: "The capital of [Q-0] is [Q-1].",
              choices: ["France", "Paris", "Japan", "Tokyo"],
              correctByBlank: [0, 1],
            } satisfies QuestionBlankChoiceAttrs,
          });
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    QuestionBlankChoice: {
      insertQuestionBlankChoice: () => ReturnType;
    };
  }
}
