import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import QuestionAgentView, { type ChatMessage } from "./QuestionAgentView";

export interface QuestionAgentAttrs {
  id: string;
  title: string;
  chatHistory: ChatMessage[];
  collapsed: boolean;
}

export const QuestionAgentNode = Node.create({
  name: "QuestionAgent",

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
      title: {
        default: "Ask AI",
        parseHTML: (el) => el.getAttribute("data-title") ?? "Ask AI",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
      chatHistory: {
        default: [] as ChatMessage[],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute("data-chat-history") ?? "[]") as ChatMessage[];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-chat-history": JSON.stringify(attrs.chatHistory),
        }),
      },
      collapsed: {
        default: true,
        parseHTML: (el) => (el.getAttribute("data-collapsed") ?? "true") === "true",
        renderHTML: (attrs) => ({ "data-collapsed": String(attrs.collapsed) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="question-agent"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "question-agent" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionAgentView);
  },

  addCommands() {
    return {
      insertQuestionAgent:
        () =>
        ({ commands }) => {
          return commands.insertContent([
            {
              type: this.name,
              attrs: {
                id: crypto.randomUUID(),
                title: "Ask AI",
                chatHistory: [],
                collapsed: true,
              } satisfies QuestionAgentAttrs,
            },
            { type: "paragraph" },
          ]);
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    QuestionAgent: {
      insertQuestionAgent: () => ReturnType;
    };
  }
}
