import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

import { Canvas, FabricObject } from "fabric";
import { useCanvasDrag } from "@/hooks/useCanvasDrag";

export type SelectedCategory =
  | "templates"
  | "elements"
  | "text"
  | "uploads"
  | "draw"
  | null;

interface CanvasContextType {
  canvases: Map<string, Canvas>;
  registerCanvas: (id: string, c: Canvas, s: () => void) => void;
  unregisterCanvas: (id: string) => void;
  canvas: Canvas | null;
  canvasRef: React.RefObject<Canvas | null>;
  setCanvasSync: (c: Canvas | null) => void;
  selectedObjects: FabricObject[];
  setSelectedObjects: (objs: FabricObject[]) => void;
  selectedCategory: SelectedCategory;
  setSelectedCategory: (cat: SelectedCategory) => void;
  saveStateRef: React.RefObject<(() => void) | null>;
  setSaveState: (f: () => void) => void;
  isSidebarInteracting: React.RefObject<boolean>;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [canvases, setCanvases] = useState<Map<string, Canvas>>(new Map());
  const [canvasesSaveState, setCanvasesSaveState] = useState<
    Map<string, () => void>
  >(new Map());
  const isSidebarInteracting = useRef(false);

  const registerCanvas = useCallback(
    (id: string, newCanvas: Canvas, onSaveState: () => void) => {
      setCanvases((prev) => {
        const next = new Map(prev); // Copy the old map
        next.set(id, newCanvas); // Modify the copy
        return next; // Return the new reference
      });

      setCanvasesSaveState((prev) => {
        const next = new Map(prev); // Copy the old map
        next.set(id, onSaveState); // Modify the copy
        return next; // Return the new reference
      });
    },
    [],
  );

  const unregisterCanvas = useCallback((id: string) => {
    setCanvases((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    setCanvasesSaveState((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useCanvasDrag(canvases, canvasesSaveState);

  // The canvas that link to UI, Rerender every change
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  // The canvas that link to fabric function, Built once
  const canvasRef = useRef<Canvas | null>(null);

  // The canvas selected object, use to control properties UI
  const [selectedObjects, setSelectedObjects] = useState<FabricObject[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<SelectedCategory>(null);

  // The saveUniversalStateFunction, use with tiptap
  const saveStateRef = useRef<() => void>(null);

  // canvasRef sync update follow canvas, both update at the same time
  const setCanvasSync = useCallback((c: Canvas | null) => {
    canvasRef.current = c;
    setCanvas(c);
  }, []);

  // SaveState update by force setting
  const setSaveState = useCallback((saveFunction: () => void) => {
    saveStateRef.current = saveFunction;
  }, []);

  return (
    <CanvasContext.Provider
      value={{
        canvases,
        registerCanvas,
        unregisterCanvas,
        canvas,
        canvasRef,
        setCanvasSync,
        selectedObjects,
        setSelectedObjects,
        selectedCategory,
        setSelectedCategory,
        saveStateRef,
        setSaveState,
        isSidebarInteracting,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  const ctx = useContext(CanvasContext);
  if (!ctx)
    throw new Error("useCanvasContext must be used within CanvasProvider");
  return ctx;
}
