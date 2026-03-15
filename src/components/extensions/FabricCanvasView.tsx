import { useRef, useEffect, useCallback, useState, RefObject } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { ActiveSelection, Canvas, FabricObject } from "fabric";
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

  // Pull context setup function
  const {
    setCanvasSync,
    setSaveState,
    registerCanvas,
    unregisterCanvas,
    isSidebarInteracting,
  } = useCanvasContext();

  // Use to check current selection (every moseclick will trigger the tiptap select)
  // If the select ins't change, we won't do anything
  const canvasSelectPrevref = useRef(false);

  // Set saveState function, the current selection, and regist the canvas
  useEffect(() => {
    setTimeout(() => {
      setSaveState(onSaveState);
      canvasSelectPrevref.current = true;
      registerCanvas(idRef.current, canvasRef.current as Canvas, onSaveState);
    }, 0); // Prevent reace condition, let instance ready to use

    return () => {
      unregisterCanvas(idRef.current);
    };
  }, []);

  // Set canvas context part
  useEffect(() => {
    // If tiptap select didn't change, do nothing
    if (selected) {
      canvasSelectPrevref.current = true;
      return;
    }

    if (canvasSelectPrevref.current) {
      canvasSelectPrevref.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Only null out if the user isn't clicking the sidebar
      if (!isSidebarInteracting.current) {
        setCanvasSync(null);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [selected]);

  // Save State function that work between tiptap and canvas
  // Conflict: every time tiptap save, it will kick us out from node
  // Resolve: We can't resisit that kick, so after that kick we just set active again
  const canvasDataPrevRef = useRef("");
  const onSaveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // if data didn't change, didn't save
    const json = JSON.stringify(canvas.toJSON());
    if (json === canvasDataPrevRef.current) return;
    canvasDataPrevRef.current = json;

    // Save indices of all active objects
    const allObjects = canvas.getObjects();
    const activeObjects = canvas.getActiveObjects();
    const activeIndices = activeObjects.map((o) => allObjects.indexOf(o));

    // Set cut all sidebar interact and save
    isSidebarInteracting.current = true;
    updateAttributes({ canvasData: json });

    setTimeout(() => {
      const objects = canvas.getObjects();

      const targets = activeIndices
        .map((i) => objects[i])
        .filter((o): o is FabricObject => o !== undefined);

      if (targets.length === 1 && targets[0]) {
        canvas.setActiveObject(targets[0]);
        targets[0].setCoords();
      } else if (targets.length > 1) {
        const selection = new ActiveSelection(targets, { canvas });
        canvas.setActiveObject(selection);
        selection.setCoords();
      }

      // render all again and set isSidebarInteracting to default
      canvas.requestRenderAll();
      isSidebarInteracting.current = false;
    }, 10); // Race condition with useFabricSetup:load()
  }, []);

  // onFocus, set save state
  // (the fabic itself will directly hold setCanvas)
  const onFocus = useCallback(() => {
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
