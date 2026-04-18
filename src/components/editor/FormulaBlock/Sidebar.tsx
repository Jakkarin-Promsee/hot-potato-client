import { memo, useState } from "react";
import { createFormulaNode } from "./formulaReducer";
import type { FormulaAction, PowerPosition } from "./types";

type FormulaSidebarProps = {
  activeNodeId: string;
  dispatch: React.Dispatch<FormulaAction>;
};

type SidebarSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

type InsertButtonProps = {
  label: string;
  onClick: () => void;
};

const SidebarSection = memo(function SidebarSection({
  title,
  defaultOpen = true,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700"
      >
        <span>{title}</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>

      {open && <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">{children}</div>}
    </section>
  );
});

const InsertButton = memo(function InsertButton({ label, onClick }: InsertButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
    >
      {label}
    </button>
  );
});

function makePowerNode(powerPosition: PowerPosition) {
  return createFormulaNode("power", {
    powerPosition,
    slots: {
      base: createFormulaNode("variable", { value: "x" }),
      exponent: createFormulaNode("number", { value: "" }),
    },
  });
}

const FormulaSidebar = memo(function FormulaSidebar({
  activeNodeId,
  dispatch,
}: FormulaSidebarProps) {
  const insertPowerNode = (position: PowerPosition) => {
    dispatch({
      type: "INSERT_NODE",
      parentId: activeNodeId,
      location: { kind: "row" },
      node: makePowerNode(position),
    });
  };

  return (
    <aside className="w-[200px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2">
      <div className="space-y-2">
        <SidebarSection title="Powers & indices">
          <InsertButton
            label="x²"
            onClick={() => insertPowerNode("top-right")}
          />
          <InsertButton
            label="x₂"
            onClick={() => insertPowerNode("bottom-right")}
          />
          <InsertButton
            label="²x"
            onClick={() => insertPowerNode("top-left")}
          />
          <InsertButton
            label="₂x"
            onClick={() => insertPowerNode("bottom-left")}
          />
        </SidebarSection>

        {/* Add next sections incrementally:
            Structure, Trig, Logarithms, Constants, Operators, Physics symbols */}
      </div>
    </aside>
  );
});

export default FormulaSidebar;
