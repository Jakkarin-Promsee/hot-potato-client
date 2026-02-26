import { useEffect, useRef, useCallback } from "react";
import {
  Canvas,
  Line,
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
  Point,
} from "fabric";
import { useCanvasContext } from "@/contexts/CanvasContext";

FabricObject.ownDefaults.originX = "left";
FabricObject.ownDefaults.originY = "top";

const ARTBOARD_WIDTH = 800;
const ARTBOARD_HEIGHT = 600;

type UseFabricOptions = {
  onCanvasReady?: (c: Canvas) => void;
  onFocus?: () => void;
  isActive?: boolean;
};

export function useFabric({
  onCanvasReady,
  onFocus,
  isActive,
}: UseFabricOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    canvas,
    setCanvas,
    setSelectedObjects,
    saveState,
    zoom,
    setZoom,
    undo,
    canUndo,
    redo,
    canRedo,
  } = useCanvasContext();

  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  const onCanvasReadyRef = useRef(onCanvasReady);
  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  const saveStateRef = useRef(saveState);
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const c = new Canvas(canvasRef.current, {
      width: ARTBOARD_WIDTH,
      height: ARTBOARD_HEIGHT,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    // Snap-to-guide helpers
    const SNAP_THRESHOLD = 8;
    const guidelines: Line[] = [];

    c.on("mouse:down", () => {
      onFocusRef.current?.(); // ✅ tell parent this canvas is now active
    });

    const clearGuidelines = () => {
      guidelines.forEach((line) => c.remove(line));
      guidelines.length = 0;
    };

    const addGuideline = (points: number[]) => {
      const line = new Line(points as [number, number, number, number], {
        stroke: "#1F1F1F",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        strokeDashArray: [4, 4],
      });
      (line as any).__isGuideline = true;
      c.add(line);
      guidelines.push(line);
    };

    c.on("object:moving", (e) => {
      clearGuidelines();
      const obj = e.target;
      if (!obj) return;

      const centerX = ARTBOARD_WIDTH / 2;
      const centerY = ARTBOARD_HEIGHT / 2;
      const objCenterX = obj.left! + (obj.width! * (obj.scaleX || 1)) / 2;
      const objCenterY = obj.top! + (obj.height! * (obj.scaleY || 1)) / 2;

      if (Math.abs(objCenterX - centerX) < SNAP_THRESHOLD) {
        obj.set("left", centerX - (obj.width! * (obj.scaleX || 1)) / 2);
        obj.setCoords();
        addGuideline([centerX, 0, centerX, ARTBOARD_HEIGHT]);
      }

      if (Math.abs(objCenterY - centerY) < SNAP_THRESHOLD) {
        obj.set("top", centerY - (obj.height! * (obj.scaleY || 1)) / 2);
        obj.setCoords();
        addGuideline([0, centerY, ARTBOARD_WIDTH, centerY]);
      }
    });

    let pendingSave = false;

    c.on("mouse:down", (e) => {
      if (e.target && !(e.target as any).__isGuideline) {
        pendingSave = true;
        saveStateRef.current(); // save BEFORE change
      }
    });

    c.on("object:modified", () => {
      clearGuidelines();
      pendingSave = false;
    });

    c.on("selection:created", (e) => {
      setSelectedObjects(e.selected || []);
    });
    c.on("selection:updated", (e) => {
      setSelectedObjects(e.selected || []);
    });
    c.on("selection:cleared", () => {
      setSelectedObjects([]);
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = c.getActiveObjects();
        if (active.length) {
          saveStateRef.current();
          active.forEach((obj) => c.remove(obj));
          c.discardActiveObject();
          c.requestRenderAll();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Save initial state
    setCanvas(c);

    onCanvasReadyRef.current?.(c);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      c.dispose();
      setCanvas(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log("f" + isActive);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("z");
      if (!isActive) return;
      console.log("zz");

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        console.log("undo");
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        console.log("redo");
        redo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, undo, redo]);

  // Zoom handling
  useEffect(() => {
    if (!canvas) return;

    const scale = zoom / 100;

    const centerPoint = new Point(ARTBOARD_WIDTH / 2, ARTBOARD_HEIGHT / 2);
    canvas.zoomToPoint(centerPoint, zoom / 100);
    canvas.setDimensions({
      width: ARTBOARD_WIDTH * scale,
      height: ARTBOARD_HEIGHT * scale,
    });

    canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
    canvas.requestRenderAll();
  }, [zoom, canvas]);

  const addShape = useCallback(
    (type: string) => {
      if (!canvas) return;
      saveStateRef.current();
      let obj: FabricObject;
      const baseProps = { left: 100, top: 100, fill: "#1F1F1F" };
      switch (type) {
        case "rect":
          obj = new Rect({
            ...baseProps,
            width: 120,
            height: 80,
            rx: 8,
            ry: 8,
          });
          break;
        case "circle":
          obj = new Circle({ ...baseProps, radius: 50 });
          break;
        case "triangle":
          obj = new Triangle({ ...baseProps, width: 100, height: 100 });
          break;
        case "star": {
          const points = createStarPoints(5, 50, 25);
          obj = new Polygon(points, { ...baseProps });
          break;
        }
        case "line":
          const points = [50, 50, 200, 200]; // [x1, y1, x2, y2]
          obj = new Line(points as [number, number, number, number], {
            ...baseProps,
            stroke: baseProps.fill,
            strokeWidth: 4,
            strokeLineCap: "round",
            originX: "left",
            originY: "top",
            hasBorders: false,
            perPixelTargetFind: true, // Only select if clicking the actual line
          });
          break;
        case "arrow": {
          const arrow = new Group(
            [
              new Line([0, 25, 150, 25], {
                stroke: baseProps.fill,
                strokeWidth: 3,
                fill: "",
              }),
              new Triangle({
                left: 135,
                top: 12,
                width: 20,
                height: 26,
                fill: baseProps.fill,
                angle: 90,
              }),
            ],
            { ...baseProps },
          );
          obj = arrow;
          break;
        }
        case "diamond": {
          const dPts = [
            { x: 50, y: 0 },
            { x: 100, y: 50 },
            { x: 50, y: 100 },
            { x: 0, y: 50 },
          ];
          obj = new Polygon(dPts, { ...baseProps });
          break;
        }
        default:
          obj = new Rect({ ...baseProps, width: 100, height: 100 });
      }
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    },
    [canvas],
  );

  const addText = useCallback(
    (preset: "heading" | "subheading" | "body") => {
      if (!canvas) return;
      saveStateRef.current();
      const sizes = { heading: 36, subheading: 24, body: 16 };
      const weights = { heading: "bold", subheading: "600", body: "normal" };
      const labels = {
        heading: "Add a heading",
        subheading: "Add a subheading",
        body: "Add body text",
      };
      const text = new Textbox(labels[preset], {
        left: 100,
        top: 100,
        width: 300,
        fontSize: sizes[preset],
        fontWeight: weights[preset],
        fontFamily: "Inter",
        fill: "#1a1a2e",
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.requestRenderAll();
    },
    [canvas, saveStateRef.current],
  );

  const addImage = useCallback(
    async (url: string) => {
      if (!canvas) return;
      saveStateRef.current();

      const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });

      const maxW = 300;
      const scale = maxW / (img.width || 300);
      img.set({
        left: 100,
        top: 100,
        scaleX: scale,
        scaleY: scale,
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    },
    [canvas],
  );

  const toggleDrawing = useCallback(
    (enable: boolean, brushSize = 4) => {
      if (!canvas) return;
      canvas.isDrawingMode = enable;
      if (enable) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = "#1a1a2e";
      }
    },
    [canvas],
  );

  const setBrushSize = useCallback(
    (size: number) => {
      if (!canvas?.freeDrawingBrush) return;
      canvas.freeDrawingBrush.width = size;
    },
    [canvas],
  );

  const setBrushColor = useCallback(
    (color: string) => {
      if (!canvas?.freeDrawingBrush) return;
      canvas.freeDrawingBrush.color = color;
    },
    [canvas],
  );

  const downloadCanvas = useCallback(
    (format: "png" | "jpeg") => {
      if (!canvas) return;
      const dataURL = canvas.toDataURL({ format, quality: 1, multiplier: 2 });
      const link = document.createElement("a");
      link.download = `design.${format}`;
      link.href = dataURL;
      link.click();
    },
    [canvas],
  );

  const groupSelected = useCallback(() => {
    if (!canvas) return;

    const activeSelection = canvas.getActiveObject();

    // 1. Verify it's actually an ActiveSelection instance
    if (!activeSelection || !(activeSelection instanceof ActiveSelection)) {
      console.warn("Please select multiple objects.");
      return;
    }

    saveStateRef.current();

    // 2. Create the Group manually from the selection's objects
    const objects = activeSelection.getObjects();
    const group = new Group(objects, {
      canvas: canvas,
    });

    // 3. Clear the selection and add the group
    canvas.discardActiveObject();

    // Remove individual objects and add the group
    objects.forEach((obj) => canvas.remove(obj));
    canvas.add(group);

    canvas.setActiveObject(group);
    canvas.requestRenderAll();
  }, [canvas]);

  const ungroupSelected = useCallback(() => {
    if (!canvas) return;

    const group = canvas.getActiveObject();

    // 1. Verify it's a Group instance
    if (!group || !(group instanceof Group)) {
      console.warn("Select a group to ungroup.");
      return;
    }

    saveStateRef.current();

    // 2. Extract objects and destroy the group container
    const objects = group.getObjects();
    group.removeAll(); // Modern Fabric 7 way to release children
    canvas.remove(group);

    // 3. Add objects back to canvas individually
    canvas.add(...objects);

    // 4. Create a new ActiveSelection so they stay "highlighted"
    const activeSelection = new ActiveSelection(objects, {
      canvas: canvas,
    });

    canvas.setActiveObject(activeSelection);
    canvas.requestRenderAll();
  }, [canvas, saveStateRef.current]);

  const bringForward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    saveStateRef.current();
    canvas.bringObjectForward(active);
    canvas.requestRenderAll();
  }, [canvas, saveStateRef.current]);

  const sendBackward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    saveStateRef.current();
    canvas.sendObjectBackwards(active);
    canvas.requestRenderAll();
  }, [canvas]);

  return {
    canvasRef,
    containerRef,
    addShape,
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

function createStarPoints(spikes: number, outerR: number, innerR: number) {
  const points: { x: number; y: number }[] = [];
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  const cx = outerR,
    cy = outerR;
  for (let i = 0; i < spikes; i++) {
    points.push({
      x: cx + Math.cos(rot) * outerR,
      y: cy + Math.sin(rot) * outerR,
    });
    rot += step;
    points.push({
      x: cx + Math.cos(rot) * innerR,
      y: cy + Math.sin(rot) * innerR,
    });
    rot += step;
  }
  return points;
}
