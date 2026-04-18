import api from "@/lib/axios";

export interface FeedbackRequestPayload {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  evaluationLevel: "correct" | "almost" | "incorrect";
  accuracyPercent: number;
  diagnostics?: string;
}

export interface WriteEvaluationPayload {
  question: string;
  guideAnswer: string;
  studentAnswer: string;
}

export interface FeedbackFollowupMessage {
  role: "student" | "ai";
  text: string;
}

export interface FeedbackFollowupPayload {
  topic: string;
  studentAnswer: string;
  initialFeedback: string;
  followupQuestion: string;
  thread: FeedbackFollowupMessage[];
  expectedAnswer?: string;
}

const FALLBACK_FEEDBACK =
  "ขอบคุณที่พยายามตอบนะ ลองดูส่วนที่พลาดทีละจุด แล้วค่อยลองใหม่อีกครั้ง เดี๋ยวจะดีขึ้นแน่นอน";
const FALLBACK_WRITE_EVALUATION =
  "คำตอบนี้มีแนวคิดที่น่าสนใจแล้วนะ ลองขยายเหตุผลให้ชัดขึ้นอีกนิด โดยอธิบายว่าแต่ละประเด็นเชื่อมกับคำถามอย่างไร แล้วสรุปเป็นคำตอบสุดท้ายอีกครั้ง";

export async function requestQuestionFeedback(
  payload: FeedbackRequestPayload,
): Promise<string> {
  try {
    const response = await api.post<{ feedback?: string }>(
      "/chat/feedback",
      payload,
    );
    const feedback = response.data?.feedback?.trim();
    return feedback || FALLBACK_FEEDBACK;
  } catch {
    return FALLBACK_FEEDBACK;
  }
}

export async function requestWriteEvaluation(
  payload: WriteEvaluationPayload,
): Promise<string> {
  try {
    const response = await api.post<{ feedback?: string }>(
      "/chat/write-evaluate",
      payload,
    );
    const feedback = response.data?.feedback?.trim();
    return feedback || FALLBACK_WRITE_EVALUATION;
  } catch {
    return FALLBACK_WRITE_EVALUATION;
  }
}

export async function requestFeedbackFollowup(
  payload: FeedbackFollowupPayload,
): Promise<string> {
  const threadContext = payload.thread
    .slice(-10)
    .map((entry) => `${entry.role === "student" ? "Student" : "AI"}: ${entry.text}`)
    .join("\n");

  return requestQuestionFeedback({
    question: payload.topic || "Feedback follow-up",
    correctAnswer: payload.expectedAnswer?.trim() || "(Open-ended response accepted)",
    userAnswer: [
      `Original student answer: ${payload.studentAnswer || "(none)"}`,
      `Initial AI feedback: ${payload.initialFeedback || "(none)"}`,
      `Student follow-up: ${payload.followupQuestion}`,
    ].join("\n"),
    evaluationLevel: "almost",
    accuracyPercent: 0,
    diagnostics: [
      "Mode: follow-up coaching conversation about prior feedback.",
      "Be concise and conversational. Build on previous AI feedback.",
      "If student asks for clarification, explain step-by-step with one practical next action.",
      threadContext ? `Recent thread:\n${threadContext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });
}
