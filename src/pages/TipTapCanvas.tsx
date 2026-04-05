import TipTapEditor from "@/components/editor/TipTapEditor";
import { CanvasProvider } from "@/contexts/CanvasContext";

const TipTapCanvas = () => {
  return (
    <CanvasProvider>
      <TipTapEditor />
    </CanvasProvider>
  );
};

export default TipTapCanvas;
