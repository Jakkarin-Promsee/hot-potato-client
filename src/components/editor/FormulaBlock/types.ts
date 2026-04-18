export type FormulaNodeType =
  | "number"
  | "variable"
  | "power"
  | "sqrt"
  | "fraction"
  | "abs"
  | "paren"
  | "bracket"
  | "summation"
  | "symbol"
  | "trig"
  | "invtrig"
  | "log"
  | "ln"
  | "integral"
  | "row";

export type PowerPosition =
  | "top-right"
  | "bottom-right"
  | "top-left"
  | "bottom-left";

export interface FormulaNode {
  id: string;
  type: FormulaNodeType;
  children?: FormulaNode[];
  slots?: Record<string, FormulaNode | undefined>;
  value?: string;
  powerPosition?: PowerPosition;
}

export interface FormulaState {
  root: FormulaNode;
}

export type FormulaToolbarAction =
  | { type: "insert-power"; position: PowerPosition }
  | { type: "insert-structure"; kind: "sqrt" | "nth-root" | "fraction" | "abs" | "paren" | "bracket" | "summation" | "integral" | "line-integral" }
  | { type: "insert-symbol"; value: string }
  | { type: "insert-trig"; name: "sin" | "cos" | "tan" | "cot" | "sec" | "csc" }
  | { type: "insert-invtrig"; name: "sin" | "cos" | "tan" }
  | { type: "insert-log" }
  | { type: "insert-ln" }
  | { type: "wrap-fraction" }
  | { type: "wrap-power-top-right" }
  | { type: "wrap-paren" };

export type FormulaInsertLocation =
  | {
      kind: "row";
      index?: number;
    }
  | {
      kind: "slot";
      slot: string;
      replace?: boolean;
    };

export type WrappableFormulaNodeType =
  | "power"
  | "sqrt"
  | "fraction"
  | "abs"
  | "paren"
  | "bracket"
  | "summation"
  | "trig"
  | "invtrig"
  | "log"
  | "ln"
  | "integral";

export type FormulaAction =
  | {
      type: "INSERT_NODE";
      parentId: string;
      location: FormulaInsertLocation;
      node: FormulaNode;
    }
  | {
      type: "DELETE_NODE";
      nodeId: string;
    }
  | {
      type: "UPDATE_VALUE";
      nodeId: string;
      value: string;
    }
  | {
      type: "WRAP_IN";
      nodeId: string;
      wrapperType: WrappableFormulaNodeType;
      powerPosition?: PowerPosition;
      functionName?: string;
    }
  | {
      type: "UNWRAP";
      nodeId: string;
    };
