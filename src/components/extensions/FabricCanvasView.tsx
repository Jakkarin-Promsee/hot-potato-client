import { useRef, useEffect, useCallback, useState, RefObject } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Canvas } from "fabric";
import useFabricSetup from "@/hooks/useFabricSetup";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { v4 as uuidv4 } from "uuid";
import { ChevronDown } from "lucide-react";

const FabricCanvasView = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: any) => {
  // Setup data
  const { width, height, canvasData } = node.attrs;
  const backgroundColor = "#fafafa";

  const { setCanvasSync, setSaveState, registerCanvas, unregisterCanvas } =
    useCanvasContext();

  const canvasSelectPrevref = useRef(false);
  useEffect(() => {
    if (selected) {
      canvasSelectPrevref.current = true;
      return;
    }

    // Compile once after unselect
    if (canvasSelectPrevref) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setCanvasSync(null);
    }
  }, [selected]);

  const canvasDataPrevRef = useRef("");
  const onSaveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON());

    if (json === canvasDataPrevRef.current) return;
    canvasDataPrevRef.current = json;

    // Save identity of active object, not the reference itself
    const activeObject = canvas.getActiveObject();
    const activeObjectIndex = activeObject
      ? canvas.getObjects().indexOf(activeObject)
      : -1;

    updateAttributes({ canvasData: json });

    // Restore selection by re-finding the object in the canvas
    requestAnimationFrame(() => {
      if (activeObjectIndex === -1) return;

      const objects = canvas.getObjects();
      const target = objects[activeObjectIndex];

      if (target) {
        canvas.setActiveObject(target);
        // Force Fabric to recalculate controls position
        target.setCoords();
        canvas.requestRenderAll();
      }
    });
  }, []);

  const onFocus = useCallback(() => {
    console.log("set");
    setSaveState(onSaveState);
    if (typeof getPos === "function") {
      editor.commands.setNodeSelection(getPos());
    }
  }, [editor, getPos, onSaveState]);

  // Create fabric
  const { canvasRef, canvasElRef } = useFabricSetup({
    onFocus,
    onSaveState,
    width,
    height,
    canvasData,
    backgroundColor,
  });

  const idRef = useRef<string>(uuidv4());

  useEffect(() => {
    registerCanvas(idRef.current, canvasRef.current as Canvas, onSaveState);

    return () => {
      unregisterCanvas(idRef.current);
    };
  }, []);

  const isResizing = useRef(false);
  const lastY = useRef(0); // Track last mouse Y to compute delta per frame

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      lastY.current = e.clientY;

      // Use a ref to track live height so closure doesn't go stale
      const currentHeightRef = { value: height };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;

        const deltaY = moveEvent.clientY - lastY.current;
        lastY.current = moveEvent.clientY;

        const newHeight = Math.max(100, currentHeightRef.value + deltaY);
        currentHeightRef.value = newHeight;

        updateAttributes({ height: newHeight });
      };

      const onMouseUp = () => {
        isResizing.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        // Sync fabric dimensions after resize finishes
        if (canvasRef.current) {
          canvasRef.current.setDimensions({
            width,
            height: currentHeightRef.value,
          });

          onSaveState();
        }
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [height, updateAttributes, width, onSaveState],
  );

  // Handle syncing height to Fabric when Tiptap attributes change
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setDimensions({ width, height });
      canvasRef.current.requestRenderAll();
    }
  }, [height, width]);

  return (
    <NodeViewWrapper className="my-6">
      <div
        className={`mx-auto relative group w-fit rounded-lg border overflow-visible transition-shadow duration-200 ${
          selected ? "border-accent-foreground shadow-md" : ""
        }`}
      >
        <canvas ref={canvasElRef} className="block w-full" />

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute -bottom-4 left-0 right-0 h-4 flex items-center justify-center cursor-ns-resize"
          title="Drag to resize height"
        >
          {/* Visual button with chevron */}
          <div className="flex items-center justify-center w-10 h-4 rounded-full bg-white border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted select-none">
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default FabricCanvasView;
