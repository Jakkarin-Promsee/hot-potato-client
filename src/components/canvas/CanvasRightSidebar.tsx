import { useState, useEffect, useCallback, memo } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import {
  ArrowUp,
  ArrowDown,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { FabricImage, filters, IText, Rect } from "fabric";
import { useFabric } from "@/hooks/useFabric";

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelMode = "none" | "text" | "shape" | "image";

interface TextAttrs {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  lineHeight: number;
  fill: string;
}

interface ShapeAttrs {
  fill: string;
  stroke: string;
  strokeWidth: number;
  rx: number;
  isRect: boolean;
  opacity: number;
}

interface ImageAttrs {
  opacity: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = [
  "Inter",
  "Arial",
  "Georgia",
  "Courier New",
  "Times New Roman",
  "Verdana",
];

const PRESET_COLORS = [
  "#1a1a2e",
  "#6c5ce7",
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#e91e63",
  "#1abc9c",
  "#ffffff",
  "#2d3436",
];

const MODE_LABELS: Record<PanelMode, string> = {
  none: "Nothing selected",
  text: "Text",
  shape: "Shape",
  image: "Image",
};

// ─── Shared primitives ────────────────────────────────────────────────────────

const Section = memo(
  ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {title}
      </span>
      {children}
    </div>
  ),
);

const Row = memo(
  ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  ),
);

const IconBtn = memo(
  ({
    icon: Icon,
    onClick,
    active = false,
    title,
  }: {
    icon: React.ElementType;
    onClick: () => void;
    active?: boolean;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50"
      }`}
    >
      <Icon size={13} strokeWidth={1.8} />
    </button>
  ),
);

const NumberInput = memo(
  ({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
  }) => (
    <Row label={label}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40 text-right"
      />
    </Row>
  ),
);

const SliderRow = memo(
  ({
    label,
    value,
    min,
    max,
    display,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    display: string;
    onChange: (v: number) => void;
  }) => (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground/70">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  ),
);

const ColorRow = memo(
  ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="mb-3">
      <span className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border"
        />
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`h-5 w-5 rounded-full border-2 transition-transform ${
              value === c ? "border-primary scale-125" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  ),
);

// ─── Panel components ─────────────────────────────────────────────────────────

const NonePanel = memo(() => (
  <Section title="Canvas">
    <p className="text-xs text-muted-foreground/60 py-2">
      Select an object to edit its properties.
    </p>
  </Section>
));

const LayerSection = memo(
  ({
    bringForward,
    sendBackward,
  }: {
    bringForward: () => void;
    sendBackward: () => void;
  }) => (
    <Section title="Layer">
      <Row label="Order">
        <IconBtn icon={ArrowUp} onClick={bringForward} title="Bring Forward" />
        <IconBtn
          icon={ArrowDown}
          onClick={sendBackward}
          title="Send Backward"
        />
      </Row>
    </Section>
  ),
);

const TextPanel = memo(
  ({
    attrs,
    onUpdate,
  }: {
    attrs: TextAttrs;
    onUpdate: (props: Record<string, any>) => void;
  }) => (
    <>
      <Section title="Font">
        <Row label="Family">
          <select
            value={attrs.fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className="w-36 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40"
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Row>
        <NumberInput
          label="Size"
          value={attrs.fontSize}
          min={8}
          max={200}
          onChange={(v) => onUpdate({ fontSize: v })}
        />
        <Row label="Style">
          <IconBtn
            icon={Bold}
            active={attrs.fontWeight === "bold"}
            onClick={() =>
              onUpdate({
                fontWeight: attrs.fontWeight === "bold" ? "normal" : "bold",
              })
            }
          />
          <IconBtn
            icon={Italic}
            active={attrs.fontStyle === "italic"}
            onClick={() =>
              onUpdate({
                fontStyle: attrs.fontStyle === "italic" ? "normal" : "italic",
              })
            }
          />
        </Row>
        <Row label="Align">
          <IconBtn
            icon={AlignLeft}
            active={attrs.textAlign === "left"}
            onClick={() => onUpdate({ textAlign: "left" })}
          />
          <IconBtn
            icon={AlignCenter}
            active={attrs.textAlign === "center"}
            onClick={() => onUpdate({ textAlign: "center" })}
          />
          <IconBtn
            icon={AlignRight}
            active={attrs.textAlign === "right"}
            onClick={() => onUpdate({ textAlign: "right" })}
          />
        </Row>
        <NumberInput
          label="Line Height"
          value={attrs.lineHeight}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) => onUpdate({ lineHeight: v })}
        />
      </Section>

      <Section title="Color">
        <ColorRow
          label="Text Color"
          value={attrs.fill}
          onChange={(v) => onUpdate({ fill: v })}
        />
      </Section>
    </>
  ),
);

