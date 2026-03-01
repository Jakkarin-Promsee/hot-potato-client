import { useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { ChevronRight, HelpCircle } from 'lucide-react';

const QuestionAnswerView = ({ node, updateAttributes, selected }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(false);

  const { question, answer } = node.attrs;

  const handleQuestionChange = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    updateAttributes({ question: e.currentTarget.textContent || '' });
    setEditingQuestion(false);
  }, [updateAttributes]);

  const handleAnswerChange = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    updateAttributes({ answer: e.currentTarget.textContent || '' });
    setEditingAnswer(false);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`rounded-lg border transition-all duration-200 ${
          selected ? 'border-primary shadow-md' : 'border-border'
        }`}
      >
        {/* Question */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        >
          <HelpCircle size={18} className="shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <div
            contentEditable={editingQuestion}
            suppressContentEditableWarning
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingQuestion(true);
            }}
            onBlur={handleQuestionChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }}
            className={`flex-1 text-base font-medium text-foreground ${
              editingQuestion ? 'rounded bg-muted/50 px-2 py-0.5 outline-none ring-1 ring-border' : ''
            }`}
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            {question}
          </div>
          <ChevronRight
            size={16}
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
        </button>

        {/* Answer */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-border bg-muted/20 px-4 py-3 pl-11">
            <div
              contentEditable={editingAnswer}
              suppressContentEditableWarning
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingAnswer(true);
              }}
              onBlur={handleAnswerChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLElement).blur();
                }
              }}
              className={`text-sm leading-relaxed text-muted-foreground ${
                editingAnswer ? 'rounded bg-background px-2 py-1 text-foreground outline-none ring-1 ring-border' : ''
              }`}
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              {answer}
            </div>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default QuestionAnswerView;
