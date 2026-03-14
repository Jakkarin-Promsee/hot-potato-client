import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import {
  ArrowUp,
  ArrowDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Group,
  Ungroup,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  FabricImage,
  filters,
  IText,
  Rect,
  Group as FabricGroup,
} from "fabric";
import { useFabric } from "@/hooks/useFabric";

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelMode = "none" | "text" | "shape" | "image" | "multi";

interface TextAttrs {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
  fill: string;
  underline: boolean;
  linethrough: boolean;
  textBackgroundColor: string;
  textTransform: "none" | "uppercase" | "lowercase";
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

interface ShapeAttrs {
  fill: string;
  stroke: string;
  strokeWidth: number;
  rx: number;
  isRect: boolean;
  opacity: number;
}

interface MixedAttrs {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = [
  "Inter",
  "Arial",
  "Verdana",
  "Trebuchet MS",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Garamond",
  "Palatino",
  "Courier New",
  "Lucida Console",
  "Impact",
  "Comic Sans MS",
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
  multi: "Multiple items",
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
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
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

const NavButton = memo(
  ({
    icon: Icon,
    onClick,
    title,
  }: {
    icon: React.ElementType;
    onClick: () => void;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors w-full justify-center"
    >
      <Icon size={13} strokeWidth={1.8} />
      {title}
    </button>
  ),
);

// ─── FontDropdown ─────────────────────────────────────────────────────────────
//
// Replaces native <select> which has a critical bug: the native dropdown closes
// on mouseup, but our sidebar sets isSidebarInteracting.current on mousedown,
// which fires during the first click to open — causing the dropdown to immediately
// close before the user can select an option.
//
// This custom dropdown is built entirely from <button> elements so it survives
// the sidebar's mousedown/mouseup guard cycle without issue.

const FontDropdown = memo(
  ({
    value,
    onChangeLive,
    onCommit,
  }: {
    value: string;
    onChangeLive: (v: string) => void;
    onCommit: (v: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };
      // Use capture so we catch clicks before they bubble
      document.addEventListener("mousedown", handler, true);
      return () => document.removeEventListener("mousedown", handler, true);
    }, [open]);

    return (
      <div ref={containerRef} className="relative w-36">
        {/* Trigger button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded border border-border bg-background px-2 py-1 text-xs outline-none hover:border-primary/50 focus:ring-1 focus:ring-primary/40"
          style={{ fontFamily: value }}
        >
          <span className="truncate">{value}</span>
          <ChevronDown
            size={11}
            className={`ml-1 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown list — rendered in a portal-like absolute positioned layer */}
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto py-1">
              {FONTS.map((f) => (
                <button
                  key={f}
                  // Use onMouseDown instead of onClick so the selection fires
                  // before the outside-click handler can close the dropdown
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur on any focused input
                    onChangeLive(f);
                    onCommit(f);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-accent/60 transition-colors ${
                    value === f
                      ? "text-foreground bg-accent/30"
                      : "text-muted-foreground"
                  }`}
                  style={{ fontFamily: f }}
                >
                  <span>{f}</span>
                  {value === f && (
                    <Check size={10} className="text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

// ─── SliderNumber ─────────────────────────────────────────────────────────────
//
// Combined control: left = range slider, right = number input.
// Both share the same live/commit pair:
//   - slider onChange → live, mouseUp → commit
//   - number onChange → live, onBlur  → commit

const SliderNumber = memo(
  ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = "",
    onLive,
    onCommit,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onLive: (v: number) => void;
    onCommit: (v: number) => void;
  }) => (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Range slider — left half */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onLive(Number(e.target.value))}
          onMouseUp={(e) =>
            onCommit(Number((e.target as HTMLInputElement).value))
          }
          onTouchEnd={(e) =>
            onCommit(Number((e.target as HTMLInputElement).value))
          }
          className="flex-1 accent-primary h-1.5"
        />
        {/* Number input — right half */}
        <div className="flex items-center gap-0.5 shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onLive(Number(e.target.value))}
            onBlur={(e) => onCommit(Number(e.target.value))}
            className="w-14 rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40 text-right"
          />
          {unit && (
            <span className="text-[10px] text-muted-foreground/60">{unit}</span>
          )}
        </div>
      </div>
    </div>
  ),
);

// ─── SliderRow (opacity only — already full-width, kept as-is) ────────────────

const SliderRow = memo(
  ({
    label,
    value,
    min,
    max,
    display,
    onChange,
    onCommit,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    display: string;
    onChange: (v: number) => void;
    onCommit?: () => void;
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
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="w-full accent-primary"
      />
    </div>
  ),
);

// ─── ColorRow ─────────────────────────────────────────────────────────────────
//
// Transparent swatch is now ALWAYS shown (removed the allowTransparent prop —
// every color in the app can be transparent/none).
//
// Picker:   onChange → onChangeLive  |  onBlur → onCommit
// Swatches: onClick  → onCommit  (discrete single click)
// Transparent: onClick → onCommit("")

const ColorRow = memo(
  ({
    label,
    value,
    onChangeLive,
    onCommit,
  }: {
    label: string;
    value: string;
    onChangeLive: (v: string) => void;
    onCommit: (v: string) => void;
  }) => (
    <div className="mb-3">
      <span className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Native color picker — live while dragging, commit on blur */}
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChangeLive(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border"
        />

        {/* Transparent / none swatch — always visible */}
        <button
          onClick={() => onCommit("")}
          title="None / Transparent"
          className={`h-5 w-5 rounded-full border-2 transition-transform flex items-center justify-center shrink-0 ${
            value === "" ? "border-primary scale-125" : "border-border"
          }`}
          style={{
            background:
              "repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 8px 8px",
          }}
        />

        {/* Preset swatches — discrete clicks, commit immediately */}
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onCommit(c)}
            className={`h-5 w-5 rounded-full border-2 transition-transform shrink-0 ${
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

// ─── Rich TextPanel ───────────────────────────────────────────────────────────

const TextPanel = memo(
  ({
    attrs,
    onLive,
    onCommit,
  }: {
    attrs: TextAttrs;
    onLive: (props: Record<string, any>) => void;
    onCommit: (props: Record<string, any>) => void;
  }) => {
    const buildShadow = (
      color: string,
      blur: number,
      offsetX: number,
      offsetY: number,
    ) => (!color ? null : { color, blur, offsetX, offsetY });

    return (
      <>
        {/* ── Font ── */}
        <Section title="Font">
          {/*
           * Font family — custom dropdown (not native <select>).
           * Native <select> breaks because the sidebar's onMouseDown guard fires
           * on the first click (to open), which the browser treats as the start
           * of a drag, closing the native dropdown on mouseup before the user
           * can choose. The custom dropdown uses onMouseDown on each option
           * with e.preventDefault() to avoid this.
           */}
          <Row label="Family">
            <FontDropdown
              value={attrs.fontFamily}
              onChangeLive={(v) => onLive({ fontFamily: v })}
              onCommit={(v) => onCommit({ fontFamily: v })}
            />
          </Row>

          {/* Font size — slider + number input */}
          <SliderNumber
            label="Size"
            value={attrs.fontSize}
            min={8}
            max={400}
            step={1}
            unit="px"
            onLive={(v) => onLive({ fontSize: v })}
            onCommit={(v) => onCommit({ fontSize: v })}
          />

          {/* Style toggles — discrete clicks, commit immediately */}
          <Row label="Style">
            <IconBtn
              icon={Bold}
              active={attrs.fontWeight === "bold"}
              title="Bold"
              onClick={() =>
                onCommit({
                  fontWeight: attrs.fontWeight === "bold" ? "normal" : "bold",
                })
              }
            />
            <IconBtn
              icon={Italic}
              active={attrs.fontStyle === "italic"}
              title="Italic"
              onClick={() =>
                onCommit({
                  fontStyle: attrs.fontStyle === "italic" ? "normal" : "italic",
                })
              }
            />
            <IconBtn
              icon={Underline}
              active={attrs.underline}
              title="Underline"
              onClick={() => onCommit({ underline: !attrs.underline })}
            />
            <IconBtn
              icon={Strikethrough}
              active={attrs.linethrough}
              title="Strikethrough"
              onClick={() => onCommit({ linethrough: !attrs.linethrough })}
            />
          </Row>

          {/* Alignment — discrete clicks */}
          <Row label="Align">
            <IconBtn
              icon={AlignLeft}
              active={attrs.textAlign === "left"}
              title="Left"
              onClick={() => onCommit({ textAlign: "left" })}
            />
            <IconBtn
              icon={AlignCenter}
              active={attrs.textAlign === "center"}
              title="Center"
              onClick={() => onCommit({ textAlign: "center" })}
            />
            <IconBtn
              icon={AlignRight}
              active={attrs.textAlign === "right"}
              title="Right"
              onClick={() => onCommit({ textAlign: "right" })}
            />
            <IconBtn
              icon={AlignJustify}
              active={attrs.textAlign === "justify"}
              title="Justify"
              onClick={() => onCommit({ textAlign: "justify" })}
            />
          </Row>

          {/* Transform — discrete clicks */}
          <Row label="Transform">
            <div className="flex items-center gap-1">
              {[
                { value: "none" as const, label: "Aa" },
                { value: "uppercase" as const, label: "AA" },
                { value: "lowercase" as const, label: "aa" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  title={value}
                  onClick={() => onCommit({ textTransform: value })}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                    attrs.textTransform === value
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── Spacing ── */}
        <Section title="Spacing">
          {/* Line height — slider + number */}
          <SliderNumber
            label="Line Height"
            value={attrs.lineHeight}
            min={0.5}
            max={5}
            step={0.1}
            onLive={(v) => onLive({ lineHeight: v })}
            onCommit={(v) => onCommit({ lineHeight: v })}
          />

          {/* Letter spacing — slider + number */}
          <SliderNumber
            label="Letter Spacing"
            value={attrs.charSpacing}
            min={-200}
            max={800}
            step={10}
            onLive={(v) => onLive({ charSpacing: v })}
            onCommit={(v) => onCommit({ charSpacing: v })}
          />
        </Section>

        {/* ── Color ── */}
        <Section title="Color">
          <ColorRow
            label="Text Color"
            value={attrs.fill}
            onChangeLive={(v) => onLive({ fill: v })}
            onCommit={(v) => onCommit({ fill: v })}
          />
          <ColorRow
            label="Highlight / Background"
            value={attrs.textBackgroundColor}
            onChangeLive={(v) => onLive({ textBackgroundColor: v })}
            onCommit={(v) => onCommit({ textBackgroundColor: v })}
          />
        </Section>

        {/* ── Text Shadow ── */}
        <Section title="Text Shadow">
          <ColorRow
            label="Shadow Color"
            value={attrs.shadowColor}
            onChangeLive={(v) =>
              onLive({
                shadow: buildShadow(
                  v,
                  attrs.shadowBlur,
                  attrs.shadowOffsetX,
                  attrs.shadowOffsetY,
                ),
              })
            }
            onCommit={(v) =>
              onCommit({
                shadow: buildShadow(
                  v,
                  attrs.shadowBlur,
                  attrs.shadowOffsetX,
                  attrs.shadowOffsetY,
                ),
              })
            }
          />

          {attrs.shadowColor && (
            <>
              {/* Shadow blur — slider + number */}
              <SliderNumber
                label="Blur"
                value={attrs.shadowBlur}
                min={0}
                max={50}
                step={1}
                unit="px"
                onLive={(v) =>
                  onLive({
                    shadow: buildShadow(
                      attrs.shadowColor,
                      v,
                      attrs.shadowOffsetX,
                      attrs.shadowOffsetY,
                    ),
                  })
                }
                onCommit={(v) =>
                  onCommit({
                    shadow: buildShadow(
                      attrs.shadowColor,
                      v,
                      attrs.shadowOffsetX,
                      attrs.shadowOffsetY,
                    ),
                  })
                }
              />

              {/* Shadow offset X / Y — two SliderNumbers */}
              <SliderNumber
                label="Offset X"
                value={attrs.shadowOffsetX}
                min={-50}
                max={50}
                step={1}
                unit="px"
                onLive={(v) =>
                  onLive({
                    shadow: buildShadow(
                      attrs.shadowColor,
                      attrs.shadowBlur,
                      v,
                      attrs.shadowOffsetY,
                    ),
                  })
                }
                onCommit={(v) =>
                  onCommit({
                    shadow: buildShadow(
                      attrs.shadowColor,
                      attrs.shadowBlur,
                      v,
                      attrs.shadowOffsetY,
                    ),
                  })
                }
              />
              <SliderNumber
                label="Offset Y"
                value={attrs.shadowOffsetY}
                min={-50}
                max={50}
                step={1}
                unit="px"
                onLive={(v) =>
                  onLive({
                    shadow: buildShadow(
                      attrs.shadowColor,
                      attrs.shadowBlur,
                      attrs.shadowOffsetX,
                      v,
                    ),
                  })
                }
                onCommit={(v) =>
                  onCommit({
                    shadow: buildShadow(
                      attrs.shadowColor,
                      attrs.shadowBlur,
                      attrs.shadowOffsetX,
                      v,
                    ),
                  })
                }
              />
            </>
          )}
        </Section>
      </>
    );
  },
);

// ─── ShapePanel ───────────────────────────────────────────────────────────────

const ShapePanel = memo(
  ({
    attrs,
    onLive,
    onCommit,
  }: {
    attrs: ShapeAttrs;
    onLive: (props: Record<string, any>) => void;
    onCommit: (props: Record<string, any>) => void;
  }) => (
    <>
      <Section title="Appearance">
        <ColorRow
          label="Fill"
          value={attrs.fill}
          onChangeLive={(v) => onLive({ fill: v })}
          onCommit={(v) => onCommit({ fill: v })}
        />
        <ColorRow
          label="Stroke"
          value={attrs.stroke}
          onChangeLive={(v) =>
            onLive({ stroke: v, strokeWidth: attrs.strokeWidth || 2 })
          }
          onCommit={(v) =>
            onCommit({ stroke: v, strokeWidth: attrs.strokeWidth || 2 })
          }
        />
        {/* Stroke width — slider + number */}
        <SliderNumber
          label="Stroke Width"
          value={attrs.strokeWidth}
          min={0}
          max={20}
          step={1}
          unit="px"
          onLive={(v) => onLive({ strokeWidth: v })}
          onCommit={(v) => onCommit({ strokeWidth: v })}
        />
        {attrs.isRect && (
          <SliderNumber
            label="Corner Radius"
            value={attrs.rx}
            min={0}
            max={100}
            step={1}
            unit="px"
            onLive={(v) => onLive({ rx: v, ry: v })}
            onCommit={(v) => onCommit({ rx: v, ry: v })}
          />
        )}
      </Section>
    </>
  ),
);

// ─── MixedPanel ───────────────────────────────────────────────────────────────

const MixedPanel = memo(
  ({
    attrs,
    onLive,
    onCommit,
  }: {
    attrs: MixedAttrs;
    onLive: (props: Record<string, any>) => void;
    onCommit: (props: Record<string, any>) => void;
  }) => (
    <>
      <Section title="Appearance">
        <ColorRow
          label="Fill / Color"
          value={attrs.fill}
          onChangeLive={(v) => onLive({ fill: v })}
          onCommit={(v) => onCommit({ fill: v })}
        />
        <ColorRow
          label="Stroke"
          value={attrs.stroke}
          onChangeLive={(v) =>
            onLive({ stroke: v, strokeWidth: attrs.strokeWidth || 2 })
          }
          onCommit={(v) =>
            onCommit({ stroke: v, strokeWidth: attrs.strokeWidth || 2 })
          }
        />
        <SliderNumber
          label="Stroke Width"
          value={attrs.strokeWidth}
          min={0}
          max={20}
          step={1}
          unit="px"
          onLive={(v) => onLive({ strokeWidth: v })}
          onCommit={(v) => onCommit({ strokeWidth: v })}
        />
      </Section>
    </>
  ),
);

// ─── ImagePanel ───────────────────────────────────────────────────────────────

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
            const el = obj.getElement() as HTMLImageElement;
            obj.set({
              cropX: el.naturalWidth * 0.1,
              cropY: el.naturalHeight * 0.1,
              width: el.naturalWidth * 0.8,
              height: el.naturalHeight * 0.8,
            });
            canvas.renderAll();
            saveStateRef.current?.();
            forceUpdate();
          }}
          className="w-full rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Crop Center 80%
        </button>
        <button
          onClick={() => {
            if (!canvas) return;
            const el = obj.getElement() as HTMLImageElement;
            obj.set({
              cropX: 0,
              cropY: 0,
              width: el.naturalWidth,
              height: el.naturalHeight,
            });
            canvas.renderAll();
            saveStateRef.current?.();
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
              apply();
              saveStateRef.current?.();
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
  const { canvas, selectedObjects, saveStateRef, isSidebarInteracting } =
    useCanvasContext();
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((n) => n + 1), []);

  const obj = selectedObjects.length === 1 ? selectedObjects[0] : null;
  const {
    bringForward,
    sendBackward,
    groupSelected: groupSelection,
    ungroupSelected: ungroupSelection,
  } = useFabric();

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

  useEffect(() => {
    const onMouseUp = () => {
      isSidebarInteracting.current = false;
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [isSidebarInteracting]);

  // ── Type helpers ───────────────────────────────────────────────────────────
  const isText =
    obj &&
    (obj.type === "i-text" || obj.type === "text" || obj.type === "textbox");
  const isImage = obj && obj.type === "image";
  const isShape = obj && !isText && !isImage;

  const isMulti = selectedObjects.length > 1;
  const isGroup =
    selectedObjects.length === 1 && selectedObjects[0]?.type === "group";

  const groupChildren = isGroup
    ? (selectedObjects[0] as FabricGroup).getObjects()
    : [];
  const activeObjects = isMulti
    ? selectedObjects
    : isGroup
    ? groupChildren
    : [];

  const isTextType = (o: any) =>
    o.type === "i-text" || o.type === "text" || o.type === "textbox";
  const isImageType = (o: any) => o.type === "image";
  const isShapeType = (o: any) => !isTextType(o) && !isImageType(o);

  const multiAllText =
    activeObjects.length > 0 && activeObjects.every(isTextType);
  const multiAllShape =
    activeObjects.length > 0 && activeObjects.every(isShapeType);
  const multiMixed =
    activeObjects.length > 0 && !multiAllText && !multiAllShape;

  const mode: PanelMode =
    isMulti || isGroup
      ? "multi"
      : !obj
      ? "none"
      : isText
      ? "text"
      : isImage
      ? "image"
      : "shape";

  // ── Update primitives ──────────────────────────────────────────────────────
  //
  // THE RULE:
  //   applyLive / applyAllLive    →  mutate canvas only, NEVER call saveStateRef
  //   applyCommit / applyAllCommit →  mutate canvas THEN call saveStateRef
  //
  // Prevents Tiptap's save from blurring the Fabric canvas mid-interaction.

  const applyLive = useCallback(
    (props: Record<string, any>) => {
      if (!obj || !canvas) return;
      obj.set(props);
      canvas.renderAll();
      forceUpdate();
    },
    [obj, canvas, forceUpdate],
  );

  const applyCommit = useCallback(
    (props: Record<string, any>) => {
      if (!obj || !canvas) return;
      obj.set(props);
      canvas.renderAll();
      saveStateRef.current?.();
      forceUpdate();
    },
    [obj, canvas, saveStateRef, forceUpdate],
  );

  const applyAllLive = useCallback(
    (props: Record<string, any>) => {
      if (!canvas) return;
      const targets =
        isGroup && groupChildren.length > 0 ? groupChildren : selectedObjects;
      targets.forEach((o) => o.set(props));
      canvas.renderAll();
      forceUpdate();
    },
    [isGroup, groupChildren, selectedObjects, canvas, forceUpdate],
  );

  const applyAllCommit = useCallback(
    (props: Record<string, any>) => {
      if (!canvas) return;
      const targets =
        isGroup && groupChildren.length > 0 ? groupChildren : selectedObjects;
      targets.forEach((o) => o.set(props));
      canvas.renderAll();
      saveStateRef.current?.();
      forceUpdate();
    },
    [
      isGroup,
      groupChildren,
      selectedObjects,
      canvas,
      saveStateRef,
      forceUpdate,
    ],
  );

  // ── Attr snapshots ─────────────────────────────────────────────────────────
  const shadowObj = isText ? (obj as any).shadow : null;

  const textAttrs: TextAttrs = isText
    ? {
        fontFamily: (obj as IText).fontFamily || "Inter",
        fontSize: (obj as IText).fontSize || 16,
        fontWeight: ((obj as IText).fontWeight as string) || "normal",
        fontStyle: ((obj as IText).fontStyle as string) || "normal",
        textAlign: (obj as IText).textAlign || "left",
        lineHeight: (obj as IText).lineHeight || 1.2,
        charSpacing: (obj as IText).charSpacing || 0,
        fill: ((obj as IText).fill as string) || "#000000",
        underline: !!(obj as IText).underline,
        linethrough: !!(obj as IText).linethrough,
        textBackgroundColor: (obj as IText).textBackgroundColor || "",
        textTransform:
          ((obj as any).textTransform as TextAttrs["textTransform"]) || "none",
        shadowColor: shadowObj?.color || "",
        shadowBlur: shadowObj?.blur ?? 0,
        shadowOffsetX: shadowObj?.offsetX ?? 2,
        shadowOffsetY: shadowObj?.offsetY ?? 2,
      }
    : {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: "normal",
        fontStyle: "normal",
        textAlign: "left",
        lineHeight: 1.2,
        charSpacing: 0,
        fill: "#000000",
        underline: false,
        linethrough: false,
        textBackgroundColor: "",
        textTransform: "none",
        shadowColor: "",
        shadowBlur: 0,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
      };

  const firstActive = activeObjects[0];
  const firstShadow = firstActive ? (firstActive as any).shadow : null;

  const multiTextAttrs: TextAttrs =
    multiAllText && firstActive
      ? {
          fontFamily: (firstActive as IText).fontFamily || "Inter",
          fontSize: (firstActive as IText).fontSize || 16,
          fontWeight: ((firstActive as IText).fontWeight as string) || "normal",
          fontStyle: ((firstActive as IText).fontStyle as string) || "normal",
          textAlign: (firstActive as IText).textAlign || "left",
          lineHeight: (firstActive as IText).lineHeight || 1.2,
          charSpacing: (firstActive as IText).charSpacing || 0,
          fill: ((firstActive as IText).fill as string) || "#000000",
          underline: !!(firstActive as IText).underline,
          linethrough: !!(firstActive as IText).linethrough,
          textBackgroundColor: (firstActive as IText).textBackgroundColor || "",
          textTransform:
            ((firstActive as any)
              .textTransform as TextAttrs["textTransform"]) || "none",
          shadowColor: firstShadow?.color || "",
          shadowBlur: firstShadow?.blur ?? 0,
          shadowOffsetX: firstShadow?.offsetX ?? 2,
          shadowOffsetY: firstShadow?.offsetY ?? 2,
        }
      : textAttrs;

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

  const multiShapeAttrs: ShapeAttrs =
    multiAllShape && firstActive
      ? {
          fill: (firstActive.fill as string) || "#6c5ce7",
          stroke: (firstActive.stroke as string) || "",
          strokeWidth: firstActive.strokeWidth || 0,
          rx: (firstActive as Rect).rx || 0,
          isRect: firstActive.type === "rect",
          opacity: firstActive.opacity ?? 1,
        }
      : shapeAttrs;

  const mixedAttrs: MixedAttrs =
    multiMixed && firstActive
      ? {
          fill: (firstActive.fill as string) || "#6c5ce7",
          stroke: (firstActive.stroke as string) || "",
          strokeWidth: firstActive.strokeWidth || 0,
          opacity: firstActive.opacity ?? 1,
        }
      : { fill: "#6c5ce7", stroke: "", strokeWidth: 0, opacity: 1 };

  const opacity = obj ? Math.round((obj.opacity ?? 1) * 100) : 100;
  const multiOpacity = firstActive
    ? Math.round((firstActive.opacity ?? 1) * 100)
    : 100;

  return (
    <div
      className="flex h-full flex-col border-l border-border bg-editor-surface"
      onMouseDown={() => {
        isSidebarInteracting.current = true;
      }}
    >
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-editor-surface px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Properties
        </span>
        <p className="text-xs font-medium text-foreground">
          {mode === "multi" && isMulti
            ? `${selectedObjects.length} items selected`
            : mode === "multi" && isGroup
            ? `Group (${groupChildren.length} items)`
            : MODE_LABELS[mode]}
        </p>
      </div>

      {/* ── Scrollable panel ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === "none" && <NonePanel />}

        {/* ── Single object ── */}
        {obj && mode !== "multi" && (
          <>
            <Section title="Opacity">
              <SliderRow
                label="Opacity"
                value={opacity}
                min={0}
                max={100}
                display={`${opacity}%`}
                onChange={(v) => applyLive({ opacity: v / 100 })}
                onCommit={() => saveStateRef.current?.()}
              />
            </Section>

            <LayerSection
              bringForward={bringForward}
              sendBackward={sendBackward}
            />

            {isText && (
              <TextPanel
                attrs={textAttrs}
                onLive={applyLive}
                onCommit={applyCommit}
              />
            )}
            {isShape && (
              <ShapePanel
                attrs={shapeAttrs}
                onLive={applyLive}
                onCommit={applyCommit}
              />
            )}
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

        {/* ── Multi-select ── */}
        {mode === "multi" && (
          <>
            <Section title="Group">
              <div className="flex flex-col gap-1.5">
                {isMulti && (
                  <NavButton
                    icon={Group}
                    onClick={() => groupSelection()}
                    title="Group"
                  />
                )}
                {isGroup && (
                  <NavButton
                    icon={Ungroup}
                    onClick={() => ungroupSelection()}
                    title="Ungroup"
                  />
                )}
              </div>
            </Section>

            <Section title="Opacity">
              <SliderRow
                label="Opacity"
                value={multiOpacity}
                min={0}
                max={100}
                display={`${multiOpacity}%`}
                onChange={(v) => applyAllLive({ opacity: v / 100 })}
                onCommit={() => saveStateRef.current?.()}
              />
            </Section>

            <LayerSection
              bringForward={bringForward}
              sendBackward={sendBackward}
            />

            {multiAllText && (
              <TextPanel
                attrs={multiTextAttrs}
                onLive={applyAllLive}
                onCommit={applyAllCommit}
              />
            )}
            {multiAllShape && (
              <ShapePanel
                attrs={multiShapeAttrs}
                onLive={applyAllLive}
                onCommit={applyAllCommit}
              />
            )}
            {multiMixed && (
              <MixedPanel
                attrs={mixedAttrs}
                onLive={applyAllLive}
                onCommit={applyAllCommit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
