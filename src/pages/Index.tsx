import TipTapEditor from "@/components/editor/TipTapEditor";
import { CanvasProvider } from "@/contexts/CanvasContext";

const Index = () => {
  return (
    <CanvasProvider>
      <TipTapEditor />
    </CanvasProvider>
  );
};

export default Index;
