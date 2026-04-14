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

  // On canvas load, check if another tab has this content open
  const STALE_THRESHOLD = 60 * 1000; // 1 minute
  useEffect(() => {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now(); // record when tab was hidden
        return;
      }

      // Tab became visible
      if (!hiddenAt) return;

      const awayMs = Date.now() - hiddenAt;
      hiddenAt = null;

      // Only re-sync if away for more than 1 minute
      if (awayMs > STALE_THRESHOLD) {
        loadAnswers(id!);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [id]);

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <span className="animate-pulse text-sm text-muted-foreground">
          Loading content...
        </span>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TiptapViewer />
    </div>
  );
}

export default TiptapView;
