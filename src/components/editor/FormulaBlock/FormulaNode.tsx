import { memo, type Dispatch, type FormEvent } from "react";
import { createFormulaNode } from "./formulaReducer";
import type { FormulaAction, FormulaNode as FormulaNodeType } from "./types";

type FormulaNodeProps = {
  node: FormulaNodeType;
  dispatch: Dispatch<FormulaAction>;
  className?: string;
  activeTargetKey?: string;
  onFocusTarget?: (targetKey: string) => void;
  editable?: boolean;
};

type SlotProps = {
  parent: FormulaNodeType;
  slot: string;
  dispatch: Dispatch<FormulaAction>;
  className?: string;
  activeTargetKey?: string;
  onFocusTarget?: (targetKey: string) => void;
  editable?: boolean;
};

const slotBaseClass =
  "min-h-5 min-w-5 rounded-[3px] border border-dashed border-slate-400 bg-slate-100";

function handleEditableInput(
  dispatch: Dispatch<FormulaAction>,
  nodeId: string,
  event: FormEvent<HTMLSpanElement>,
) {
  const value = event.currentTarget.textContent ?? "";
  dispatch({
    type: "UPDATE_VALUE",
    nodeId,
    value,
  });
}

const FormulaSlot = memo(function FormulaSlot({
  parent,
  slot,
  dispatch,
  className,
  activeTargetKey,
  onFocusTarget,
  editable = true,
}: SlotProps) {
  const slotNode = parent.slots?.[slot];
  const targetKey = `${parent.id}::${slot}`;
  const isActive = activeTargetKey === targetKey;
  const activeClass = isActive ? "border-2 border-blue-600 bg-blue-50" : "";

  if (slotNode) {
    return (
      <div
        className={`${className ?? ""} ${activeClass}`}
        onMouseDown={() => onFocusTarget?.(targetKey)}
      >
        <FormulaNode
          node={slotNode}
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      title={`Insert into ${slot}`}
      className={`${slotBaseClass} ${className ?? ""} ${activeClass}`}
      disabled={!editable}
      onClick={() => {
        if (!editable) return;
        onFocusTarget?.(targetKey);
        dispatch({
          type: "INSERT_NODE",
          parentId: parent.id,
          location: { kind: "slot", slot, replace: true },
          node: createFormulaNode("number", { value: "" }),
        });
      }}
    />
  );
});

const FormulaNode = memo(function FormulaNode({
  node,
  dispatch,
  className,
  activeTargetKey,
  onFocusTarget,
  editable = true,
}: FormulaNodeProps) {
  if (node.type === "row") {
    return (
      <div className={`inline-flex flex-wrap items-end gap-1 ${className ?? ""}`}>
        {(node.children ?? []).map((child) => (
          <FormulaNode
            key={child.id}
            node={child}
            dispatch={dispatch}
            activeTargetKey={activeTargetKey}
            onFocusTarget={onFocusTarget}
            editable={editable}
          />
        ))}
      </div>
    );
  }

  if (node.type === "number" || node.type === "variable" || node.type === "symbol") {
    const nodeTargetKey = `node::${node.id}`;
    const isActive = activeTargetKey === nodeTargetKey;
    return (
      <span
        contentEditable={editable}
        suppressContentEditableWarning
        data-formula-editable="true"
        className={`inline-block min-w-3 rounded px-0.5 text-[15px] leading-none outline-none ${isActive ? "border-2 border-blue-600 bg-blue-50" : "focus:border focus:border-blue-600 focus:bg-blue-50"} ${className ?? ""}`}
        onInput={(event) => handleEditableInput(dispatch, node.id, event)}
        onFocus={() => onFocusTarget?.(nodeTargetKey)}
        onKeyDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {node.value ?? ""}
      </span>
    );
  }

  if (node.type === "fraction") {
    return (
      <div className={`inline-flex flex-col items-stretch text-[15px] ${className ?? ""}`}>
        <div className="flex justify-center px-1 pb-0.5">
          <FormulaSlot
            parent={node}
            slot="numerator"
            dispatch={dispatch}
            activeTargetKey={activeTargetKey}
            onFocusTarget={onFocusTarget}
            editable={editable}
          />
        </div>
        <div className="w-full border-b border-current" />
        <div className="flex justify-center px-1 pt-0.5">
          <FormulaSlot
            parent={node}
            slot="denominator"
            dispatch={dispatch}
            activeTargetKey={activeTargetKey}
            onFocusTarget={onFocusTarget}
            editable={editable}
          />
        </div>
      </div>
    );
  }

  if (node.type === "power") {
    const position = node.powerPosition ?? "top-right";
    const exponentPositionClass =
      position === "top-right"
        ? "-top-2.5 -right-2.5"
        : position === "bottom-right"
          ? "-bottom-2.5 -right-2.5"
          : position === "top-left"
            ? "-top-2.5 -left-2.5"
            : "-bottom-2.5 -left-2.5";

    return (
      <div className={`relative inline-flex items-center ${className ?? ""}`}>
        <FormulaSlot
          parent={node}
          slot="base"
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
        <div
          className={`absolute ${exponentPositionClass} scale-75 origin-center`}
        >
          <FormulaSlot
            parent={node}
            slot="exponent"
            dispatch={dispatch}
            className="min-h-4 min-w-4"
            activeTargetKey={activeTargetKey}
            onFocusTarget={onFocusTarget}
            editable={editable}
          />
        </div>
      </div>
    );
  }

  if (node.type === "sqrt") {
    return (
      <div className={`inline-flex items-start gap-0.5 ${className ?? ""}`}>
        <div className="relative text-[18px] leading-none text-foreground">
          √
          <div className="absolute -top-2 -left-2 scale-75">
            <FormulaSlot
              parent={node}
              slot="index"
              dispatch={dispatch}
              className="min-h-4 min-w-4"
              activeTargetKey={activeTargetKey}
              onFocusTarget={onFocusTarget}
              editable={editable}
            />
          </div>
        </div>
        <div className="border-t border-current pt-0.5">
          <FormulaSlot
            parent={node}
            slot="content"
            dispatch={dispatch}
            activeTargetKey={activeTargetKey}
            onFocusTarget={onFocusTarget}
            editable={editable}
          />
        </div>
      </div>
    );
  }

  if (node.type === "abs" || node.type === "paren" || node.type === "bracket") {
    const [left, right] =
      node.type === "abs"
        ? ["|", "|"]
        : node.type === "paren"
          ? ["(", ")"]
          : ["[", "]"];
    return (
      <div className={`inline-flex items-center gap-0.5 ${className ?? ""}`}>
        <span className="text-[17px] leading-none">{left}</span>
        <FormulaSlot
          parent={node}
          slot="content"
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
        <span className="text-[17px] leading-none">{right}</span>
      </div>
    );
  }

  if (node.type === "summation") {
    return (
      <div className={`inline-flex items-center gap-1 ${className ?? ""}`}>
        <div className="relative inline-flex flex-col items-center justify-center">
          <div className="mb-0.5 scale-75">
            <FormulaSlot
              parent={node}
              slot="upper"
              dispatch={dispatch}
              className="min-h-4 min-w-4"
              activeTargetKey={activeTargetKey}
              onFocusTarget={onFocusTarget}
            />
          </div>
          <span className="text-[22px] leading-none">Σ</span>
          <div className="mt-0.5 scale-75">
            <FormulaSlot
              parent={node}
              slot="lower"
              dispatch={dispatch}
              className="min-h-4 min-w-4"
              activeTargetKey={activeTargetKey}
              onFocusTarget={onFocusTarget}
              editable={editable}
            />
          </div>
        </div>
        <FormulaSlot
          parent={node}
          slot="body"
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
      </div>
    );
  }

  if (node.type === "trig" || node.type === "invtrig") {
    const fn = node.value ?? "sin";
    return (
      <div className={`inline-flex items-center gap-0.5 ${className ?? ""}`}>
        <span className="text-[17px] leading-none">
          {fn}
          {node.type === "invtrig" && (
            <sup className="ml-0.5 text-[10px] align-super">-1</sup>
          )}
        </span>
        <span>(</span>
        <FormulaSlot
          parent={node}
          slot="argument"
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
        <span>)</span>
      </div>
    );
  }

  if (node.type === "log") {
    return (
      <div className={`inline-flex items-end gap-0.5 ${className ?? ""}`}>
        <div className="relative inline-flex items-end">
          <span className="text-[17px] leading-none">log</span>
          <div className="-mb-2 ml-0.5 scale-75">
            <FormulaSlot
              parent={node}
              slot="base"
              dispatch={dispatch}
              className="min-h-4 min-w-4"
              activeTargetKey={activeTargetKey}
              onFocusTarget={onFocusTarget}
              editable={editable}
            />
          </div>
        </div>
        <span>(</span>
        <FormulaSlot
          parent={node}
          slot="argument"
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
        <span>)</span>
      </div>
    );
  }

  if (node.type === "ln") {
    return (
      <div className={`inline-flex items-center gap-0.5 ${className ?? ""}`}>
        <span className="text-[17px] leading-none">ln</span>
        <span>(</span>
        <FormulaSlot
          parent={node}
          slot="argument"
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
        <span>)</span>
      </div>
    );
  }

  if (node.type === "integral") {
    const integralSymbol = node.value === "∮" ? "∮" : "∫";
    return (
      <div className={`inline-flex items-center gap-1 ${className ?? ""}`}>
        <div className="relative inline-flex items-center">
          <span className="text-[24px] leading-none">{integralSymbol}</span>
          <div className="absolute -top-2.5 left-6 scale-75">
            <FormulaSlot
              parent={node}
              slot="upper"
              dispatch={dispatch}
              className="min-h-4 min-w-4"
              activeTargetKey={activeTargetKey}
              onFocusTarget={onFocusTarget}
              editable={editable}
            />
          </div>
          <div className="absolute -bottom-2.5 left-6 scale-75">
            <FormulaSlot
              parent={node}
              slot="lower"
              dispatch={dispatch}
              className="min-h-4 min-w-4"
              activeTargetKey={activeTargetKey}
              onFocusTarget={onFocusTarget}
              editable={editable}
            />
          </div>
        </div>
        <FormulaSlot
          parent={node}
          slot="integrand"
          dispatch={dispatch}
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
        <span>d</span>
        <FormulaSlot
          parent={node}
          slot="variable"
          dispatch={dispatch}
          className="min-h-4 min-w-4"
          activeTargetKey={activeTargetKey}
          onFocusTarget={onFocusTarget}
          editable={editable}
        />
      </div>
    );
  }

  // Temporary fallback while incrementally implementing all formula node types.
  return (
    <span className="inline-block rounded border border-dashed border-slate-300 px-1 py-0.5 text-xs text-slate-500">
      {node.type}
    </span>
  );
});

export default FormulaNode;
