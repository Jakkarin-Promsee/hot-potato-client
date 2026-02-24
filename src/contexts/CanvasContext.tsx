import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

import { Canvas, FabricObject } from "fabric";

export type SelectedCategory =
  | "templates"
  | "elements"
  | "text"
  | "uploads"
  | "draw"
  | null;

interface CanvasContextType {
  canvas: Canvas | null;
  setCanvas: (c: Canvas | null) => void;
  selectedObjects: FabricObject[];
  setSelectedObjects: (objs: FabricObject[]) => void;
  selectedCategory: SelectedCategory;
  setSelectedCategory: (cat: SelectedCategory) => void;
  zoom: number;
  setZoom: (z: number) => void;
  fileName: string;
  setFileName: (name: string) => void;
  undoStack: React.RefObject<string[]>;
  redoStack: React.RefObject<string[]>;
  saveState: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setCanUndo: (v: boolean) => void;
  setCanRedo: (v: boolean) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<FabricObject[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<SelectedCategory>(null);
  const [zoom, setZoom] = useState(100);
  const [fileName, setFileName] = useState("Untitled Design");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isSaving = useRef(false);

  const saveState = useCallback(() => {
    if (!canvas || isSaving.current) return;

    isSaving.current = true;

    const json = JSON.stringify(canvas.toJSON());
    undoStack.current.push(json);

    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
    isSaving.current = false;
  }, [canvas]);

  const undo = useCallback(() => {
    if (!canvas || undoStack.current.length === 0) return;

    // 1. Capture current state to push to REDO before we overwrite it
    const currentState = JSON.stringify(canvas.toJSON());
    redoStack.current.push(currentState);

    // 2. Get the previous state
    const prevState = JSON.parse(undoStack.current.pop()!);
    isSaving.current = true;

    if (!prevState.objects || prevState.objects.length === 0) {
      canvas.clear();
      canvas.set("backgroundColor", "#ffffff");
      // Ensure the canvas renders the clearing
      canvas.renderAll();
      finalizeUndo(undoStack.current.length > 0);
    } else {
      // 3. Load the state
      canvas.loadFromJSON(prevState, () => {
        // FORCE RE-RENDER: This solves the "blank until click" issue
        canvas.requestRenderAll();
        // Optional: If you use groups or heavy caching, use this:
        // canvas.renderAll();

        finalizeUndo(undoStack.current.length > 0);
      });
    }

    function finalizeUndo(canUndoNext: boolean) {
      isSaving.current = false;
      setCanUndo(canUndoNext);
      setCanRedo(true);
    }
  }, [canvas]);

  const redo = useCallback(() => {
    if (!canvas || redoStack.current.length === 0) return;

    const currentState = JSON.stringify(canvas.toJSON());
    undoStack.current.push(currentState);

    const nextState = JSON.parse(redoStack.current.pop()!);

    isSaving.current = true;
    canvas.loadFromJSON(nextState, () => {
      // Ensure all objects are parsed and the canvas is fully refreshed
      canvas.requestRenderAll();

      isSaving.current = false;
      setCanUndo(true);
      setCanRedo(redoStack.current.length > 0);
    });
  }, [canvas]);

  return (
    <CanvasContext.Provider
      value={{
        canvas,
        setCanvas,
        selectedObjects,
        setSelectedObjects,
        selectedCategory,
        setSelectedCategory,
        zoom,
        setZoom,
        fileName,
        setFileName,
        undoStack,
        redoStack,
        saveState,
        undo,
        redo,
        canUndo,
        canRedo,
        setCanUndo,
        setCanRedo,
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
