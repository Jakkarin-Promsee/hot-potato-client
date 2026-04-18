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
