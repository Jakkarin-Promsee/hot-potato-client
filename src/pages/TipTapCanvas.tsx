import { useEffect } from "react";
import { useParams } from "react-router-dom";
import TipTapEditor from "@/components/editor/TipTapEditor";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { useCanvasStore } from "@/stores/canvas.store";

const TipTapCanvas = () => {
  const { id } = useParams<{ id: string }>();
  const { loadContent, saveContent, isLoading, isDirty, conflict } =
    useCanvasStore();

  useEffect(() => {
    if (id) loadContent(id);
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

  // On canvas load, check if another tab has this content open
  const STALE_THRESHOLD = 60 * 1000; // 1 minute
  useEffect(() => {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = async () => {
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
        await saveContent();
        // Read fresh state directly from store after save
        const { conflict } = useCanvasStore.getState();
        if (!conflict) loadContent(id!);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
