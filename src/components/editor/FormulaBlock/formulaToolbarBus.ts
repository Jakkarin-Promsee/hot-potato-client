import type { FormulaToolbarAction } from "./types";

const FORMULA_ACTION_EVENT = "formula-toolbar-action";
const ACTIVE_BLOCK_EVENT = "formula-toolbar-active-block";

type FormulaToolbarEventDetail = {
  targetBlockId?: string;
  action: FormulaToolbarAction;
};

type ActiveBlockEventDetail = {
  blockId: string | null;
};

export function emitFormulaToolbarAction(
  action: FormulaToolbarAction,
  targetBlockId?: string,
) {
  window.dispatchEvent(
    new CustomEvent<FormulaToolbarEventDetail>(FORMULA_ACTION_EVENT, {
      detail: { action, targetBlockId },
    }),
  );
}

export function subscribeFormulaToolbarAction(
  callback: (detail: FormulaToolbarEventDetail) => void,
) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<FormulaToolbarEventDetail>;
    if (customEvent.detail) callback(customEvent.detail);
  };
  window.addEventListener(FORMULA_ACTION_EVENT, handler);
  return () => window.removeEventListener(FORMULA_ACTION_EVENT, handler);
}

export function setActiveFormulaBlock(blockId: string | null) {
  window.dispatchEvent(
    new CustomEvent<ActiveBlockEventDetail>(ACTIVE_BLOCK_EVENT, {
      detail: { blockId },
    }),
  );
}

export function subscribeActiveFormulaBlock(
  callback: (blockId: string | null) => void,
) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ActiveBlockEventDetail>;
    callback(customEvent.detail?.blockId ?? null);
  };
  window.addEventListener(ACTIVE_BLOCK_EVENT, handler);
  return () => window.removeEventListener(ACTIVE_BLOCK_EVENT, handler);
}