const ShapePanel = memo(
  ({
    attrs,
    onUpdate,
  }: {
    attrs: ShapeAttrs;
    onUpdate: (props: Record<string, any>) => void;
  }) => (
    <>
      <Section title="Appearance">
        <ColorRow
          label="Fill"
          value={attrs.fill}
          onChange={(v) => onUpdate({ fill: v })}
        />
        <ColorRow
          label="Stroke"
          value={attrs.stroke}
          onChange={(v) =>
            onUpdate({ stroke: v, strokeWidth: attrs.strokeWidth || 2 })
          }
        />
        <NumberInput
          label="Stroke Width"
          value={attrs.strokeWidth}
          min={0}
          max={20}
          onChange={(v) => onUpdate({ strokeWidth: v })}
        />
        {attrs.isRect && (
          <NumberInput
            label="Corner Radius"
            value={attrs.rx}
            min={0}
            max={100}
            onChange={(v) => onUpdate({ rx: v, ry: v })}
          />
        )}
      </Section>
    </>
  ),
);

const ImagePanel = memo(
  ({
    obj,
    canvas,
    saveStateRef,
    forceUpdate,
  }: {
    obj: FabricImage;
    canvas: any;
    saveStateRef: React.RefObject<(() => void) | null>;
    forceUpdate: () => void;
  }) => (
    <Section title="Image">
      <div className="mb-3 flex flex-col gap-1.5">
        <button
          onClick={() => {
            if (!canvas) return;
            saveStateRef.current?.();
            const el = obj.getElement() as HTMLImageElement;
            obj.set({
              cropX: el.naturalWidth * 0.1,
              cropY: el.naturalHeight * 0.1,
              width: el.naturalWidth * 0.8,
              height: el.naturalHeight * 0.8,
            });
            canvas.renderAll();
            forceUpdate();
          }}
          className="w-full rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Crop Center 80%
        </button>
        <button
          onClick={() => {
            if (!canvas) return;
            saveStateRef.current?.();
            const el = obj.getElement() as HTMLImageElement;
            obj.set({
              cropX: 0,
              cropY: 0,
              width: el.naturalWidth,
              height: el.naturalHeight,
            });
            canvas.renderAll();
            forceUpdate();
          }}
          className="w-full rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Reset Crop
        </button>
      </div>

      <span className="mb-1.5 block text-xs text-muted-foreground">
        Filters
      </span>
      <div className="flex flex-col gap-1.5">
        {[
          {
            label: "Grayscale",
            apply: () => {
              obj.filters = [new filters.Grayscale()];
              obj.applyFilters();
              canvas?.renderAll();
            },
          },
          {
            label: "Sepia",
            apply: () => {
              obj.filters = [new filters.Sepia()];
              obj.applyFilters();
              canvas?.renderAll();
            },
          },
          {
            label: "None",
            apply: () => {
              obj.filters = [];
              obj.applyFilters();
              canvas?.renderAll();
            },
          },
        ].map(({ label, apply }) => (
          <button
            key={label}
            onClick={() => {
              saveStateRef.current?.();
              apply();
            }}
            className="w-full rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </Section>
  ),
);

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function CanvasRightSidebar() {
  const { canvas, selectedObjects, saveStateRef } = useCanvasContext();
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((n) => n + 1), []);

  const obj = selectedObjects.length === 1 ? selectedObjects[0] : null;
  const { bringForward, sendBackward } = useFabric();

  // Re-render when canvas selection/modification changes
  useEffect(() => {
    if (!canvas) return;
    canvas.on("object:modified", forceUpdate);
    canvas.on("selection:created", forceUpdate);
    canvas.on("selection:updated", forceUpdate);
    return () => {
      canvas.off("object:modified", forceUpdate);
      canvas.off("selection:created", forceUpdate);
      canvas.off("selection:updated", forceUpdate);
    };
  }, [canvas, forceUpdate]);

  // Derive mode and attrs from the selected object
  const isText =
    obj &&
    (obj.type === "i-text" || obj.type === "text" || obj.type === "textbox");
  const isImage = obj && obj.type === "image";
  const isShape = obj && !isText && !isImage;

  const mode: PanelMode = !obj
    ? "none"
    : isText
    ? "text"
    : isImage
    ? "image"
    : "shape";

  const update = useCallback(
    (props: Record<string, any>) => {
      if (!obj || !canvas) return;
      saveStateRef.current?.();
      obj.set(props);
      canvas.renderAll();
      forceUpdate();
    },
    [obj, canvas, saveStateRef, forceUpdate],
  );

  // Snapshot attrs from the live object — safe because forceUpdate re-renders on every change
  const textAttrs: TextAttrs = isText
    ? {
        fontFamily: (obj as IText).fontFamily || "Inter",
        fontSize: (obj as IText).fontSize || 16,
        fontWeight: ((obj as IText).fontWeight as string) || "normal",
        fontStyle: ((obj as IText).fontStyle as string) || "normal",
        textAlign: (obj as IText).textAlign || "left",
        lineHeight: (obj as IText).lineHeight || 1.2,
        fill: ((obj as IText).fill as string) || "#000000",
      }
    : {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: "normal",
        fontStyle: "normal",
        textAlign: "left",
        lineHeight: 1.2,
        fill: "#000000",
      };

  const shapeAttrs: ShapeAttrs = isShape
    ? {
        fill: (obj!.fill as string) || "#6c5ce7",
        stroke: (obj!.stroke as string) || "",
        strokeWidth: obj!.strokeWidth || 0,
        rx: (obj as Rect).rx || 0,
        isRect: obj!.type === "rect",
        opacity: obj!.opacity ?? 1,
      }
    : {
        fill: "#6c5ce7",
        stroke: "",
        strokeWidth: 0,
        rx: 0,
        isRect: false,
        opacity: 1,
      };

  const opacity = obj ? Math.round((obj.opacity ?? 1) * 100) : 100;

  return (
    <div className="flex h-full flex-col border-l border-border bg-editor-surface">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-editor-surface px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Properties
        </span>
        <p className="text-xs font-medium text-foreground">
          {MODE_LABELS[mode]}
        </p>
      </div>

      {/* ── Scrollable panel ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === "none" && <NonePanel />}

        {obj && (
          <>
            {/* Opacity — universal */}
            <Section title="Opacity">
              <SliderRow
                label="Opacity"
                value={opacity}
                min={0}
                max={100}
                display={`${opacity}%`}
                onChange={(v) => update({ opacity: v / 100 })}
              />
            </Section>

            {/* Layer — universal */}
            <LayerSection
              bringForward={bringForward}
              sendBackward={sendBackward}
            />

            {/* Mode-specific panels */}
            {isText && <TextPanel attrs={textAttrs} onUpdate={update} />}
            {isShape && <ShapePanel attrs={shapeAttrs} onUpdate={update} />}
            {isImage && (
              <ImagePanel
                obj={obj as FabricImage}
                canvas={canvas}
                saveStateRef={saveStateRef}
                forceUpdate={forceUpdate}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
