import { useState, useEffect } from "react";
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

const fonts = [
  "Inter",
  "Arial",
  "Georgia",
  "Courier New",
  "Times New Roman",
  "Verdana",
];
const presetColors = [
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

export default function PropertiesPanel() {
  const { canvas, selectedObjects, saveStateRef } = useCanvasContext();
  const [, forceUpdate] = useState(0);
  const obj = selectedObjects.length === 1 ? selectedObjects[0] : null;

  const { bringForward, sendBackward } = useFabric();

  useEffect(() => {
    if (!canvas) return;
    const refresh = () => forceUpdate((n) => n + 1);
    canvas.on("object:modified", refresh);
    canvas.on("selection:created", refresh);
    canvas.on("selection:updated", refresh);
    return () => {
      canvas.off("object:modified", refresh);
      canvas.off("selection:created", refresh);
      canvas.off("selection:updated", refresh);
    };
  }, [canvas]);

  if (!canvas) return <div></div>;

  if (!obj) {
    return (
      <aside className="w-64 bg-surface-dark border-l border-toolbar-border p-4 shrink-0 overflow-y-auto scrollbar-thin">
        <p className="text-xs text-surface-darker-foreground text-center mt-8">
          Select an object to edit its properties
        </p>
      </aside>
    );
  }

  const isText =
    obj.type === "i-text" || obj.type === "text" || obj.type === "textbox";
  const isCropping = false; // placeholder for crop state
  const isImage = obj.type === "image";
  const isShape = !isText && !isImage;

  const update = (props: Record<string, any>) => {
    saveStateRef.current?.();
    obj.set(props);
    canvas?.renderAll();
    forceUpdate((n) => n + 1);
  };

  return (
    <aside className="w-64 bg-surface-dark border-l border-toolbar-border flex flex-col shrink-0 overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-5">
        <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider">
          Properties
        </h3>

        {/* Global: Opacity */}
        <Section label="Opacity">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((obj.opacity ?? 1) * 100)}
            onChange={(e) => update({ opacity: Number(e.target.value) / 100 })}
            className="w-full accent-primary"
          />
          <span className="text-[10px] text-surface-darker-foreground">
            {Math.round((obj.opacity ?? 1) * 100)}%
          </span>
        </Section>

        {/* Global: Layering */}
        <Section label="Layer">
          <div className="flex gap-1">
            <SmallButton
              icon={ArrowUp}
              onClick={bringForward}
              title="Bring Forward"
            />
            <SmallButton
              icon={ArrowDown}
              onClick={sendBackward}
              title="Send Backward"
            />
          </div>
        </Section>

        {/* Text properties */}
        {isText && (
          <>
            <Section label="Font Family">
              <select
                value={(obj as IText).fontFamily || "Inter"}
                onChange={(e) => update({ fontFamily: e.target.value })}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              >
                {fonts.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Section>

            <Section label="Font Size">
              <input
                type="number"
                min={8}
                max={200}
                value={(obj as IText).fontSize || 16}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              />
            </Section>

            <Section label="Style">
              <div className="flex gap-1">
                <SmallButton
                  icon={Bold}
                  active={(obj as IText).fontWeight === "bold"}
                  onClick={() =>
                    update({
                      fontWeight:
                        (obj as IText).fontWeight === "bold"
                          ? "normal"
                          : "bold",
                    })
                  }
                />
                <SmallButton
                  icon={Italic}
                  active={(obj as IText).fontStyle === "italic"}
                  onClick={() =>
                    update({
                      fontStyle:
                        (obj as IText).fontStyle === "italic"
                          ? "normal"
                          : "italic",
                    })
                  }
                />
              </div>
            </Section>

            <Section label="Alignment">
              <div className="flex gap-1">
                <SmallButton
                  icon={AlignLeft}
                  active={(obj as IText).textAlign === "left"}
                  onClick={() => update({ textAlign: "left" })}
                />
                <SmallButton
                  icon={AlignCenter}
                  active={(obj as IText).textAlign === "center"}
                  onClick={() => update({ textAlign: "center" })}
                />
                <SmallButton
                  icon={AlignRight}
                  active={(obj as IText).textAlign === "right"}
                  onClick={() => update({ textAlign: "right" })}
                />
              </div>
            </Section>

            <Section label="Line Height">
              <input
                type="number"
                min={0.5}
                max={3}
                step={0.1}
                value={(obj as IText).lineHeight || 1.2}
                onChange={(e) => update({ lineHeight: Number(e.target.value) })}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              />
            </Section>

            <ColorPicker
              label="Text Color"
              value={((obj as IText).fill as string) || "#000000"}
              onChange={(v) => update({ fill: v })}
            />
          </>
        )}

        {/* Shape properties */}
        {isShape && (
          <>
            <ColorPicker
              label="Fill"
              value={(obj.fill as string) || "#6c5ce7"}
              onChange={(v) => update({ fill: v })}
            />
            <ColorPicker
              label="Stroke"
              value={(obj.stroke as string) || ""}
              onChange={(v) =>
                update({ stroke: v, strokeWidth: obj.strokeWidth || 2 })
              }
            />
            <Section label="Stroke Width">
              <input
                type="number"
                min={0}
                max={20}
                value={obj.strokeWidth || 0}
                onChange={(e) =>
                  update({ strokeWidth: Number(e.target.value) })
                }
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              />
            </Section>
            {obj.type === "rect" && (
              <Section label="Corner Radius">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={(obj as Rect).rx || 0}
                  onChange={(e) =>
                    update({
                      rx: Number(e.target.value),
                      ry: Number(e.target.value),
                    })
                  }
                  className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
                />
              </Section>
            )}
          </>
        )}

        {/* Image properties */}
        {isImage && (
          <>
            <Section label="Crop">
              <button
                onClick={() => {
                  if (!canvas) return;
                  saveStateRef.current?.();
                  const img = obj as FabricImage;
                  const el = img.getElement() as HTMLImageElement;
                  const origW = el.naturalWidth;
                  const origH = el.naturalHeight;
                  // Crop to center 80%
                  const cropX = origW * 0.1;
                  const cropY = origH * 0.1;
                  const cropW = origW * 0.8;
                  const cropH = origH * 0.8;
                  img.set({
                    cropX,
                    cropY,
                    width: cropW,
                    height: cropH,
                  });
                  canvas.renderAll();
                  forceUpdate((n) => n + 1);
                }}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 hover:bg-primary/20 transition-colors"
              >
                Crop Center 80%
              </button>
              <button
                onClick={() => {
                  if (!canvas) return;
                  saveStateRef.current?.();
                  const img = obj as FabricImage;
                  const el = img.getElement() as HTMLImageElement;
                  img.set({
                    cropX: 0,
                    cropY: 0,
                    width: el.naturalWidth,
                    height: el.naturalHeight,
                  });
                  canvas.renderAll();
                  forceUpdate((n) => n + 1);
                }}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 hover:bg-primary/20 transition-colors mt-1"
              >
                Reset Crop
              </button>
            </Section>
            <Section label="Filters">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    saveStateRef.current?.();
                    const img = obj as FabricImage;
                    img.filters = [new filters.Grayscale()];
                    img.applyFilters();
                    canvas?.renderAll();
                  }}
                  className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 hover:bg-primary/20 transition-colors"
                >
                  Grayscale
                </button>
                <button
                  onClick={() => {
                    saveStateRef.current?.();
                    const img = obj as FabricImage;
                    img.filters = [new filters.Sepia()];
                    img.applyFilters();
                    canvas?.renderAll();
                  }}
                  className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 hover:bg-primary/20 transition-colors"
                >
                  Sepia
                </button>
                <button
                  onClick={() => {
                    saveStateRef.current?.();
                    const img = obj as FabricImage;
                    img.filters = [];
                    img.applyFilters();
                    canvas?.renderAll();
                  }}
                  className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 hover:bg-primary/20 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] text-surface-darker-foreground uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function SmallButton({
  icon: Icon,
  onClick,
  active,
  title,
}: {
  icon: any;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface-hover text-surface-dark-foreground hover:bg-primary/20"
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Section label={label}>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-toolbar-border cursor-pointer"
        />
        {presetColors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-5 h-5 rounded-full border transition-transform ${
              value === c ? "border-primary scale-125" : "border-toolbar-border"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </Section>
  );
}
