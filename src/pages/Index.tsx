import React, { useEffect } from "react";
import { CanvasProvider, useCanvasContext } from "@/contexts/CanvasContext";
import { useFabric } from "@/hooks/useFabric";

import TopNavbar from "@/components/design/TopNavbar";
import LeftSidebar from "@/components/design/LeftSidebar";
import AssetDrawer from "@/components/design/AssetDrawer";
import PropertiesPanel from "@/components/design/PropertiesPanel";

const DesignSuite = () => {
  const { canvas, zoom } = useCanvasContext();

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
  } = useFabric();

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

        {/* Canvas workspace */}
        <main className="flex-1 bg-canvas-bg overflow-auto flex items-center justify-center p-8">
          <div
            className="shadow-2xl"
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
  return (
    <CanvasProvider>
      <DesignSuite></DesignSuite>
    </CanvasProvider>
  );
};

export default Index;
