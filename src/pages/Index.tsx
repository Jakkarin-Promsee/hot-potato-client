import React, { useRef, useState } from "react";
import { CanvasProvider, useCanvasContext } from "@/contexts/CanvasContext";
import { useFabric } from "@/hooks/useFabric";
import { useCanvasDrag } from "@/hooks/useCanvasDrag";
import { Canvas } from "fabric";

import TopNavbar from "@/components/design/TopNavbar";
import LeftSidebar from "@/components/design/LeftSidebar";
import AssetDrawer from "@/components/design/AssetDrawer";
import PropertiesPanel from "@/components/design/PropertiesPanel";

// ✅ Properly typed props
type DesignSuiteProps = {
  onCanvasReady: (c: Canvas) => void;
  onFocus: () => void;
  isActive: boolean;
};

const DesignSuite = ({
  onCanvasReady,
  onFocus,
  isActive,
}: DesignSuiteProps) => {
  const { zoom } = useCanvasContext();

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
  } = useFabric({ onCanvasReady, onFocus, isActive }); // ✅ pass it into useFabric

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-darker">
      <TopNavbar
        onDownload={downloadCanvas}
        onGroup={groupSelected}
        onUngroup={ungroupSelected}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <AssetDrawer
          onAddShape={addShape}
          onAddText={addText}
          onAddImage={addImage}
          onToggleDrawing={toggleDrawing}
          onSetBrushSize={setBrushSize}
          onSetBrushColor={setBrushColor}
        />
        <main className="flex-1 bg-canvas-bg overflow-auto flex items-center justify-center p-8">
          <div
            className={`shadow-2xl ${isActive ? "ring-2 ring-indigo-500" : ""}`}
            style={{ width: 800 * (zoom / 100), height: 600 * (zoom / 100) }}
          >
            <canvas ref={canvasRef} />
          </div>
        </main>
        <PropertiesPanel
          onBringForward={bringForward}
          onSendBackward={sendBackward}
        />
      </div>
    </div>
  );
};

const Index = () => {
  const canvasRefs = useRef<(Canvas | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useCanvasDrag(canvasRefs);

  console.log(activeIndex === 0);

  return (
    <div className="flex flex-col">
      <CanvasProvider>
        <DesignSuite
          isActive={activeIndex === 0}
          onFocus={() => setActiveIndex(0)}
          onCanvasReady={(c) => {
            canvasRefs.current[0] = c;
          }}
        />
      </CanvasProvider>
      <CanvasProvider>
        <DesignSuite
          isActive={activeIndex === 1}
          onFocus={() => setActiveIndex(1)}
          onCanvasReady={(c) => {
            canvasRefs.current[1] = c;
          }}
        />
      </CanvasProvider>
    </div>
  );
};

export default Index;
