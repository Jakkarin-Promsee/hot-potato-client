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
} from "fabric";
import { useCanvasContext } from "@/contexts/CanvasContext";

FabricObject.ownDefaults.originX = "left";
FabricObject.ownDefaults.originY = "top";

export function useFabric() {
  const { canvasRef, saveStateRef } = useCanvasContext();

  // Zoom handling
  // useEffect(() => {
  //   if (!canvas) return;

  //   const scale = zoom / 100;

  //   const centerPoint = new Point(ARTBOARD_WIDTH / 2, ARTBOARD_HEIGHT / 2);
  //   canvas.zoomToPoint(centerPoint, zoom / 100);
  //   canvas.setDimensions({
  //     width: ARTBOARD_WIDTH * scale,
  //     height: ARTBOARD_HEIGHT * scale,
  //   });

  //   canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  //   canvas.requestRenderAll();
  // }, [zoom, canvas]);

  const addShape = useCallback((type: string) => {
    if (!canvasRef.current) return;

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

    canvasRef.current.add(obj);
    canvasRef.current.setActiveObject(obj);

    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
  }, []);

  const addText = useCallback((preset: "heading" | "subheading" | "body") => {
    if (!canvasRef.current) return;

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

    canvasRef.current.add(text);
    canvasRef.current.setActiveObject(text);

    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
  }, []);

  const addImage = useCallback(async (url: string) => {
    if (!canvasRef.current) return;

    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });

    const maxW = 300;
    const scale = maxW / (img.width || 300);
    img.set({
      left: 100,
      top: 100,
      scaleX: scale,
      scaleY: scale,
    });

    canvasRef.current.add(img);
    canvasRef.current.setActiveObject(img);

    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
  }, []);

  const toggleDrawing = useCallback((enable: boolean, brushSize = 4) => {
    if (!canvasRef.current) return;

    canvasRef.current.isDrawingMode = enable;

    if (enable) {
      canvasRef.current.freeDrawingBrush = new PencilBrush(canvasRef.current);
      canvasRef.current.freeDrawingBrush.width = brushSize;
      canvasRef.current.freeDrawingBrush.color = "#1a1a2e";
    }
  }, []);

  const setBrushSize = useCallback((size: number) => {
    if (!canvasRef.current?.freeDrawingBrush) return;
    canvasRef.current.freeDrawingBrush.width = size;
  }, []);

  const setBrushColor = useCallback((color: string) => {
    if (!canvasRef.current?.freeDrawingBrush) return;
    canvasRef.current.freeDrawingBrush.color = color;
  }, []);

  const downloadCanvas = useCallback((format: "png" | "jpeg") => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL({
      format,
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement("a");
    link.download = `design.${format}`;
    link.href = dataURL;
    link.click();
  }, []);

  const groupSelected = useCallback(() => {
    if (!canvasRef.current) return;

    const activeSelection = canvasRef.current.getActiveObject();

    // 1. Verify it's actually an ActiveSelection instance
    if (!activeSelection || !(activeSelection instanceof ActiveSelection)) {
      console.warn("Please select multiple objects.");
      return;
    }

    // 2. Create the Group manually from the selection's objects
    const objects = activeSelection.getObjects();
    const group = new Group(objects, {
      canvas: canvasRef.current,
    });

    // 3. Clear the selection and add the group
    canvasRef.current.discardActiveObject();

    // Remove individual objects and add the group
    objects.forEach((obj) => canvasRef.current?.remove(obj));
    canvasRef.current.add(group);

    canvasRef.current.setActiveObject(group);

    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
  }, []);

  const ungroupSelected = useCallback(() => {
    if (!canvasRef.current) return;

    const group = canvasRef.current.getActiveObject();

    // 1. Verify it's a Group instance
    if (!group || !(group instanceof Group)) {
      console.warn("Select a group to ungroup.");
      return;
    }

    // 2. Extract objects and destroy the group container
    const objects = group.getObjects();
    group.removeAll(); // Modern Fabric 7 way to release children
    canvasRef.current.remove(group);

    // 3. Add objects back to canvas individually
    canvasRef.current.add(...objects);

    // 4. Create a new ActiveSelection so they stay "highlighted"
    const activeSelection = new ActiveSelection(objects, {
      canvas: canvasRef.current,
    });

    canvasRef.current.setActiveObject(activeSelection);

    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
  }, []);

  const bringForward = useCallback(() => {
    if (!canvasRef.current) return;

    const active = canvasRef.current.getActiveObject();
    if (!active) return;

    canvasRef.current.bringObjectForward(active);

    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
  }, []);

  const sendBackward = useCallback(() => {
    if (!canvasRef.current) return;

    const active = canvasRef.current.getActiveObject();
    if (!active) return;

    canvasRef.current.sendObjectBackwards(active);

    saveStateRef.current?.();
    canvasRef.current.requestRenderAll();
  }, []);

  return {
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
