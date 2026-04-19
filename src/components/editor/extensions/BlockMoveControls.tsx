import { ChevronDown, ChevronUp } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorI18n } from "../editor.i18n";

type MoveDirection = "up" | "down";

interface BlockMoveControlsProps {
  editor: Editor;
  getPos: (() => number | undefined) | boolean;
  className?: string;
}

interface MoveContext {
  pos: number;
  index: number;
  nodeSize: number;
  parent: ReturnType<Editor["state"]["doc"]["resolve"]>["parent"];
}

function getMoveContext(
  editor: Editor,
  getPos: (() => number | undefined) | boolean,
): MoveContext | null {
  if (typeof getPos !== "function") return null;

  const pos = getPos();
  if (typeof pos !== "number") return null;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return null;

  const $pos = editor.state.doc.resolve(pos);
  return {
    pos,
    index: $pos.index(),
    nodeSize: node.nodeSize,
    parent: $pos.parent,
  };
}

function canMove(
  editor: Editor,
  getPos: (() => number | undefined) | boolean,
  direction: MoveDirection,
) {
  const context = getMoveContext(editor, getPos);
  if (!context) return false;

  if (direction === "up") return context.index > 0;
  return context.index < context.parent.childCount - 1;
}

function moveBlock(
  editor: Editor,
  getPos: (() => number | undefined) | boolean,
  direction: MoveDirection,
) {
  const context = getMoveContext(editor, getPos);
  if (!context) return false;

  const { state, view } = editor;
  const node = state.doc.nodeAt(context.pos);
  if (!node) return false;

  if (direction === "up") {
    if (context.index === 0) return false;
    const previousNode = context.parent.child(context.index - 1);
    const insertPos = context.pos - previousNode.nodeSize;
    const tr = state.tr.delete(context.pos, context.pos + context.nodeSize);
    tr.insert(insertPos, node);
    tr.setSelection(NodeSelection.create(tr.doc, insertPos));
    tr.scrollIntoView();
    view.dispatch(tr);
    view.focus();
    return true;
  }

  if (context.index >= context.parent.childCount - 1) return false;
  const nextNode = context.parent.child(context.index + 1);
  const insertPos = context.pos + nextNode.nodeSize;
  const tr = state.tr.delete(context.pos, context.pos + context.nodeSize);
  tr.insert(insertPos, node);
  tr.setSelection(NodeSelection.create(tr.doc, insertPos));
  tr.scrollIntoView();
  view.dispatch(tr);
  view.focus();
  return true;
}

export default function BlockMoveControls({
  editor,
  getPos,
  className,
}: BlockMoveControlsProps) {
  const { t } = useEditorI18n();
  const upDisabled = !canMove(editor, getPos, "up");
  const downDisabled = !canMove(editor, getPos, "down");

  return (
    <div className={className ?? "flex items-center gap-1"}>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          moveBlock(editor, getPos, "up");
        }}
        disabled={upDisabled}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition hover:bg-violet-100 hover:text-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={t("Move block up", "เลื่อนบล็อกขึ้น")}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          moveBlock(editor, getPos, "down");
        }}
        disabled={downDisabled}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition hover:bg-violet-100 hover:text-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={t("Move block down", "เลื่อนบล็อกลง")}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
