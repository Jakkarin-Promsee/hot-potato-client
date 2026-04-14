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
  classRegistry,
  util,
  CanvasEvents,
} from "fabric";
import { useCanvasContext } from "@/contexts/CanvasContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
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
// Snapping
// ─────────────────────────────────────────────────────────────────────────────

const OBJECT_SNAP_DISTANCE = 20;
const ANGLE_SNAP_DEG = 45;

function getSnapPoints(obj: FabricObject) {
  const b = obj.getBoundingRect();
  const cx = b.left + b.width / 2;
  const cy = b.top + b.height / 2;
  return [
    { x: cx, y: cy },
    { x: cx, y: b.top },
    { x: cx, y: b.top + b.height },
    { x: b.left, y: cy },
    { x: b.left + b.width, y: cy },
    { x: b.left, y: b.top },
    { x: b.left + b.width, y: b.top },
    { x: b.left, y: b.top + b.height },
    { x: b.left + b.width, y: b.top + b.height },
  ];
}

function findObjectSnap(
  p: { x: number; y: number },
  canvas: FabricCanvas,
  excludeIds: Set<string>,
): { x: number; y: number; found: boolean } {
  let bestX = p.x,
    bestY = p.y,
    bestDist = OBJECT_SNAP_DISTANCE,
    found = false;
  for (const obj of canvas.getObjects()) {
    if (excludeIds.has((obj as any).__richLineId)) continue;
    if ((obj as any).__isRichLinePart) continue;
    for (const sp of getSnapPoints(obj)) {
      const d = Math.hypot(sp.x - p.x, sp.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        bestX = sp.x;
        bestY = sp.y;
        found = true;
      }
    }
  }
  return { x: bestX, y: bestY, found };
}

function applyAngleSnap(
  anchor: { x: number; y: number },
  free: { x: number; y: number },
): { x: number; y: number } {
  const dx = free.x - anchor.x,
    dy = free.y - anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return free;
  const snapRad = (ANGLE_SNAP_DEG * Math.PI) / 180;
  const snapped = Math.round(Math.atan2(dy, dx) / snapRad) * snapRad;
  return {
    x: anchor.x + Math.cos(snapped) * dist,
    y: anchor.y + Math.sin(snapped) * dist,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Arrowhead builder
// ─────────────────────────────────────────────────────────────────────────────

function buildArrowhead(
  type: ArrowType,
  stroke: string,
  sw: number,
): FabricObject | null {
  const s = 10 + sw * 1.5;
  const base = {
    originX: "center" as const,
    originY: "center" as const,
    selectable: false,
    evented: false,
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
        { fill: stroke, stroke: "transparent", strokeWidth: 0, ...base },
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
          ...base,
        },
      );
    case "circle":
      return new Circle({
        radius: s * 0.38,
        fill: stroke,
        stroke: "transparent",
        strokeWidth: 0,
        ...base,
      });
    case "square":
      return new Rect({
        width: s * 0.65,
        height: s * 0.65,
        fill: stroke,
        stroke: "transparent",
        strokeWidth: 0,
        ...base,
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
        { fill: stroke, stroke: "transparent", strokeWidth: 0, ...base },
      );
    }
    default:
      return null;
  }
}

