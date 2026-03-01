import { useRef, useEffect, useCallback, useState, RefObject } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Canvas } from "fabric";
import { useFabric } from "@/hooks/useFabric";

const FabricCanvasView = ({ node, updateAttributes, selected }: any) => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  const { width, height, canvasData } = node.attrs;

  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return;

    const fc = new Canvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#fafafa",
    });

    // Load saved data
    if (canvasData && canvasData !== "{}") {
      try {
        fc.loadFromJSON(JSON.parse(canvasData), () => fc.renderAll());
      } catch {
        // ignore parse errors
      }
    } else {
      fabricRef.current = fc;

      // Save on every modification
      const saveState = () => {
        const json = JSON.stringify(fc.toJSON());
        updateAttributes({ canvasData: json });
      };

      fc.on("object:modified", saveState);
      fc.on("object:added", saveState);
      fc.on("object:removed", saveState);

      return () => {
        fc.dispose();
        fabricRef.current = null;
      };
    }
  }, []);

  type DesignSuiteProps = {
    onCanvasReady: (c: Canvas) => void;
    onFocus: () => void;
    isActive: boolean;
  };

  const [activeIndex, setActiveIndex] = useState(0);

  const isActive = activeIndex === 0;

  const onFocus = () => {
    setActiveIndex(0);
  };
  const onCanvasReady = (c: Canvas) => {
    fabricRef.current = c;
  };

  const {
    canvasRef,
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
  } = useFabric({ onCanvasReady, onFocus, isActive });

  return (
    <NodeViewWrapper className="my-6">
      <div
        className={`rounded-lg border overflow-hidden transition-shadow duration-200 ${
          selected ? "border-primary shadow-md" : "border-border shadow-sm"
        }`}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b border-border bg-muted/50 px-3 py-1.5">
          <span className="mr-auto text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Canvas
          </span>
        </div>
        <canvas ref={canvasElRef} />
      </div>
    </NodeViewWrapper>
  );
};

export default FabricCanvasView;
