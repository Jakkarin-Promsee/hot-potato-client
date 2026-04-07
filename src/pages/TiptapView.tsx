import TiptapViewer from "@/components/editor/TiptapViewer";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { useCanvasStore } from "@/stores/canvas.store";
import { useAnswerStore } from "@/stores/content-answer.store";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

function TiptapView() {
  const { id } = useParams<{ id: string }>();
  const { loadContent, isLoading } = useCanvasStore();
  const { loadAnswers, syncAnswers, isDirty } = useAnswerStore();

  useEffect(() => {
    if (id) {
      loadContent(id);
      loadAnswers(id);
    }

    console.log("id:" + id);
  }, [id]);

  // 30s auto sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) syncAnswers();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save on page leave
  useEffect(() => {
    const handleLeave = () => syncAnswers();
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

  return <TiptapViewer />;
}

export default TiptapView;
