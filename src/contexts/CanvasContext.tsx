import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { fabric } from "fabric";

export type SelectedCategory =
  | "templates"
  | "elements"
  | "text"
  | "uploads"
  | "draw"
  | "settings"
  | null;

export interface PageData {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  json: string;
  thumbnail: string;
}

export const ARTBOARD_PRESETS: {
  label: string;
  width: number;
  height: number;
}[] = [
  { label: "Custom", width: 800, height: 600 },
  { label: "Square (1080×1080)", width: 1080, height: 1080 },
  { label: "Story (1080×1920)", width: 1080, height: 1920 },
  { label: "A4 Portrait (794×1123)", width: 794, height: 1123 },
  { label: "A4 Landscape (1123×794)", width: 1123, height: 794 },
  { label: "Presentation (1920×1080)", width: 1920, height: 1080 },
  { label: "Facebook Post (1200×630)", width: 1200, height: 630 },
];

interface CanvasContextType {
  canvas: fabric.Canvas | null;
  setCanvas: (c: fabric.Canvas | null) => void;
  selectedObjects: fabric.Object[];
  setSelectedObjects: (objs: fabric.Object[]) => void;
  selectedCategory: SelectedCategory;
  setSelectedCategory: (cat: SelectedCategory) => void;
  zoom: number;
  setZoom: (z: number) => void;
  fileName: string;
  setFileName: (name: string) => void;
  undoStack: React.MutableRefObject<string[]>;
  redoStack: React.MutableRefObject<string[]>;
  saveState: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setCanUndo: (v: boolean) => void;
  setCanRedo: (v: boolean) => void;
  // Multi-page
  pages: PageData[];
  setPages: React.Dispatch<React.SetStateAction<PageData[]>>;
  activePageIndex: number;
  setActivePageIndex: React.Dispatch<React.SetStateAction<number>>;
  switchPage: (index: number) => void;
  addPage: (width?: number, height?: number) => void;
  deletePage: (index: number) => void;
  updatePageDimensions: (index: number, width: number, height: number) => void;
  // Crop mode
  cropMode: boolean;
  setCropMode: (v: boolean) => void;
  // Drawer
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  // Settings
  showGuides: boolean;
  setShowGuides: (v: boolean) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

function createEmptyPage(index: number, width = 800, height = 600): PageData {
  return {
    id: `page-${Date.now()}-${index}`,
    name: `Page ${index + 1}`,
    width,
    height,
    json: JSON.stringify({
      version: "5.3.0",
      objects: [],
      background: "#ffffff",
    }),
    thumbnail: "",
  };
}

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<SelectedCategory>(null);
  const [zoom, setZoom] = useState(100);
  const [fileName, setFileName] = useState("Untitled Design");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isSaving = useRef(false);

  // Multi-page state
  const [pages, setPages] = useState<PageData[]>([createEmptyPage(0)]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

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
    const currentState = JSON.stringify(canvas.toJSON());
    redoStack.current.push(currentState);
    const prevState = undoStack.current.pop()!;
    isSaving.current = true;
    canvas.loadFromJSON(JSON.parse(prevState), () => {
      canvas.renderAll();
      isSaving.current = false;
      setCanUndo(undoStack.current.length > 0);
      setCanRedo(true);
    });
  }, [canvas]);

  const redo = useCallback(() => {
    if (!canvas || redoStack.current.length === 0) return;
    const currentState = JSON.stringify(canvas.toJSON());
    undoStack.current.push(currentState);
    const nextState = redoStack.current.pop()!;
    isSaving.current = true;
    canvas.loadFromJSON(JSON.parse(nextState), () => {
      canvas.renderAll();
      isSaving.current = false;
      setCanUndo(true);
      setCanRedo(redoStack.current.length > 0);
    });
  }, [canvas]);

  // Save current page's state to pages array
  const saveCurrentPageState = useCallback(() => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    const thumbnail = canvas.toDataURL({
      format: "png",
      quality: 0.3,
      multiplier: 0.2,
    });
    setPages((prev) =>
      prev.map((p, i) =>
        i === activePageIndex ? { ...p, json, thumbnail } : p,
      ),
    );
  }, [canvas, activePageIndex]);

  const switchPage = useCallback(
    (index: number) => {
      if (!canvas || index === activePageIndex) return;
      // Save current page
      const json = JSON.stringify(canvas.toJSON());
      const thumbnail = canvas.toDataURL({
        format: "png",
        quality: 0.3,
        multiplier: 0.2,
      });
      setPages((prev) => {
        const updated = [...prev];
        updated[activePageIndex] = {
          ...updated[activePageIndex],
          json,
          thumbnail,
        };
        return updated;
      });
      // Clear undo/redo for new page
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
      // Load new page
      setActivePageIndex(index);
    },
    [canvas, activePageIndex],
  );

  const addPage = useCallback(
    (width = 800, height = 600) => {
      if (canvas) {
        // save current page first
        const json = JSON.stringify(canvas.toJSON());
        const thumbnail = canvas.toDataURL({
          format: "png",
          quality: 0.3,
          multiplier: 0.2,
        });
        setPages((prev) => {
          const updated = [...prev];
          updated[activePageIndex] = {
            ...updated[activePageIndex],
            json,
            thumbnail,
          };
          const newPage = createEmptyPage(updated.length, width, height);
          return [...updated, newPage];
        });
      } else {
        setPages((prev) => [
          ...prev,
          createEmptyPage(prev.length, width, height),
        ]);
      }
      setActivePageIndex((prev) => {
        // Will switch in next render via useEffect in useFabric
        return pages.length; // new page index
      });
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
    },
    [canvas, activePageIndex, pages.length],
  );

  const deletePage = useCallback(
    (index: number) => {
      if (pages.length <= 1) return;
      setPages((prev) => prev.filter((_, i) => i !== index));
      if (activePageIndex >= index && activePageIndex > 0) {
        setActivePageIndex((prev) => prev - 1);
      }
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
    },
    [pages.length, activePageIndex],
  );

  const updatePageDimensions = useCallback(
    (index: number, width: number, height: number) => {
      setPages((prev) =>
        prev.map((p, i) => (i === index ? { ...p, width, height } : p)),
      );
    },
    [],
  );

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
        pages,
        setPages,
        activePageIndex,
        setActivePageIndex,
        switchPage,
        addPage,
        deletePage,
        updatePageDimensions,
        cropMode,
        setCropMode,
        drawerOpen,
        setDrawerOpen,
        showGuides,
        setShowGuides,
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
