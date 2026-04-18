import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import FormulaNode from "./FormulaNode";
import {
  createFormulaNode,
  createFormulaRow,
  createInitialFormulaState,
  formulaReducer,
} from "./formulaReducer";
import { formulaToLatex } from "./formulaToLatex";
import {
  setActiveFormulaBlock,
  subscribeFormulaToolbarAction,
} from "./formulaToolbarBus";
import type { FormulaNode as FormulaNodeType, FormulaState, FormulaToolbarAction } from "./types";

type FormulaAttrs = {
  id?: string;
  formula?: FormulaNodeType;
  latex?: string;
};

function createEmptyByType(
  action: FormulaToolbarAction,
): FormulaNodeType | null {
  switch (action.type) {
    case "insert-symbol":
      return createFormulaNode("symbol", { value: action.value });
    case "insert-power":
      return createFormulaNode("power", {
        powerPosition: action.position,
        slots: {
          base: createFormulaNode("variable", { value: "x" }),
          exponent: createFormulaNode("number", { value: "" }),
        },
      });
    case "insert-structure":
      if (action.kind === "sqrt" || action.kind === "nth-root") {
        return createFormulaNode("sqrt", {
          slots: {
            index:
              action.kind === "nth-root"
                ? createFormulaNode("number", { value: "n" })
                : createFormulaRow(),
            content: createFormulaNode("variable", { value: "x" }),
          },
        });
      }
      if (action.kind === "fraction") {
        return createFormulaNode("fraction", {
          slots: {
            numerator: createFormulaNode("variable", { value: "a" }),
            denominator: createFormulaNode("variable", { value: "b" }),
          },
        });
      }
      if (action.kind === "abs") {
        return createFormulaNode("abs", {
          slots: { content: createFormulaNode("variable", { value: "x" }) },
        });
      }
      if (action.kind === "paren") {
        return createFormulaNode("paren", {
          slots: { content: createFormulaNode("variable", { value: "x" }) },
        });
      }
      if (action.kind === "bracket") {
        return createFormulaNode("bracket", {
          slots: { content: createFormulaNode("variable", { value: "x" }) },
        });
      }
      if (action.kind === "summation") {
        return createFormulaNode("summation", {
          slots: {
            upper: createFormulaNode("variable", { value: "n" }),
            lower: createFormulaNode("symbol", { value: "i=0" }),
            body: createFormulaNode("variable", { value: "x" }),
          },
        });
      }
      if (action.kind === "integral" || action.kind === "line-integral") {
        return createFormulaNode("integral", {
          value: action.kind === "line-integral" ? "∮" : "∫",
          slots: {
            upper: createFormulaNode("variable", { value: "b" }),
            lower: createFormulaNode("variable", { value: "a" }),
            integrand: createFormulaNode("variable", { value: "f(x)" }),
            variable: createFormulaNode("variable", { value: "x" }),
          },
        });
      }
      return null;
    case "insert-trig":
      return createFormulaNode("trig", {
        value: action.name,
        slots: { argument: createFormulaNode("variable", { value: "x" }) },
      });
    case "insert-invtrig":
      return createFormulaNode("invtrig", {
        value: action.name,
        slots: { argument: createFormulaNode("variable", { value: "x" }) },
      });
    case "insert-log":
      return createFormulaNode("log", {
        slots: {
          base: createFormulaNode("number", { value: "10" }),
          argument: createFormulaNode("variable", { value: "x" }),
        },
      });
    case "insert-ln":
      return createFormulaNode("ln", {
        slots: { argument: createFormulaNode("variable", { value: "x" }) },
      });
    default:
      return null;
  }
}

function inferInitialState(attrs?: FormulaAttrs): FormulaState {
  if (attrs?.formula?.type === "row") {
    return { root: attrs.formula };
  }
  return createInitialFormulaState();
}

function collectFocusTargets(node: FormulaNodeType): string[] {
  const targets: string[] = [];
  const walk = (current: FormulaNodeType) => {
    targets.push(`node::${current.id}`);
    Object.entries(current.slots ?? {}).forEach(([slot, slotNode]) => {
      const slotKey = `slot::${current.id}::${slot}`;
      targets.push(slotKey);
      if (slotNode) walk(slotNode);
    });
    (current.children ?? []).forEach(walk);
  };
  walk(node);
  return targets;
}

function formulaTargetToAction(
  target: string,
  node: FormulaNodeType,
): { parentId: string; location: { kind: "row" | "slot"; slot?: string; replace?: boolean } } {
  if (target.startsWith("slot::")) {
    const [parentIdRaw, slotRaw] = target.replace("slot::", "").split("::");
    const parentId = parentIdRaw || node.id;
    const slot = slotRaw || "content";
    return {
      parentId,
      location: { kind: "slot", slot, replace: true },
    };
  }
  return {
    parentId: node.id,
    location: { kind: "row" },
  };
}

