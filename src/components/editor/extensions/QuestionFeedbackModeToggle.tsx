import type { QuestionFeedbackMode } from "./questionMode";

interface QuestionFeedbackModeToggleProps {
  mode: QuestionFeedbackMode;
  onChange: (mode: QuestionFeedbackMode) => void;
}

export default function QuestionFeedbackModeToggle({
  mode,
  onChange,
}: QuestionFeedbackModeToggleProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400">Feedback mode:</span>
      <button
        type="button"
        onClick={() => onChange("quick_check")}
        className={[
          "rounded-md border px-2.5 py-1 text-xs font-medium transition",
          mode === "quick_check"
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
        ].join(" ")}
      >
        Simple understand
      </button>
      <button
        type="button"
        onClick={() => onChange("full_reflection")}
        className={[
          "rounded-md border px-2.5 py-1 text-xs font-medium transition",
          mode === "full_reflection"
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
        ].join(" ")}
      >
        Full reflection
      </button>
    </div>
  );
}
