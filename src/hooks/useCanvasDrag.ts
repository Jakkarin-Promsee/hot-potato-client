import { useEffect, useRef } from "react";
import { Canvas, FabricObject } from "fabric";

export function useCanvasDrag(
  canvases: Map<string, Canvas>,
  canvasesSaveState: Map<string, () => void>,
) {
  const canvasesRef = useRef(canvases);
  const saveStateRef = useRef(canvasesSaveState);

  // Keep refs in sync with latest props
  useEffect(() => {
    canvasesRef.current = canvases;
  }, [canvases]);

  useEffect(() => {
    saveStateRef.current = canvasesSaveState;
  }, [canvasesSaveState]);

  const dragState = useRef<{
    object: FabricObject | null;
    source: Canvas | null;
  }>({ object: null, source: null });

  useEffect(() => {
    const getCanvases = () =>
      [...canvasesRef.current.values()].filter(Boolean) as Canvas[];

    const findIdByCanvas = (canvasInstance: Canvas) => {
      const entry = Array.from(canvasesRef.current.entries()).find(
        ([, c]) => c === canvasInstance,
      );
      return entry?.[0];
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState.current.object) return;
      getCanvases().forEach((c) => {
        const rect = c.getElement().getBoundingClientRect();
        const isOver =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        c.getElement().style.outline =
          isOver && c !== dragState.current.source ? "2px solid #6366f1" : "";
      });
    };

    const handlePointerUp = async (e: PointerEvent) => {
      const { object, source } = dragState.current;
      if (!object || !source) return;

      // Reset drag state immediately
      dragState.current = { object: null, source: null };
      getCanvases().forEach((c) => {
        c.getElement().style.outline = "";
      });

      const target = getCanvases().find((c) => {
        if (c === source) return false;
        const rect = c.getElement().getBoundingClientRect();
        return (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
      });

      if (!target) return;

      // ✅ Defer so we're fully outside Fabric's event call stack
      // This prevents Tiptap's updateAttributes from remounting the canvas mid-operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      const rect = target.getElement().getBoundingClientRect();
      const clone = await object.clone();
      clone.set({
        left:
          e.clientX - rect.left - (object.width! * (object.scaleX || 1)) / 2,
        top: e.clientY - rect.top - (object.height! * (object.scaleY || 1)) / 2,
      });

      source.discardActiveObject();
      source.remove(object);
      source.requestRenderAll();

      const sourceId = findIdByCanvas(source);
      if (sourceId) {
        saveStateRef.current.get(sourceId)?.();
      }

      target.add(clone);
      target.setActiveObject(clone);
      target.requestRenderAll();

      const targetId = findIdByCanvas(target);
      if (targetId) {
        saveStateRef.current.get(targetId)?.();
      }
    };

    const interval = setInterval(() => {
      getCanvases().forEach((c) => {
        if ((c as any).__dragWired) return;
        (c as any).__dragWired = true;
        c.on("mouse:down", (e) => {
          if (!e.target) return;
          dragState.current = { object: e.target, source: c };
        });
        c.on("mouse:up", () => {
          setTimeout(() => {
            dragState.current = { object: null, source: null };
          }, 50);
        });
      });
    }, 500);

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      clearInterval(interval);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);
}
