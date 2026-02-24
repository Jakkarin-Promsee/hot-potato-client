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

export function useFabric() {
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
    redo,
  } = useCanvasContext();

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

    const clearGuidelines = () => {
      guidelines.forEach((line) => c.remove(line));
      guidelines.length = 0;
    };

    const addGuideline = (points: number[]) => {
      const line = new Line(points as [number, number, number, number], {
        stroke: "hsl(250, 80%, 60%)",
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
        addGuideline([centerX, 0, centerX, ARTBOARD_HEIGHT]);
      }
      if (Math.abs(objCenterY - centerY) < SNAP_THRESHOLD) {
        obj.set("top", centerY - (obj.height! * (obj.scaleY || 1)) / 2);
        addGuideline([0, centerY, ARTBOARD_WIDTH, centerY]);
      }
    });

    c.on("object:modified", () => {
      clearGuidelines();
      saveState();
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
          saveState();
          active.forEach((obj) => c.remove(obj));
          c.discardActiveObject();
          c.renderAll();
        }
      }
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
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Save initial state
    setCanvas(c);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      c.dispose();
      setCanvas(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      saveState();
      let obj: FabricObject;
      const baseProps = { left: 100, top: 100, fill: "hsl(250, 80%, 60%)" };
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
          obj = new Line([50, 50, 200, 200], {
            ...baseProps,
            stroke: baseProps.fill,
            strokeWidth: 3,
            fill: "",
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
      canvas.renderAll();
    },
    [canvas, saveState],
  );

  const addText = useCallback(
    (preset: "heading" | "subheading" | "body") => {
      if (!canvas) return;
      saveState();
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
      canvas.renderAll();
    },
    [canvas, saveState],
  );

  const addImage = useCallback(
    async (url: string) => {
      if (!canvas) return;
      saveState();

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
      canvas.renderAll();
    },
    [canvas, saveState],
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
    const active = canvas.getActiveObject();
    if (!active || active.type !== "activeSelection") return;
    saveState();

    const group = (active as any).toGroup();

    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [canvas, saveState]);

  const ungroupSelected = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== "group") return;
    saveState();

    const activeSelection = (active as any).toActiveSelection();
    canvas.setActiveObject(activeSelection);
    canvas.renderAll();
  }, [canvas, saveState]);

  const bringForward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    saveState();
    canvas.bringObjectForward(active);
    canvas.renderAll();
  }, [canvas, saveState]);

  const sendBackward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    saveState();
    canvas.sendObjectBackwards(active);
    canvas.renderAll();
  }, [canvas, saveState]);

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
