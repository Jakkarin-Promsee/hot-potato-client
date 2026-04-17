import api from "@/lib/axios";

export interface FeedbackRequestPayload {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  evaluationLevel: "correct" | "almost" | "incorrect";
  accuracyPercent: number;
  diagnostics?: string;
}

const FALLBACK_FEEDBACK =
  "ขอบคุณที่พยายามตอบนะ ลองดูส่วนที่พลาดทีละจุด แล้วค่อยลองใหม่อีกครั้ง เดี๋ยวจะดีขึ้นแน่นอน";

export async function requestQuestionFeedback(
  payload: FeedbackRequestPayload,
): Promise<string> {
  try {
    const response = await api.post<{ feedback?: string }>("/chat/feedback", payload);
    const feedback = response.data?.feedback?.trim();
    return feedback || FALLBACK_FEEDBACK;
  } catch {
    return FALLBACK_FEEDBACK;
  }
}
