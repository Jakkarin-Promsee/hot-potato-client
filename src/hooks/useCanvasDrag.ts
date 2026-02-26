// useCanvasDrag.ts
import { useEffect, useRef, RefObject } from "react";
import { Canvas, FabricObject } from "fabric";

export function useCanvasDrag(canvasRefs: RefObject<(Canvas | null)[]>) {
  const dragState = useRef<{
    object: FabricObject | null;
    source: Canvas | null;
  }>({ object: null, source: null });

  useEffect(() => {
    const getCanvases = () => canvasRefs.current.filter(Boolean) as Canvas[];

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

      if (target) {
        const rect = target.getElement().getBoundingClientRect();
        const clone = await object.clone();
        clone.set({
          left:
            e.clientX - rect.left - (object.width! * (object.scaleX || 1)) / 2,
          top:
            e.clientY - rect.top - (object.height! * (object.scaleY || 1)) / 2,
        });
        source.remove(object);
        source.discardActiveObject();
        source.requestRenderAll();
        target.add(clone);
        target.setActiveObject(clone);
        target.requestRenderAll();
      }

      dragState.current = { object: null, source: null };
      getCanvases().forEach((c) => {
        c.getElement().style.outline = "";
      });
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
