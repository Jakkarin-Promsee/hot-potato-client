import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import QuestionChoiceView from "./QuestionChoiceView";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionChoiceAttrs {
  question: string;
  choices: string[];
}

// ─── Node Definition ──────────────────────────────────────────────────────────

export const QuestionChoiceNode = Node.create({
  name: "QuestionChoice",

  // Sits in the document flow like a paragraph, not inline
  group: "block",

  // Treated as one indivisible unit — no cursor can enter it from ProseMirror's
  // perspective. This is the key flag that stops the "whole block gets replaced
  // when you type" problem.
  atom: true,

  // Prevent ProseMirror from drawing a blue selection box around the whole node
  // when the user clicks on it.
  selectable: false,

  // Keep false — draggable:true is known to break input focus on Safari.
  draggable: false,

  // ─── Attributes ────────────────────────────────────────────────────────────
  // Everything stored here survives getHTML() / setContent() / collaboration.
  // Avoid nesting plain objects as attribute values — serialize arrays to JSON.

  addAttributes() {
    return {
      question: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-question") ?? "",
        renderHTML: (attrs) => ({ "data-question": attrs.question }),
      },

      choices: {
        default: ["Option A", "Option B"],
        // Arrays must be serialised to a string to round-trip through HTML
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute("data-choices") ?? "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-choices": JSON.stringify(attrs.choices),
        }),
      },
    };
  },

  // ─── HTML serialisation ────────────────────────────────────────────────────
  // renderHTML controls what editor.getHTML() outputs.
  // parseHTML controls what setContent(html) reads back in.
  // The React NodeView is completely separate from this — it's only for the
  // in-editor visual. The HTML below is what gets saved / sent to the server.

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
  // Hand off rendering to the React component.

  addNodeView() {
    return ReactNodeViewRenderer(QuestionChoiceView, {
      stopEvent: () => true, // ProseMirror hands ALL events to you, touches nothing
    });
  },

  // ─── Commands ──────────────────────────────────────────────────────────────
  // Call editor.commands.insertQuestionChoice() from your toolbar / slash menu.

  addCommands() {
    return {
      insertQuestionChoice:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              question: "",
              choices: ["Option A", "Option B"],
            } satisfies QuestionChoiceAttrs,
          });
        },
    };
  },
});

// Extend Tiptap's command types so TypeScript knows about our custom command
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    QuestionChoice: {
      insertQuestionChoice: () => ReturnType;
    };
  }
}
