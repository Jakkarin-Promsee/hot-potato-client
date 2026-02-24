import { useState, useEffect, useCallback } from 'react';
import { useCanvasContext } from '@/contexts/CanvasContext';
import { ArrowUp, ArrowDown, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Crop, Check, X } from 'lucide-react';
import { fabric } from 'fabric';

interface PropertiesPanelProps {
  onBringForward: () => void;
  onSendBackward: () => void;
}

const fonts = ['Inter', 'Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana'];
const presetColors = ['#1a1a2e', '#6c5ce7', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#e91e63', '#1abc9c', '#ffffff', '#2d3436'];

export default function PropertiesPanel({ onBringForward, onSendBackward }: PropertiesPanelProps) {
  const { canvas, selectedObjects, saveState, cropMode, setCropMode } = useCanvasContext();
  const [, forceUpdate] = useState(0);
  const obj = selectedObjects.length === 1 ? selectedObjects[0] : null;

  useEffect(() => {
    if (!canvas) return;
    const refresh = () => forceUpdate(n => n + 1);
    canvas.on('object:modified', refresh);
    canvas.on('selection:created', refresh);
    canvas.on('selection:updated', refresh);
    return () => {
      canvas.off('object:modified', refresh);
      canvas.off('selection:created', refresh);
      canvas.off('selection:updated', refresh);
    };
  }, [canvas]);

  // Interactive crop
  const startCrop = useCallback(() => {
    if (!canvas || !obj || obj.type !== 'image') return;
    setCropMode(true);
    const img = obj as fabric.Image;
    // Make image non-selectable during crop
    img.selectable = false;
    img.evented = false;

    const imgLeft = img.left || 0;
    const imgTop = img.top || 0;
    const imgW = (img.width || 200) * (img.scaleX || 1);
    const imgH = (img.height || 200) * (img.scaleY || 1);

    // Semi-transparent overlay
    const overlay = new fabric.Rect({
      left: imgLeft, top: imgTop,
      width: imgW, height: imgH,
      fill: 'rgba(0,0,0,0.5)',
      selectable: false, evented: false,
    });
    (overlay as any).__cropOverlay = true;

    // Crop rect
    const padding = 20;
    const cropRect = new fabric.Rect({
      left: imgLeft + padding,
      top: imgTop + padding,
      width: imgW - padding * 2,
      height: imgH - padding * 2,
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 2,
      strokeDashArray: [6, 3],
      cornerColor: '#ffffff',
      cornerSize: 10,
      transparentCorners: false,
      hasRotatingPoint: false,
      lockRotation: true,
    });
    (cropRect as any).__cropRect = true;

    canvas.add(overlay);
    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    canvas.renderAll();
  }, [canvas, obj, setCropMode]);

  const applyCrop = useCallback(() => {
    if (!canvas) return;
    const cropRect = canvas.getObjects().find((o: any) => o.__cropRect) as fabric.Rect;
    const img = canvas.getObjects().find(o => o.type === 'image' && !(o as any).__cropOverlay) as fabric.Image;

    if (!cropRect || !img) {
      cancelCrop();
      return;
    }

    saveState();

    const imgLeft = img.left || 0;
    const imgTop = img.top || 0;
    const scaleX = img.scaleX || 1;
    const scaleY = img.scaleY || 1;

    // Calculate crop region in image coordinates
    const cropL = ((cropRect.left || 0) - imgLeft) / scaleX;
    const cropT = ((cropRect.top || 0) - imgTop) / scaleY;
    const cropW = (cropRect.width || 100) * (cropRect.scaleX || 1) / scaleX;
    const cropH = (cropRect.height || 100) * (cropRect.scaleY || 1) / scaleY;

    // Apply clipPath
    const clipPath = new fabric.Rect({
      left: cropL,
      top: cropT,
      width: cropW,
      height: cropH,
      absolutePositioned: false,
    });
    // Set originX/Y to match
    clipPath.set({ originX: 'left', originY: 'top' });
    img.clipPath = clipPath;

    // Clean up overlays
    cleanupCropObjects();
    img.selectable = true;
    img.evented = true;
    canvas.setActiveObject(img);
    canvas.renderAll();
    setCropMode(false);
  }, [canvas, saveState, setCropMode]);

  const cancelCrop = useCallback(() => {
    if (!canvas) return;
    cleanupCropObjects();
    // Re-enable image
    const img = canvas.getObjects().find(o => o.type === 'image' && !(o as any).__cropOverlay) as fabric.Image;
    if (img) {
      img.selectable = true;
      img.evented = true;
      canvas.setActiveObject(img);
    }
    canvas.renderAll();
    setCropMode(false);
  }, [canvas, setCropMode]);

  const cleanupCropObjects = useCallback(() => {
    if (!canvas) return;
    const toRemove = canvas.getObjects().filter((o: any) => o.__cropOverlay || o.__cropRect);
    toRemove.forEach(o => canvas.remove(o));
  }, [canvas]);

  if (!obj && !cropMode) {
    return (
      <aside className="w-64 bg-surface-dark border-l border-toolbar-border p-4 shrink-0 overflow-y-auto scrollbar-thin">
        <p className="text-xs text-surface-darker-foreground text-center mt-8">Select an object to edit its properties</p>
      </aside>
    );
  }

  if (cropMode) {
    return (
      <aside className="w-64 bg-surface-dark border-l border-toolbar-border flex flex-col shrink-0 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-4">
          <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider">Crop Image</h3>
          <p className="text-[10px] text-surface-darker-foreground">Drag and resize the crop rectangle, then apply.</p>
          <div className="flex gap-2">
            <button
              onClick={applyCrop}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs rounded-md py-2 hover:opacity-90 transition-opacity"
            >
              <Check size={14} /> Apply
            </button>
            <button
              onClick={cancelCrop}
              className="flex-1 flex items-center justify-center gap-1.5 bg-surface-hover text-surface-dark-foreground text-xs rounded-md py-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const isText = obj!.type === 'i-text' || obj!.type === 'text' || obj!.type === 'textbox';
  const isImage = obj!.type === 'image';
  const isShape = !isText && !isImage;

  const update = (props: Record<string, any>) => {
    saveState();
    obj!.set(props);
    canvas?.renderAll();
    forceUpdate(n => n + 1);
  };

  return (
    <aside className="w-64 bg-surface-dark border-l border-toolbar-border flex flex-col shrink-0 overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-5">
        <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider">Properties</h3>

        {/* Global: Opacity */}
        <Section label="Opacity">
          <input
            type="range" min={0} max={100}
            value={Math.round((obj!.opacity ?? 1) * 100)}
            onChange={e => update({ opacity: Number(e.target.value) / 100 })}
            className="w-full accent-primary"
          />
          <span className="text-[10px] text-surface-darker-foreground">{Math.round((obj!.opacity ?? 1) * 100)}%</span>
        </Section>

        {/* Global: Layering */}
        <Section label="Layer">
          <div className="flex gap-1">
            <SmallButton icon={ArrowUp} onClick={onBringForward} title="Bring Forward" />
            <SmallButton icon={ArrowDown} onClick={onSendBackward} title="Send Backward" />
          </div>
        </Section>

        {/* Text properties */}
        {isText && (
          <>
            <Section label="Font Family">
              <select
                value={(obj as fabric.IText).fontFamily || 'Inter'}
                onChange={e => update({ fontFamily: e.target.value })}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              >
                {fonts.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Section>
            <Section label="Font Size">
              <input
                type="number" min={8} max={200}
                value={(obj as fabric.IText).fontSize || 16}
                onChange={e => update({ fontSize: Number(e.target.value) })}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              />
            </Section>
            <Section label="Style">
              <div className="flex gap-1">
                <SmallButton
                  icon={Bold}
                  active={(obj as fabric.IText).fontWeight === 'bold'}
                  onClick={() => update({ fontWeight: (obj as fabric.IText).fontWeight === 'bold' ? 'normal' : 'bold' })}
                />
                <SmallButton
                  icon={Italic}
                  active={(obj as fabric.IText).fontStyle === 'italic'}
                  onClick={() => update({ fontStyle: (obj as fabric.IText).fontStyle === 'italic' ? 'normal' : 'italic' })}
                />
              </div>
            </Section>
            <Section label="Alignment">
              <div className="flex gap-1">
                <SmallButton icon={AlignLeft} active={(obj as fabric.IText).textAlign === 'left'} onClick={() => update({ textAlign: 'left' })} />
                <SmallButton icon={AlignCenter} active={(obj as fabric.IText).textAlign === 'center'} onClick={() => update({ textAlign: 'center' })} />
                <SmallButton icon={AlignRight} active={(obj as fabric.IText).textAlign === 'right'} onClick={() => update({ textAlign: 'right' })} />
              </div>
            </Section>
            <Section label="Line Height">
              <input
                type="number" min={0.5} max={3} step={0.1}
                value={(obj as fabric.IText).lineHeight || 1.2}
                onChange={e => update({ lineHeight: Number(e.target.value) })}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              />
            </Section>
            <ColorPicker label="Text Color" value={(obj as fabric.IText).fill as string || '#000000'} onChange={v => update({ fill: v })} />
          </>
        )}

        {/* Shape properties */}
        {isShape && (
          <>
            <ColorPicker label="Fill" value={obj!.fill as string || '#6c5ce7'} onChange={v => update({ fill: v })} />
            <ColorPicker label="Stroke" value={obj!.stroke || ''} onChange={v => update({ stroke: v, strokeWidth: obj!.strokeWidth || 2 })} />
            <Section label="Stroke Width">
              <input
                type="number" min={0} max={20}
                value={obj!.strokeWidth || 0}
                onChange={e => update({ strokeWidth: Number(e.target.value) })}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 border border-toolbar-border outline-none"
              />
            </Section>
            {obj!.type === 'rect' && (
              <Section label="Corner Radius">
                <input
                  type="number" min={0} max={100}
                  value={(obj as fabric.Rect).rx || 0}
                  onChange={e => update({ rx: Number(e.target.value), ry: Number(e.target.value) })}
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
                onClick={startCrop}
                className="w-full flex items-center justify-center gap-1.5 bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-2 hover:bg-primary/20 transition-colors"
              >
                <Crop size={14} /> Interactive Crop
              </button>
              <button
                onClick={() => {
                  if (!canvas) return;
                  saveState();
                  const img = obj as fabric.Image;
                  img.clipPath = undefined;
                  (img as any).set({ cropX: 0, cropY: 0 });
                  const el = img.getElement() as HTMLImageElement;
                  img.set({ width: el.naturalWidth, height: el.naturalHeight });
                  canvas.renderAll();
                  forceUpdate(n => n + 1);
                }}
                className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 hover:bg-primary/20 transition-colors mt-1"
              >
                Reset Crop
              </button>
            </Section>
            <Section label="Filters">
              <div className="flex flex-col gap-1">
                {['Grayscale', 'Sepia', 'Clear'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => {
                      saveState();
                      const img = obj as fabric.Image;
                      if (filter === 'Clear') {
                        img.filters = [];
                      } else if (filter === 'Grayscale') {
                        img.filters = [new fabric.Image.filters.Grayscale()];
                      } else {
                        img.filters = [new fabric.Image.filters.Sepia()];
                      }
                      img.applyFilters();
                      canvas?.renderAll();
                    }}
                    className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded-md px-2 py-1.5 hover:bg-primary/20 transition-colors"
                  >
                    {filter === 'Clear' ? 'Clear Filters' : filter}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-surface-darker-foreground uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SmallButton({ icon: Icon, onClick, active, title }: { icon: any; onClick: () => void; active?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-surface-dark-foreground hover:bg-primary/20'
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Section label={label}>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-toolbar-border cursor-pointer"
        />
        {presetColors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-5 h-5 rounded-full border transition-transform ${value === c ? 'border-primary scale-125' : 'border-toolbar-border'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </Section>
  );
}
