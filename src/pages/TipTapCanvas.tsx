import { useEffect } from "react";
import { useParams } from "react-router-dom";
import TipTapEditor from "@/components/editor/TipTapEditor";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { useCanvasStore } from "@/stores/canvas.store";

const TipTapCanvas = () => {
  const { id } = useParams<{ id: string }>();
  const { loadContent, isLoading } = useCanvasStore();

  useEffect(() => {
    if (id) loadContent(id);
    console.log("id:" + id);
  }, [id]);

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm animate-pulse">
          Loading content...
        </span>
      </div>
    );

  return (
    <CanvasProvider>
      <TipTapEditor />
    </CanvasProvider>
  );
};

export default TipTapCanvas;
