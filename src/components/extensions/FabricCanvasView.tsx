import { useRef, useEffect, useCallback, useState, RefObject } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Canvas } from "fabric";
import useFabricSetup from "@/hooks/useFabricSetup";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { v4 as uuidv4 } from "uuid";

const FabricCanvasView = ({ node, updateAttributes, selected }: any) => {
  // Setup data
  const { width, height, canvasData } = node.attrs;
  const backgroundColor = "#fafafa";

  const canvasDataPrevRef = useRef("");

  useEffect(() => {
    if (selected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [selected]);

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

  const { setSaveState, registerCanvas, unregisterCanvas } = useCanvasContext();

  const onFocus = useCallback(() => {
    setSaveState(onSaveState);
  }, []);

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

  return (
    <NodeViewWrapper className="my-6">
      <div
        className={`rounded-lg border overflow-hidden transition-shadow duration-200 ${
          selected ? "border-primary shadow-md" : "border-border shadow-sm"
        }`}
      >
        <canvas ref={canvasElRef} />
      </div>
    </NodeViewWrapper>
  );
};

export default FabricCanvasView;
