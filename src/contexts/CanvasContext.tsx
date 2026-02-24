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

    console.log(canvas.toJSON());
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

    const currentState = JSON.stringify(canvas.toJSON());

    redoStack.current.push(currentState);

    const prevState = JSON.parse(undoStack.current.pop()!);
    isSaving.current = true;

    redoStack.current.push(JSON.stringify(canvas.toJSON()));

    isSaving.current = true;

    // 3. Check if the state we are loading is actually "empty"
    if (!prevState.objects || prevState.objects.length === 0) {
      // 1. Clear all objects
      canvas.clear();

      // 2. Set background using the unified 'set' method or direct assignment
      canvas.set("backgroundColor", "#ffffff");

      // 3. Re-render to show the white background
      canvas.renderAll();

      // 4. Update your state
      finalizeUndo(undoStack.current.length > 0);
    } else {
      // NORMAL LOAD: For states with objects
      canvas.loadFromJSON(prevState, () => {
        canvas.renderAll();
        finalizeUndo(undoStack.current.length > 0);
      });
    }

    // 4. Helper to ensure state stays synced
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
    const nextState = redoStack.current.pop()!;
    isSaving.current = true;
    canvas.loadFromJSON(JSON.parse(nextState), () => {
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
