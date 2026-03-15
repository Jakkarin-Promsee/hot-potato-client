import { useCallback } from "react";
import {
  FabricObject,
  Rect,
  Circle,
  Triangle,
  Polygon,
  Group,
  Textbox,
  FabricImage,
  PencilBrush,
  ActiveSelection,
  Line,
  Canvas as FabricCanvas,
} from "fabric";
import { useCanvasContext } from "@/contexts/CanvasContext";

// ─────────────────────────────────────────────────────────────────────────────
// RichLine types
// ─────────────────────────────────────────────────────────────────────────────

export type ArrowType =
  | "none"
  | "arrow"
  | "open"
  | "circle"
  | "square"
  | "diamond";
export type LineStyle = "solid" | "dashed" | "dotted";

export interface RichLineConfig {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineStyle?: LineStyle;
  srcArrow?: ArrowType;
  dstArrow?: ArrowType;
  stroke?: string;
  strokeWidth?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RichLine internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE_R = 7;
const HANDLE_FILL = "#6c5ce7";
const HANDLE_STROKE = "#ffffff";
const HANDLE_SW = 2;

// Padding around the line so arrowheads / thick strokes are never clipped.
// The Group is positioned so its top-left is (minX - PAD, minY - PAD).
const PAD = 20;

function _dashArray(style: LineStyle, sw: number): number[] {
  if (style === "dashed") return [sw * 4, sw * 3];
  if (style === "dotted") return [sw, sw * 2];
  return [];
}

function _angleDeg(x1: number, y1: number, x2: number, y2: number) {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

function _buildArrowhead(
  type: ArrowType,
  stroke: string,
  sw: number,
): FabricObject | null {
  const s = 10 + sw * 1.5;
  const shared = {
    originX: "center" as const,
    originY: "center" as const,
    selectable: false,
    evented: false,
    visible: true,
  };
  switch (type) {
    case "arrow":
      return new Polygon(
        [
          { x: 0, y: 0 },
          { x: -s, y: s * 0.38 },
          { x: -s * 0.55, y: 0 },
          { x: -s, y: -s * 0.38 },
        ],
        { fill: stroke, stroke: "transparent", strokeWidth: 0, ...shared },
      );
    case "open":
      return new Polygon(
        [
          { x: 0, y: 0 },
          { x: -s, y: -s * 0.5 },
          { x: -s * 0.6, y: 0 },
          { x: -s, y: s * 0.5 },
        ],
        {
          fill: "transparent",
          stroke,
          strokeWidth: Math.max(sw, 1.5),
          ...shared,
        },
      );
    case "circle":
      return new Circle({
        radius: s * 0.38,
        fill: stroke,
        stroke: "transparent",
        strokeWidth: 0,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
    case "square":
      return new Rect({
        width: s * 0.65,
        height: s * 0.65,
        fill: stroke,
        stroke: "transparent",
        strokeWidth: 0,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
    case "diamond": {
      const h = s * 0.5;
      return new Polygon(
        [
          { x: h, y: 0 },
          { x: 0, y: -h * 0.5 },
          { x: -h, y: 0 },
          { x: 0, y: h * 0.5 },
        ],
        { fill: stroke, stroke: "transparent", strokeWidth: 0, ...shared },
      );
    }
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RichLine class
//
// KEY DESIGN — all children are drawn in GROUP-LOCAL coordinates:
//   groupOriginX = min(x1, x2) - PAD
//   groupOriginY = min(y1, y2) - PAD
//   lx1 = x1 - groupOriginX   (local)
//   lx2 = x2 - groupOriginX   (local)
//   ly1 = y1 - groupOriginY
//   ly2 = y2 - groupOriginY
//
// This means changing strokeWidth never shifts the group's origin and
// therefore never moves the visual line.
// ─────────────────────────────────────────────────────────────────────────────

export class RichLine extends Group {
  static type = "richLine";

  // Absolute canvas coordinates (source of truth)
  private _x1: number;
  private _y1: number;
  private _x2: number;
  private _y2: number;

  private _lineStyle: LineStyle;
  private _srcArrow: ArrowType;
  private _dstArrow: ArrowType;
  private _richStroke: string;
  private _richStrokeWidth: number;

  private _line!: Line;
  private _srcHead: FabricObject | null = null;
  private _dstHead: FabricObject | null = null;
  private _srcHandle!: Circle;
  private _dstHandle!: Circle;

  private _dragging: "src" | "dst" | null = null;
  private _isActive = false;

  constructor(cfg: RichLineConfig) {
    super([], {
      // Position set properly in _buildChildren; start at 0,0
      left: 0,
      top: 0,
      // Disable ALL fabric transform controls — RichLine uses its own handles
      hasControls: false,
      hasBorders: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      subTargetCheck: true,
      selectable: true,
    });

    this._x1 = cfg.x1;
    this._y1 = cfg.y1;
    this._x2 = cfg.x2;
    this._y2 = cfg.y2;
    this._lineStyle = cfg.lineStyle ?? "solid";
    this._srcArrow = cfg.srcArrow ?? "none";
    this._dstArrow = cfg.dstArrow ?? "arrow";
    this._richStroke = cfg.stroke ?? "#1a1a2e";
    this._richStrokeWidth = cfg.strokeWidth ?? 2;

    this._buildChildren();
    this._attachHandleEvents();
  }

  // ── Public mutators ─────────────────────────────────────────────────────────

  setLineStyle(s: LineStyle) {
    this._lineStyle = s;
    this._rebuild();
  }
  setSrcArrow(t: ArrowType) {
    this._srcArrow = t;
    this._rebuild();
  }
  setDstArrow(t: ArrowType) {
    this._dstArrow = t;
    this._rebuild();
  }
  setRichStroke(c: string) {
    this._richStroke = c;
    this._rebuild();
  }
  setRichStrokeWidth(w: number) {
    this._richStrokeWidth = w;
    this._rebuild();
  }

  getConfig(): Required<RichLineConfig> {
    return {
      x1: this._x1,
      y1: this._y1,
      x2: this._x2,
      y2: this._y2,
      lineStyle: this._lineStyle,
      srcArrow: this._srcArrow,
      dstArrow: this._dstArrow,
      stroke: this._richStroke,
      strokeWidth: this._richStrokeWidth,
    };
  }

  // ── Show/hide handles (called externally when selection changes) ────────────

  showHandles(visible: boolean) {
    this._isActive = visible;
    this._srcHandle.set({ visible, evented: visible });
    this._dstHandle.set({ visible, evented: visible });
    this.canvas?.renderAll();
  }

  // ── Build children in group-local coordinates ───────────────────────────────

  private _buildChildren() {
    const { _x1: x1, _y1: y1, _x2: x2, _y2: y2 } = this;

    // Group origin (top-left of bounding box with padding)
    const ox = Math.min(x1, x2) - PAD;
    const oy = Math.min(y1, y2) - PAD;

    // Local coords
    const lx1 = x1 - ox;
    const ly1 = y1 - oy;
    const lx2 = x2 - ox;
    const ly2 = y2 - oy;

    const angle = _angleDeg(lx1, ly1, lx2, ly2);

    // ── The line itself ──
    this._line = new Line([lx1, ly1, lx2, ly2], {
      stroke: this._richStroke,
      strokeWidth: this._richStrokeWidth,
      strokeDashArray: _dashArray(this._lineStyle, this._richStrokeWidth),
      strokeLineCap: "round",
      // Use center origin so stroke doesn't shift the path
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // ── Arrowheads — positioned at line endpoints ──
    this._srcHead = _buildArrowhead(
      this._srcArrow,
      this._richStroke,
      this._richStrokeWidth,
    );
    if (this._srcHead) {
      this._srcHead.set({ left: lx1, top: ly1, angle: angle + 180 });
    }

    this._dstHead = _buildArrowhead(
      this._dstArrow,
      this._richStroke,
      this._richStrokeWidth,
    );
    if (this._dstHead) {
      this._dstHead.set({ left: lx2, top: ly2, angle });
    }

    // ── Endpoint handles (hidden unless selected) ──
    const handleVis = this._isActive;
    this._srcHandle = new Circle({
      left: lx1,
      top: ly1,
      radius: HANDLE_R,
      fill: HANDLE_FILL,
      stroke: HANDLE_STROKE,
      strokeWidth: HANDLE_SW,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: handleVis,
      visible: handleVis,
      hoverCursor: "crosshair",
    });
    this._dstHandle = new Circle({
      left: lx2,
      top: ly2,
      radius: HANDLE_R,
      fill: HANDLE_FILL,
      stroke: HANDLE_STROKE,
      strokeWidth: HANDLE_SW,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: handleVis,
      visible: handleVis,
      hoverCursor: "crosshair",
    });

    // ── Assemble ──
    const kids: FabricObject[] = [this._line];
    if (this._srcHead) kids.push(this._srcHead);
    if (this._dstHead) kids.push(this._dstHead);
    kids.push(this._srcHandle, this._dstHandle);

    this.removeAll();
    this.add(...kids);

    // Pin the group to its bounding-box origin so children stay in place
    this.set({ left: ox, top: oy });
    this.setCoords();
  }

  private _rebuild() {
    this._buildChildren();
    this._attachHandleEvents();
    this.canvas?.renderAll();
  }

  private _attachHandleEvents() {
    // Remove previous listeners to avoid stacking
    this._srcHandle.off("mousedown");
    this._dstHandle.off("mousedown");
    this._srcHandle.on("mousedown", () => {
      this._dragging = "src";
    });
    this._dstHandle.on("mousedown", () => {
      this._dragging = "dst";
    });
  }

  // ── Pointer drag ────────────────────────────────────────────────────────────

  onPointerMove(p: { x: number; y: number }) {
    if (!this._dragging) return;
    if (this._dragging === "src") {
      this._x1 = p.x;
      this._y1 = p.y;
    } else {
      this._x2 = p.x;
      this._y2 = p.y;
    }
    this._rebuild();
  }

  onPointerUp() {
    this._dragging = null;
  }
  isDraggingHandle() {
    return this._dragging !== null;
  }

  // ── Serialisation ───────────────────────────────────────────────────────────

  override toObject(extra?: any[]): any {
    return {
      ...(super.toObject as (extra?: any[]) => any)(extra),
      richLineConfig: this.getConfig(),
      type: "richLine",
    };
  }

  static fromObject(obj: any): Promise<RichLine> {
    return Promise.resolve(new RichLine(obj.richLineConfig));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas wiring
// Handles mouse:move/up for endpoint dragging, and selected/deselected
// events to show/hide handles and suppress Fabric's default border.
// ─────────────────────────────────────────────────────────────────────────────

function _wireRichLine(
  canvas: FabricCanvas,
  rl: RichLine,
  saveStateRef: React.MutableRefObject<(() => void) | null>,
) {
  const onMove = (e: any) => {
    if (!rl.isDraggingHandle()) return;
    // While dragging a handle we also want to block the group from moving
    e.e?.preventDefault?.();
    rl.onPointerMove(canvas.getScenePoint(e.e));
  };

  const onUp = () => {
    if (rl.isDraggingHandle()) {
      rl.onPointerUp();
      saveStateRef.current?.();
      canvas.renderAll();
    }
  };

  // Show handles when this line is the active object, hide otherwise.
  // selection:created  — something just got selected
  // selection:updated  — active object changed (old one is now deselected)
  // selection:cleared  — nothing selected any more
  const onSelectionChange = () => {
    const active = canvas.getActiveObject();
    rl.showHandles(active === rl);
  };

  canvas.on("mouse:move", onMove);
  canvas.on("mouse:up", onUp);
  canvas.on("selection:created", onSelectionChange);
  canvas.on("selection:updated", onSelectionChange);
  canvas.on("selection:cleared", onSelectionChange);

  rl.on("removed", () => {
    canvas.off("mouse:move", onMove);
    canvas.off("mouse:up", onUp);
    canvas.off("selection:created", onSelectionChange);
    canvas.off("selection:updated", onSelectionChange);
    canvas.off("selection:cleared", onSelectionChange);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Star helper
// ─────────────────────────────────────────────────────────────────────────────

function createStarPoints(spikes: number, outerR: number, innerR: number) {
  const pts: { x: number; y: number }[] = [];
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  const cx = outerR,
    cy = outerR;
  for (let i = 0; i < spikes; i++) {
    pts.push({
      x: cx + Math.cos(rot) * outerR,
      y: cy + Math.sin(rot) * outerR,
    });
    rot += step;
    pts.push({
      x: cx + Math.cos(rot) * innerR,
      y: cy + Math.sin(rot) * innerR,
    });
    rot += step;
  }
  return pts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

FabricObject.ownDefaults.originX = "left";
FabricObject.ownDefaults.originY = "top";

export function useFabric() {
  const { canvasRef, saveStateRef } = useCanvasContext();

  const addShape = useCallback((type: string) => {
    if (!canvasRef.current) return;
    const cv = canvasRef.current;
    const base = { left: 100, top: 100, fill: "#1F1F1F" };

    if (type === "line" || type === "arrow") {
      const rl = new RichLine({
        x1: 100,
        y1: 200,
        x2: 400,
        y2: 200,
        lineStyle: "solid",
        srcArrow: "none",
        dstArrow: type === "arrow" ? "arrow" : "none",
        stroke: "#1F1F1F",
        strokeWidth: 2,
      });
      _wireRichLine(cv, rl, saveStateRef);
      cv.add(rl);
      cv.setActiveObject(rl);
      saveStateRef.current?.();
      cv.requestRenderAll();
      return;
    }

    let obj: FabricObject;
    switch (type) {
      case "rect":
        obj = new Rect({ ...base, width: 120, height: 80, rx: 8, ry: 8 });
        break;
      case "circle":
        obj = new Circle({ ...base, radius: 50 });
        break;
      case "triangle":
        obj = new Triangle({ ...base, width: 100, height: 100 });
        break;
      case "star":
        obj = new Polygon(createStarPoints(5, 50, 25), { ...base });
        break;
      case "diamond":
        obj = new Polygon(
          [
            { x: 50, y: 0 },
            { x: 100, y: 50 },
            { x: 50, y: 100 },
            { x: 0, y: 50 },
          ],
          { ...base },
        );
        break;
      default:
        obj = new Rect({ ...base, width: 100, height: 100 });
    }

    cv.add(obj);
    cv.setActiveObject(obj);
    saveStateRef.current?.();
    cv.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRichLine = useCallback((config: Partial<RichLineConfig> = {}) => {
    if (!canvasRef.current) return;
    const cv = canvasRef.current;
    const rl = new RichLine({
      x1: 120,
      y1: 200,
      x2: 420,
      y2: 200,
      lineStyle: "solid",
      srcArrow: "none",
      dstArrow: "arrow",
      stroke: "#1F1F1F",
      strokeWidth: 2,
      ...config,
    });
    _wireRichLine(cv, rl, saveStateRef);
    cv.add(rl);
    cv.setActiveObject(rl);
    saveStateRef.current?.();
    cv.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addText = useCallback((preset: "heading" | "subheading" | "body") => {
    if (!canvasRef.current) return;
    const cfgs = {
      heading: {
        text: "Add a heading",
        fontSize: 36,
        fontWeight: "bold",
        charSpacing: -20,
        lineHeight: 1.1,
      },
      subheading: {
        text: "Add a subheading",
        fontSize: 24,
        fontWeight: "600",
        charSpacing: 0,
        lineHeight: 1.2,
      },
      body: {
        text: "Add body text",
        fontSize: 16,
        fontWeight: "normal",
        charSpacing: 0,
        lineHeight: 1.5,
      },
    };
    const cfg = cfgs[preset];
    const text = new Textbox(cfg.text, {
      left: 100,
      top: 100,
      width: 300,
      fontSize: cfg.fontSize,
      fontWeight: cfg.fontWeight,
      fontFamily: "Inter",
      fill: "#1a1a2e",
      charSpacing: cfg.charSpacing,
      lineHeight: cfg.lineHeight,
      underline: false,
      linethrough: false,
      textBackgroundColor: "",
    });
    canvasRef.current.add(text);
    canvasRef.current.setActiveObject(text);
    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addImage = useCallback(async (url: string) => {
    if (!canvasRef.current) return;
    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const scale = 300 / (img.width || 300);
    img.set({ left: 100, top: 100, scaleX: scale, scaleY: scale });
    canvasRef.current.add(img);
    canvasRef.current.setActiveObject(img);
    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDrawing = useCallback((enable: boolean, brushSize = 4) => {
    if (!canvasRef.current) return;
    canvasRef.current.isDrawingMode = enable;
    if (enable) {
      canvasRef.current.freeDrawingBrush = new PencilBrush(canvasRef.current);
      canvasRef.current.freeDrawingBrush.width = brushSize;
      canvasRef.current.freeDrawingBrush.color = "#1a1a2e";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBrushSize = useCallback((size: number) => {
    if (canvasRef.current?.freeDrawingBrush)
      canvasRef.current.freeDrawingBrush.width = size;
  }, []); // eslint-disable-line
  const setBrushColor = useCallback((color: string) => {
    if (canvasRef.current?.freeDrawingBrush)
      canvasRef.current.freeDrawingBrush.color = color;
  }, []); // eslint-disable-line

  const downloadCanvas = useCallback((format: "png" | "jpeg") => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL({
      format,
      quality: 1,
      multiplier: 2,
    });
    const a = document.createElement("a");
    a.download = `design.${format}`;
    a.href = dataURL;
    a.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupSelected = useCallback(() => {
    if (!canvasRef.current) return;
    const cv = canvasRef.current;
    const sel = cv.getActiveObject();
    if (!sel || !(sel instanceof ActiveSelection)) return;
    const objs = sel.getObjects();
    const grp = new Group(objs, { canvas: cv });
    cv.discardActiveObject();
    objs.forEach((o) => cv.remove(o));
    cv.add(grp);
    cv.setActiveObject(grp);
    saveStateRef.current?.();
    cv.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ungroupSelected = useCallback(() => {
    if (!canvasRef.current) return;
    const cv = canvasRef.current;
    const grp = cv.getActiveObject();
    if (!grp || !(grp instanceof Group)) return;
    const objs = grp.getObjects();
    grp.removeAll();
    cv.remove(grp);
    cv.add(...objs);
    const sel = new ActiveSelection(objs, { canvas: cv });
    cv.setActiveObject(sel);
    saveStateRef.current?.();
    cv.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bringForward = useCallback(() => {
    if (!canvasRef.current) return;
    const a = canvasRef.current.getActiveObject();
    if (!a) return;
    canvasRef.current.bringObjectForward(a);
    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendBackward = useCallback(() => {
    if (!canvasRef.current) return;
    const a = canvasRef.current.getActiveObject();
    if (!a) return;
    canvasRef.current.sendObjectBackwards(a);
    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    addShape,
    addRichLine,
    addText,
    addImage,
    toggleDrawing,
    setBrushSize,
    setBrushColor,
    downloadCanvas,
    groupSelected,
    ungroupSelected,
    bringForward,
    sendBackward,
  };
}