export default function FormulaCanvas({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as FormulaAttrs;
  const [state, dispatch] = useReducer(formulaReducer, attrs, inferInitialState);
  const [activeToolbarBlockId, setActiveToolbarBlockId] = useState<string | null>(
    null,
  );
  const [focusTarget, setFocusTarget] = useState<string>("root");
  const isEditable = editor.isEditable;

  const blockId = useMemo(
    () => attrs.id ?? `formula-block-${Math.random().toString(36).slice(2, 9)}`,
    [attrs.id],
  );

  useEffect(() => {
    if (!attrs.id) updateAttributes({ id: blockId });
  }, [attrs.id, blockId, updateAttributes]);

  useEffect(() => {
    const latex = formulaToLatex(state.root);
    updateAttributes({
      formula: state.root,
      latex,
    });
  }, [state.root, updateAttributes]);

  const applyToolbarAction = useCallback(
    (action: FormulaToolbarAction) => {
      if (action.type === "wrap-fraction" && focusTarget.startsWith("node::")) {
        dispatch({
          type: "WRAP_IN",
          nodeId: focusTarget.replace("node::", ""),
          wrapperType: "fraction",
        });
        return;
      }
      if (action.type === "wrap-power-top-right" && focusTarget.startsWith("node::")) {
        dispatch({
          type: "WRAP_IN",
          nodeId: focusTarget.replace("node::", ""),
          wrapperType: "power",
          powerPosition: "top-right",
        });
        return;
      }
      if (action.type === "wrap-paren" && focusTarget.startsWith("node::")) {
        dispatch({
          type: "WRAP_IN",
          nodeId: focusTarget.replace("node::", ""),
          wrapperType: "paren",
        });
        return;
      }

      const nodeToInsert = createEmptyByType(action);
      if (!nodeToInsert) return;

      const targetAction = formulaTargetToAction(focusTarget, state.root);
      dispatch({
        type: "INSERT_NODE",
        parentId: targetAction.parentId,
        location:
          targetAction.location.kind === "row"
            ? { kind: "row" }
            : {
                kind: "slot",
                slot: targetAction.location.slot!,
                replace: true,
              },
        node: nodeToInsert,
      });
    },
    [focusTarget, state.root],
  );

  useEffect(() => {
    if (!isEditable) return;
    return subscribeFormulaToolbarAction(({ action, targetBlockId }) => {
      if (targetBlockId && targetBlockId !== blockId) return;
      if (activeToolbarBlockId !== blockId) return;
      applyToolbarAction(action);
    });
  }, [activeToolbarBlockId, applyToolbarAction, blockId, isEditable]);

  const handleKeyboardShortcuts = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!isEditable) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-formula-editable="true"]')) return;

      const operatorMap: Record<string, string> = {
        "+": "+",
        "-": "−",
        "*": "×",
        "/": "÷",
        "=": "=",
      };

      if (event.key === "/" && focusTarget.startsWith("node::")) {
        event.preventDefault();
        applyToolbarAction({ type: "wrap-fraction" });
        return;
      }
      if (event.key === "^" && focusTarget.startsWith("node::")) {
        event.preventDefault();
        applyToolbarAction({ type: "wrap-power-top-right" });
        return;
      }
      if (event.key === "(" && focusTarget.startsWith("node::")) {
        event.preventDefault();
        applyToolbarAction({ type: "wrap-paren" });
        return;
      }

      const operator = operatorMap[event.key];
      if (operator) {
        event.preventDefault();
        applyToolbarAction({
          type: "insert-symbol",
          value: operator,
        });
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const targets = collectFocusTargets(state.root);
        const idx = targets.indexOf(focusTarget);
        if (idx === -1) return;
        const nextIdx =
          event.key === "ArrowRight"
            ? Math.min(targets.length - 1, idx + 1)
            : Math.max(0, idx - 1);
        if (nextIdx !== idx) {
          event.preventDefault();
          setFocusTarget(targets[nextIdx] ?? focusTarget);
        }
      }
    },
    [applyToolbarAction, focusTarget, isEditable, state.root],
  );

  return (
    <NodeViewWrapper
      className="w-full rounded-md border border-slate-300 bg-slate-100 p-2"
      contentEditable={false}
      onMouseDownCapture={(event: ReactMouseEvent<HTMLDivElement>) =>
        event.stopPropagation()
      }
      onMouseDown={() => {
        setActiveFormulaBlock(blockId);
        setActiveToolbarBlockId(blockId);
      }}
      onClick={() => {
        setActiveFormulaBlock(blockId);
        setActiveToolbarBlockId(blockId);
      }}
      onKeyDown={handleKeyboardShortcuts}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Formula Block
      </div>
      <div
        className="min-h-12 rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-slate-900"
        style={{ fontFamily: "'STIX Two Math', 'Latin Modern Math', serif" }}
      >
        <FormulaNode
          node={state.root}
          dispatch={dispatch}
          activeTargetKey={focusTarget.startsWith("slot::") ? focusTarget.replace("slot::", "") : focusTarget}
          onFocusTarget={(targetKey) =>
            setFocusTarget(targetKey.startsWith("node::") ? targetKey : `slot::${targetKey}`)
          }
          editable={isEditable}
        />
      </div>
    </NodeViewWrapper>
  );
}
