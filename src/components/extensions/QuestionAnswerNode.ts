import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import QuestionAnswerView from './QuestionAnswerView';

export const QuestionAnswerNode = Node.create({
  name: 'questionAnswer',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      question: {
        default: 'Click to edit question...',
      },
      answer: {
        default: 'Click to edit answer...',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-question-answer]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-question-answer': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionAnswerView);
  },
});
