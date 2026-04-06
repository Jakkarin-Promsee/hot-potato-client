import TiptapViewer from "@/components/editor/TiptapViewer";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { useCanvasStore } from "@/stores/canvas.store";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

function TiptapView() {
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

  return <TiptapViewer />;
}

export default TiptapView;
