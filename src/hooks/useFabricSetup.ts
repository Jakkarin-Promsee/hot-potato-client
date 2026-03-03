import { useCanvasContext } from "@/contexts/CanvasContext";
import { Canvas, Line } from "fabric";
import React, { useCallback, useEffect, useRef } from "react";

type useFabricSetupOptions = {
  onFocus?: () => void;
  onSaveState?: () => void;
  width: number;
  height: number;
  canvasData?: string;
  backgroundColor?: string;
};

function useFabricSetup({
  onFocus,
  onSaveState,
  width,
  height,
  canvasData,
  backgroundColor = "FFFFFF",
}: useFabricSetupOptions) {
  const canvasRef = useRef<Canvas>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);

  const {
    canvasRef: canvasContextRef,
    setSelectedObjects,
    setCanvasSync,
    saveStateRef,
  } = useCanvasContext();

  const onFocusRef = useRef<() => void>(null);

  useEffect(() => {
    if (onFocus) {
      onFocusRef.current = onFocus;
    }
  }, [onFocus]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasElRef.current) return;

    const c = new Canvas(canvasElRef.current, {
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    // Save create state
    canvasRef.current = c;
    setCanvasSync(canvasRef.current);

    c.on("mouse:down", () => {
      if (canvasContextRef.current !== canvasRef.current) {
        setCanvasSync(canvasRef.current);
      }

      onFocusRef?.current?.();
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

      const centerX = width / 2;
      const centerY = height / 2;
      const objCenterX = obj.left! + (obj.width! * (obj.scaleX || 1)) / 2;
      const objCenterY = obj.top! + (obj.height! * (obj.scaleY || 1)) / 2;

      if (Math.abs(objCenterX - centerX) < SNAP_THRESHOLD) {
        obj.set("left", centerX - (obj.width! * (obj.scaleX || 1)) / 2);
        obj.setCoords();
        addGuideline([centerX, 0, centerX, height]);
      }

      if (Math.abs(objCenterY - centerY) < SNAP_THRESHOLD) {
        obj.set("top", centerY - (obj.height! * (obj.scaleY || 1)) / 2);
        obj.setCoords();
        addGuideline([0, centerY, width, centerY]);
      }
    });

    canvasRef.current?.on("object:modified", () => {
      clearGuidelines();
      saveStateRef.current?.();
    });

    canvasRef.current?.on("selection:created", (e) => {
      setSelectedObjects(e.selected || []);
    });
    canvasRef.current?.on("selection:updated", (e) => {
      setSelectedObjects(e.selected || []);
    });
    canvasRef.current?.on("selection:cleared", () => {
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
          saveStateRef.current?.();
          active.forEach((obj) => c.remove(obj));
          c.discardActiveObject();
          c.requestRenderAll();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Force save state before useContext update
    setTimeout(() => {
      onSaveState?.();
    }, 100);

    canvasRef.current?.renderAll();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      c.dispose();
      setCanvasSync(null);
    };
  }, []);

  // Load data
  const lastLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!canvasData || canvasData === "{}") return;
    if (!canvasRef.current) return;
    if (lastLoadedRef.current === canvasData) return; // ✅ skip if same data!

    const loadCanvas = async () => {
      try {
        lastLoadedRef.current = canvasData;
        await canvasRef.current?.loadFromJSON(JSON.parse(canvasData));
        canvasRef.current?.renderAll();
      } catch (e) {
        console.error("load error:", e); // check what error comes out!
      }
    };

    loadCanvas();
  }, [canvasData]);

  //   useEffect(() => {
  //     // Keyboard shortcuts
  //     const handleKeyDown = (e: KeyboardEvent) => {
  //       if (
  //         e.target instanceof HTMLInputElement ||
  //         e.target instanceof HTMLTextAreaElement
  //       )
  //         return;
  //       if (
  //         (e.metaKey || e.ctrlKey) &&
  //         e.shiftKey &&
  //         e.key.toLowerCase() === "z"
  //       ) {
  //         e.preventDefault();
  //         redo();
  //         return;
  //       }
  //       if ((e.metaKey || e.ctrlKey) && e.key === "z") {
  //         e.preventDefault();
  //         console.log("undo");
  //         undo();
  //       }
  //       if ((e.metaKey || e.ctrlKey) && e.key === "y") {
  //         e.preventDefault();
  //         console.log("redo");
  //         redo();
  //       }
  //     };
  //     document.addEventListener("keydown", handleKeyDown);

  //     return () => {
  //       document.removeEventListener("keydown", handleKeyDown);
  //     };
  //   }, [undo, redo]);

  return {
    canvasRef,
    canvasElRef,
  };
}

export default useFabricSetup;