function angleDeg(x1: number, y1: number, x2: number, y2: number) {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

function dashArray(style: LineStyle, sw: number): number[] {
  if (style === "dashed") return [sw * 4, sw * 3];
  if (style === "dotted") return [sw, sw * 2];
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// RichLineController — manages a set of raw Fabric objects (no Group)
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE_R = 8;
let _rlIdCounter = 0;

export class RichLineController {
  readonly id: string;

  private _cv: FabricCanvas;
  private _saveState: (() => void) | null;

  private _x1: number;
  private _y1: number;
  private _x2: number;
  private _y2: number;
  private _lineStyle: LineStyle;
  private _srcArrow: ArrowType;
  private _dstArrow: ArrowType;
  private _stroke: string;
  private _strokeWidth: number;

  // The actual Fabric objects on canvas
  private _line!: Line;
  private _srcHead: FabricObject | null = null;
  private _dstHead: FabricObject | null = null;
  private _srcHandle!: Circle;
  private _dstHandle!: Circle;
  private _snapRing!: Circle;
  private _hitZone!: Line; // wide invisible line for easy clicking

  private _selected = false;
  private _dragging: "src" | "dst" | null = null;

  // Canvas event handlers stored so we can remove them later
  private _handlers: Record<string, (e: any) => void> = {};

  constructor(
    cfg: Required<RichLineConfig>,
    cv: FabricCanvas,
    saveState: (() => void) | null,
  ) {
    this.id = `rl_${++_rlIdCounter}`;
    this._cv = cv;
    this._saveState = saveState;
    this._x1 = cfg.x1;
    this._y1 = cfg.y1;
    this._x2 = cfg.x2;
    this._y2 = cfg.y2;
    this._lineStyle = cfg.lineStyle;
    this._srcArrow = cfg.srcArrow;
    this._dstArrow = cfg.dstArrow;
    this._stroke = cfg.stroke;
    this._strokeWidth = cfg.strokeWidth;

    this._createObjects();
    this._wireCanvasEvents();
  }

  // ── public API ──────────────────────────────────────────────────────────────

  getConfig(): Required<RichLineConfig> {
    return {
      x1: this._x1,
      y1: this._y1,
      x2: this._x2,
      y2: this._y2,
      lineStyle: this._lineStyle,
      srcArrow: this._srcArrow,
      dstArrow: this._dstArrow,
      stroke: this._stroke,
      strokeWidth: this._strokeWidth,
    };
  }

  setLineStyle(v: LineStyle) {
    this._lineStyle = v;
    this._redraw();
  }
  setSrcArrow(v: ArrowType) {
    this._srcArrow = v;
    this._redraw();
  }
  setDstArrow(v: ArrowType) {
    this._dstArrow = v;
    this._redraw();
  }
  setStroke(v: string) {
    this._stroke = v;
    this._redraw();
  }
  setStrokeWidth(v: number) {
    this._strokeWidth = v;
    this._redraw();
  }

  /** Returns all Fabric objects that belong to this controller */
  getObjects(): FabricObject[] {
    const objs: FabricObject[] = [this._hitZone, this._line];
    if (this._srcHead) objs.push(this._srcHead);
    if (this._dstHead) objs.push(this._dstHead);
    objs.push(this._srcHandle, this._dstHandle, this._snapRing);
    return objs;
  }

  destroy() {
    this.getObjects().forEach((o) => this._cv.remove(o));
    Object.entries(this._handlers).forEach(([ev, fn]) =>
      this._cv.off(ev as keyof CanvasEvents, fn),
    );
  }

  // ── object creation ─────────────────────────────────────────────────────────

  private _tag(obj: FabricObject) {
    (obj as any).__isRichLinePart = true;
    (obj as any).__richLineId = this.id;
  }

  private _createObjects() {
    const { _x1: x1, _y1: y1, _x2: x2, _y2: y2 } = this;
    const angle = angleDeg(x1, y1, x2, y2);

    // Invisible wide hit zone — the actual click target for selecting
    this._hitZone = new Line([x1, y1, x2, y2], {
      stroke: "transparent",
      strokeWidth: Math.max(this._strokeWidth + 16, 20),
      selectable: true,
      evented: true,
      hasBorders: false,
      hasControls: false,
      hoverCursor: "pointer",
      perPixelTargetFind: false,
      originX: "left",
      originY: "top",
    });
    this._tag(this._hitZone);

    // Visible line
    this._line = new Line([x1, y1, x2, y2], {
      stroke: this._stroke,
      strokeWidth: this._strokeWidth,
      strokeDashArray: dashArray(this._lineStyle, this._strokeWidth),
      strokeLineCap: "round",
      selectable: false,
      evented: false,
      originX: "left",
      originY: "top",
    });
    this._tag(this._line);

    // Arrowheads
    this._srcHead = buildArrowhead(
      this._srcArrow,
      this._stroke,
      this._strokeWidth,
    );
    if (this._srcHead) {
      this._srcHead.set({ left: x1, top: y1, angle: angle + 180 });
      this._tag(this._srcHead);
    }

    this._dstHead = buildArrowhead(
      this._dstArrow,
      this._stroke,
      this._strokeWidth,
    );
    if (this._dstHead) {
      this._dstHead.set({ left: x2, top: y2, angle });
      this._tag(this._dstHead);
    }

    // Handles (hidden until selected)
    const handleBase = {
      radius: HANDLE_R,
      fill: "#6c5ce7",
      stroke: "#ffffff",
      strokeWidth: 2,
      originX: "center" as const,
      originY: "center" as const,
      selectable: false,
      evented: false,
      visible: false,
      hoverCursor: "crosshair",
    };
    this._srcHandle = new Circle({ ...handleBase, left: x1, top: y1 });
    this._dstHandle = new Circle({ ...handleBase, left: x2, top: y2 });
    this._tag(this._srcHandle);
    this._tag(this._dstHandle);

    // Snap ring
    this._snapRing = new Circle({
      radius: 10,
      fill: "transparent",
      stroke: "#6c5ce7",
      strokeWidth: 2,
      originX: "center" as const,
      originY: "center" as const,
      selectable: false,
      evented: false,
      visible: false,
    });
    this._tag(this._snapRing);

    // Add all to canvas in correct z-order
    this._cv.add(this._hitZone, this._line);
    if (this._srcHead) this._cv.add(this._srcHead);
    if (this._dstHead) this._cv.add(this._dstHead);
    this._cv.add(this._srcHandle, this._dstHandle, this._snapRing);
  }

  private _redraw() {
    // Remove old objects
    this.getObjects().forEach((o) => this._cv.remove(o));

    // Recreate
    this._srcHead = null;
    this._dstHead = null;
    this._createObjects();

    // Restore selection state
    if (this._selected) this._showHandles(true);
    this._cv.requestRenderAll();
  }

  // ── handle visibility ───────────────────────────────────────────────────────

  private _showHandles(visible: boolean) {
    this._selected = visible;
    this._srcHandle.set({ visible, evented: visible });
    this._dstHandle.set({ visible, evented: visible });
    if (!visible) this._snapRing.set({ visible: false });
  }

  // ── canvas event wiring ─────────────────────────────────────────────────────

  private _wireCanvasEvents() {
    // Select / deselect
    const onSelCreated = (e: any) => {
      const isMe = e.selected?.includes(this._hitZone);
      if (isMe) this._showHandles(true);
      this._cv.requestRenderAll();
    };
    const onSelUpdated = (e: any) => {
      const isMe = e.selected?.includes(this._hitZone);
      const wasMe = e.deselected?.includes(this._hitZone);
      if (isMe) this._showHandles(true);
      if (wasMe) this._showHandles(false);
      this._cv.requestRenderAll();
    };
    const onSelCleared = (e: any) => {
      if (this._selected) {
        this._showHandles(false);
        this._cv.requestRenderAll();
      }
    };

    // Handle mousedown — start dragging a handle endpoint
    const onMouseDown = (e: any) => {
      const t = e.target;
      if (t === this._srcHandle) {
        this._dragging = "src";
        this._cv.selection = false;
      }
      if (t === this._dstHandle) {
        this._dragging = "dst";
        this._cv.selection = false;
      }
    };

    // Handle mousemove — move the dragged endpoint with snapping
    const onMouseMove = (e: any) => {
      if (!this._dragging) return;
      e.e?.preventDefault?.();
      const p = this._cv.getScenePoint(e.e);

      // Object snap
      const excludeIds = new Set([this.id]);
      const snap = findObjectSnap(p, this._cv, excludeIds);
      const resolved = snap.found
        ? { x: snap.x, y: snap.y }
        : (() => {
            const anchor =
              this._dragging === "src"
                ? { x: this._x2, y: this._y2 }
                : { x: this._x1, y: this._y1 };
            return applyAngleSnap(anchor, p);
          })();

      if (this._dragging === "src") {
        this._x1 = resolved.x;
        this._y1 = resolved.y;
      } else {
        this._x2 = resolved.x;
        this._y2 = resolved.y;
      }

      this._updatePositions();

      // Show/hide snap ring
      if (snap.found) {
        this._snapRing.set({
          left: resolved.x,
          top: resolved.y,
          visible: true,
        });
      } else {
        this._snapRing.set({ visible: false });
      }
      this._cv.requestRenderAll();
    };

    // Handle mouseup — finish drag
    const onMouseUp = () => {
      if (this._dragging) {
        this._dragging = null;
        this._cv.selection = true;
        this._snapRing.set({ visible: false });
        this._saveState?.();
        this._cv.requestRenderAll();
      }
    };

    // When hitZone is moved by Fabric drag, sync x1/y1/x2/y2
    const onObjectMoving = (e: any) => {
      if (e.target !== this._hitZone) return;
      const hz = this._hitZone;
      // Fabric moves the Line object; x1/y1/x2/y2 inside it shift by left/top delta
      // Read back updated endpoints from the Line's current transform
      const mat = hz.calcTransformMatrix();
      const w = (hz.width ?? 0) / 2;
      const h = (hz.height ?? 0) / 2;
      // Local endpoints of a Line are relative to its center
      const p1 = util.transformPoint({ x: -w, y: -h }, mat);
      const p2 = util.transformPoint({ x: w, y: h }, mat);
      this._x1 = p1.x;
      this._y1 = p1.y;
      this._x2 = p2.x;
      this._y2 = p2.y;
      this._updatePositions(false); // update visuals without moving hitZone itself
    };

    const onObjectMoved = (e: any) => {
      if (e.target !== this._hitZone) return;
      this._saveState?.();
    };

    this._cv.on("selection:created", onSelCreated);
    this._cv.on("selection:updated", onSelUpdated);
    this._cv.on("selection:cleared", onSelCleared);
    this._cv.on("mouse:down", onMouseDown);
    this._cv.on("mouse:move", onMouseMove);
    this._cv.on("mouse:up", onMouseUp);
    this._cv.on("object:moving", onObjectMoving);
    this._cv.on("object:modified", onObjectMoved);

    this._handlers = {
      "selection:created": onSelCreated,
      "selection:updated": onSelUpdated,
      "selection:cleared": onSelCleared,
      "mouse:down": onMouseDown,
      "mouse:move": onMouseMove,
      "mouse:up": onMouseUp,
      "object:moving": onObjectMoving,
      "object:modified": onObjectMoved,
    };
  }

  // ── position sync (no recreate, just move existing objects) ─────────────────

  private _updatePositions(moveHitZone = true) {
    const { _x1: x1, _y1: y1, _x2: x2, _y2: y2 } = this;
    const angle = angleDeg(x1, y1, x2, y2);

    if (moveHitZone) {
      this._hitZone.set({ x1, y1, x2, y2 });
      this._hitZone.setCoords();
    }

    this._line.set({
      x1,
      y1,
      x2,
      y2,
      strokeDashArray: dashArray(this._lineStyle, this._strokeWidth),
    });
    this._line.setCoords();

    if (this._srcHead) {
      this._srcHead.set({ left: x1, top: y1, angle: angle + 180 });
      this._srcHead.setCoords();
    }
    if (this._dstHead) {
      this._dstHead.set({ left: x2, top: y2, angle });
      this._dstHead.setCoords();
    }

    this._srcHandle.set({ left: x1, top: y1 });
    this._srcHandle.setCoords();
    this._dstHandle.set({ left: x2, top: y2 });
    this._dstHandle.setCoords();
  }

  // ── serialization ────────────────────────────────────────────────────────────

  toJSON() {
    return { type: "richLine", richLineConfig: this.getConfig() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RichLine shim — a dummy FabricObject just for JSON round-trip registry
// The real work is done by RichLineController above
// ─────────────────────────────────────────────────────────────────────────────

export class RichLine extends Group {
  static type = "richLine";
  declare richLineConfig: Required<RichLineConfig>;

  constructor(cfg: RichLineConfig) {
    super([], { selectable: false, evented: false, visible: false });
    this.richLineConfig = {
      x1: cfg.x1,
      y1: cfg.y1,
      x2: cfg.x2,
      y2: cfg.y2,
      lineStyle: cfg.lineStyle ?? "solid",
      srcArrow: cfg.srcArrow ?? "none",
      dstArrow: cfg.dstArrow ?? "arrow",
      stroke: cfg.stroke ?? "#1a1a2e",
      strokeWidth: cfg.strokeWidth ?? 2,
    };
  }

  override toObject(extra?: any[]): any {
    return {
      ...(super.toObject as any)(extra),
      richLineConfig: this.richLineConfig,
      type: "richLine",
    };
  }

  static fromObject(obj: any): Promise<RichLine> {
    return Promise.resolve(new RichLine(obj.richLineConfig));
  }
}

classRegistry.setClass(RichLine, "richLine");
classRegistry.setSVGClass(RichLine, "richLine");

// ─────────────────────────────────────────────────────────────────────────────
// Manager — maps canvas to its RichLineControllers, handles load/save
// ─────────────────────────────────────────────────────────────────────────────

const _controllers = new WeakMap<
  FabricCanvas,
  Map<string, RichLineController>
>();

function getControllers(cv: FabricCanvas): Map<string, RichLineController> {
  if (!_controllers.has(cv)) _controllers.set(cv, new Map());
  return _controllers.get(cv)!;
}

export function createRichLine(
  cfg: Partial<RichLineConfig>,
  cv: FabricCanvas,
  saveState: (() => void) | null,
): RichLineController {
  const full: Required<RichLineConfig> = {
    x1: 120,
    y1: 200,
    x2: 420,
    y2: 200,
    lineStyle: "solid",
    srcArrow: "none",
    dstArrow: "arrow",
    stroke: "#1F1F1F",
    strokeWidth: 2,
    ...cfg,
  };
  const ctrl = new RichLineController(full, cv, saveState);
  getControllers(cv).set(ctrl.id, ctrl);
  return ctrl;
}

export function destroyRichLine(ctrl: RichLineController, cv: FabricCanvas) {
  ctrl.destroy();
  getControllers(cv).delete(ctrl.id);
}

/**
 * After loadFromJSON, Fabric will have added invisible RichLine shim objects.
 * Call this to replace them with live RichLineControllers.
 */
export function rehydrateRichLines(
  cv: FabricCanvas,
  saveState: (() => void) | null,
) {
  const shims = cv
    .getObjects()
    .filter((o) => (o as any).type === "richLine") as RichLine[];
  shims.forEach((shim) => {
    cv.remove(shim);
    createRichLine(shim.richLineConfig, cv, saveState);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated media helpers (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

function isAnimatedMedia(url: string): boolean {
  const clean = url.split("?")[0]!.toLowerCase();
  return (
    clean.endsWith(".gif") ||
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    /\/[^/]+\.gif($|\/)/.test(clean)
  );
}
function isVideoMedia(url: string): boolean {
  const clean = url.split("?")[0]!.toLowerCase();
  return (
    clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg")
  );
}
function addAnimatedGif(
  url: string,
  cv: FabricCanvas,
  saveState: (() => void) | null,
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const fabricImg = new FabricImage(img);
      const scale = 300 / (img.naturalWidth || 300);
      fabricImg.set({ left: 100, top: 100, scaleX: scale, scaleY: scale });
      cv.add(fabricImg);
      cv.setActiveObject(fabricImg);
      saveState?.();
      cv.requestRenderAll();
      let rafId: number;
      const tick = () => {
        if (!cv.contains(fabricImg)) {
          cancelAnimationFrame(rafId);
          return;
        }
        cv.renderAll();
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      fabricImg.on("removed", () => cancelAnimationFrame(rafId));
      resolve();
    };
    img.onerror = async () => {
      const fi = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      const scale = 300 / ((fi.width as number) || 300);
      fi.set({ left: 100, top: 100, scaleX: scale, scaleY: scale });
      cv.add(fi);
      cv.setActiveObject(fi);
      saveState?.();
      cv.requestRenderAll();
      resolve();
    };
    img.src = url;
  });
}
function addVideo(
  url: string,
  cv: FabricCanvas,
  saveState: (() => void) | null,
): Promise<void> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.style.cssText =
      "position:fixed;left:-9999px;opacity:0;pointer-events:none;";
    document.body.appendChild(video);
    const mount = () => {
      const fabricImg = new FabricImage(video as unknown as HTMLImageElement);
      const scale = 400 / (video.videoWidth || 400);
      fabricImg.set({ left: 100, top: 100, scaleX: scale, scaleY: scale });
      cv.add(fabricImg);
      cv.setActiveObject(fabricImg);
      saveState?.();
      cv.requestRenderAll();
      video.play().catch(() => cv.renderAll());
      let rafId: number;
      const tick = () => {
        if (!cv.contains(fabricImg)) {
          cancelAnimationFrame(rafId);
          video.pause();
          document.body.removeChild(video);
          return;
        }
        cv.renderAll();
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      fabricImg.on("removed", () => {
        cancelAnimationFrame(rafId);
        video.pause();
        if (document.body.contains(video)) document.body.removeChild(video);
      });
      resolve();
    };
    video.onloadeddata = mount;
    video.onerror = () => {
      if (document.body.contains(video)) document.body.removeChild(video);
      resolve();
    };
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
      createRichLine(
        {
          lineStyle: "solid",
          srcArrow: "none",
          dstArrow: type === "arrow" ? "arrow" : "none",
          stroke: "#1F1F1F",
          strokeWidth: 2,
          x1: 100,
          y1: 200,
          x2: 400,
          y2: 200,
        },
        cv,
        saveStateRef.current,
      );
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
    createRichLine(config, canvasRef.current, saveStateRef.current);
    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
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
    const cv = canvasRef.current;
    if (isVideoMedia(url)) {
      await addVideo(url, cv, saveStateRef.current);
      return;
    }
    if (isAnimatedMedia(url)) {
      await addAnimatedGif(url, cv, saveStateRef.current);
      return;
    }
    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const scale = 300 / (img.width || 300);
    img.set({ left: 100, top: 100, scaleX: scale, scaleY: scale });
    cv.add(img);
    cv.setActiveObject(img);
    saveStateRef.current?.();
    cv.requestRenderAll();
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
