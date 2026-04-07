import { useEffect } from "react";
import { useParams } from "react-router-dom";
import TipTapEditor from "@/components/editor/TipTapEditor";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { useCanvasStore } from "@/stores/canvas.store";

const TipTapCanvas = () => {
  const { id } = useParams<{ id: string }>();
  const { loadContent, saveContent, isLoading, isDirty } = useCanvasStore();

  useEffect(() => {
    if (id) loadContent(id);
    console.log("id:" + id);
  }, [id]);

  // Auto save
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) saveContent();
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty]);

  // Save on page leave
  useEffect(() => {
    const handleLeave = () => saveContent();
    window.addEventListener("beforeunload", handleLeave);
    return () => window.removeEventListener("beforeunload", handleLeave);
  }, []);

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
