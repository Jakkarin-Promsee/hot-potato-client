import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

const MAX_CONTEXT_CHARS = 12000;
const MAX_USER_CONTEXT_CHARS = 8000;

interface ChatMessageLike {
  question?: unknown;
  answer?: unknown;
  createdAt?: unknown;
}

interface BlockAnswerLike {
  chatHistory?: unknown;
}

function serializeInlineText(node: ProseMirrorNode): string {
  if (node.isText) return node.text ?? "";
  if (node.type.name === "hardBreak") return "\n";

  let text = "";
  node.content.forEach((child) => {
    text += serializeInlineText(child);
  });
  return text;
}

function serializeBlock(node: ProseMirrorNode): string[] {
  const type = node.type.name;

  if (type === "QuestionAgent") return [];

  if (type === "heading") {
    const level = Number(node.attrs.level ?? 1);
    const text = serializeInlineText(node).trim();
    return text ? [`H${level}: ${text}`] : [];
  }

  if (type === "paragraph") {
    const text = serializeInlineText(node).trim();
    return text ? [text] : [];
  }

  if (type === "codeBlock") {
    const text = serializeInlineText(node).trim();
    return text ? [`Code:\n${text}`] : [];
  }

  if (type === "blockquote") {
    const lines: string[] = [];
    node.content.forEach((child) => {
      for (const line of serializeBlock(child)) {
        lines.push(`> ${line}`);
      }
    });
    return lines;
  }

  if (type === "bulletList") {
    const lines: string[] = [];
    node.content.forEach((item) => {
      const itemText = item.textContent.trim();
      if (itemText) lines.push(`- ${itemText}`);
    });
    return lines;
  }

  if (type === "orderedList") {
    const lines: string[] = [];
    let i = 1;
    node.content.forEach((item) => {
      const itemText = item.textContent.trim();
      if (itemText) lines.push(`${i}. ${itemText}`);
      i += 1;
    });
    return lines;
  }

  if (type === "image") {
    const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
    return alt ? [`[Image] ${alt}`] : ["[Image]"];
  }

  const lines: string[] = [];
  node.content.forEach((child) => {
    lines.push(...serializeBlock(child));
  });
  return lines;
}

export function getQuestionAgentContextAbove(
  editor: Editor,
  getPos: (() => number | undefined) | boolean,
): string {
  if (typeof getPos !== "function") return "";

  const from = 0;
  const to = getPos();
  if (typeof to !== "number") return "";
  if (to <= from) return "";

  const slice = editor.state.doc.slice(from, to);
  const lines: string[] = [];
  slice.content.forEach((node) => {
    lines.push(...serializeBlock(node));
  });

  const fullContext = lines.join("\n").trim();
  if (!fullContext) return "";

  if (fullContext.length <= MAX_CONTEXT_CHARS) return fullContext;
  return fullContext.slice(fullContext.length - MAX_CONTEXT_CHARS);
}

export function getQuestionAgentContextFromEditor(editor: Editor): string {
  const lines: string[] = [];
  editor.state.doc.content.forEach((node) => {
    lines.push(...serializeBlock(node));
  });

  const fullContext = lines.join("\n").trim();
  if (!fullContext) return "";
  if (fullContext.length <= MAX_CONTEXT_CHARS) return fullContext;
  return fullContext.slice(fullContext.length - MAX_CONTEXT_CHARS);
}

export function getQuestionAgentViewportContext(container: HTMLElement): string {
  const containerRect = container.getBoundingClientRect();
  const nodes = Array.from(
    container.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, [data-type]",
    ),
  ) as HTMLElement[];

  const lines: string[] = [];
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const intersects =
      rect.bottom >= containerRect.top && rect.top <= containerRect.bottom;
    if (!intersects) continue;
    const text = node.textContent?.trim();
    if (!text) continue;
    lines.push(text);
    if (lines.join("\n").length > 2400) break;
  }

  return lines.join("\n").trim();
}

function stringifyHistory(
  blockId: string,
  chatHistory: ChatMessageLike[],
): string[] {
  if (!chatHistory.length) return [];

  const lines: string[] = [`Block ${blockId}:`];
  chatHistory.forEach((msg, idx) => {
    const q = typeof msg.question === "string" ? msg.question.trim() : "";
    const a = typeof msg.answer === "string" ? msg.answer.trim() : "";
    const createdAt = typeof msg.createdAt === "string" ? msg.createdAt : "";
    if (!q || !a) return;
    const dateLabel = createdAt ? ` (${createdAt})` : "";
    lines.push(`Q${idx + 1}${dateLabel}: ${q}`);
    lines.push(`A${idx + 1}: ${a}`);
  });
  return lines.length > 1 ? lines : [];
}

export function buildQuestionAgentUserContext(
  allAnswers: Record<string, unknown>,
  currentBlockId: string,
  currentBlockHistory: ChatMessageLike[],
): string {
  const chunks: string[] = [];

  const currentLines = stringifyHistory(currentBlockId, currentBlockHistory);
  if (currentLines.length) chunks.push(currentLines.join("\n"));

  for (const [blockId, value] of Object.entries(allAnswers)) {
    if (blockId === currentBlockId) continue;
    const maybeBlock = value as BlockAnswerLike;
    const history = Array.isArray(maybeBlock?.chatHistory)
      ? (maybeBlock.chatHistory as ChatMessageLike[])
      : [];
    const lines = stringifyHistory(blockId, history);
    if (lines.length) chunks.push(lines.join("\n"));
  }

  const fullUserContext = chunks.join("\n\n").trim();
  if (!fullUserContext) return "";
  if (fullUserContext.length <= MAX_USER_CONTEXT_CHARS) return fullUserContext;
  return fullUserContext.slice(fullUserContext.length - MAX_USER_CONTEXT_CHARS);
}
