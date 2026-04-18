import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import FormulaCanvas from "./FormulaCanvas";
import { createFormulaRow } from "./formulaReducer";
import type { FormulaNode } from "./types";

export interface FormulaBlockAttrs {
  id: string;
  formula: FormulaNode;
  latex: string;
}

export const FormulaBlockNode = Node.create({
  name: "formulaBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-id"),
        renderHTML: (attrs: FormulaBlockAttrs) => ({ "data-id": attrs.id }),
      },
      formula: {
        default: createFormulaRow(),
        parseHTML: (el) => {
          const raw = el.getAttribute("data-formula");
          if (!raw) return createFormulaRow();
          try {
            return JSON.parse(raw) as FormulaNode;
          } catch {
            return createFormulaRow();
          }
        },
        renderHTML: (attrs: FormulaBlockAttrs) => ({
          "data-formula": JSON.stringify(attrs.formula),
        }),
      },
      latex: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-latex") ?? "",
        renderHTML: (attrs: FormulaBlockAttrs) => ({ "data-latex": attrs.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="formula-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "formula-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FormulaCanvas);
  },

  addCommands() {
    return {
      insertFormulaBlock:
        () =>
        ({ commands }) =>
          commands.insertContent([
            {
              type: this.name,
              attrs: {
                id: crypto.randomUUID(),
                formula: createFormulaRow(),
                latex: "",
              } satisfies FormulaBlockAttrs,
            },
            { type: "paragraph" },
          ]),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    FormulaBlock: {
      insertFormulaBlock: () => ReturnType;
    };
  }
}
