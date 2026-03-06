import { useState, useRef, memo } from "react";
import {
  LayoutTemplate,
  Shapes,
  Type,
  Upload,
  Pencil,
  Search,
  Square,
  Circle as LucideCircle,
  Triangle,
  Star,
  Minus,
  Diamond,
  ArrowRight,
  Heading1,
  Heading2,
  AlignLeft,
  Brush,
} from "lucide-react";
import { useCanvasContext, SelectedCategory } from "@/contexts/CanvasContext";
import {
  FabricObject,
  Rect,
  Circle as FabricCircle,
  Shadow,
  Textbox,
} from "fabric";
import { useFabric } from "@/hooks/useFabric";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: {
  id: SelectedCategory;
  icon: React.ElementType;
  label: string;
}[] = [
  { id: "templates", icon: LayoutTemplate, label: "Templates" },
  { id: "elements", icon: Shapes, label: "Elements" },
  { id: "text", icon: Type, label: "Text" },
  { id: "uploads", icon: Upload, label: "Uploads" },
  { id: "draw", icon: Pencil, label: "Draw" },
];

const SHAPES = [
  { type: "rect", icon: Square, label: "Rectangle" },
  { type: "circle", icon: LucideCircle, label: "Circle" },
  { type: "triangle", icon: Triangle, label: "Triangle" },
  { type: "star", icon: Star, label: "Star" },
  { type: "line", icon: Minus, label: "Line" },
  { type: "arrow", icon: ArrowRight, label: "Arrow" },
  { type: "diamond", icon: Diamond, label: "Diamond" },
];

const BRUSH_COLORS = [
  "#1a1a2e",
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e91e63",
];

const TEMPLATES = [
  {
    name: "Social Post",
    preview: "📱",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        fill: "#6c5ce7",
      },
      {
        type: "itext",
        left: 150,
        top: 200,
        text: "Hello World!",
        fontSize: 48,
        fontWeight: "bold",
        fill: "#ffffff",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 150,
        top: 280,
        text: "Your amazing design starts here",
        fontSize: 18,
        fill: "#dfe6e9",
        fontFamily: "Inter",
      },
    ],
  },
  {
    name: "Presentation",
    preview: "📊",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        fill: "#2d3436",
      },
      {
        type: "rect",
        left: 40,
        top: 40,
        width: 720,
        height: 520,
        fill: "#636e72",
        rx: 12,
        ry: 12,
      },
      {
        type: "itext",
        left: 100,
        top: 120,
        text: "Slide Title",
        fontSize: 40,
        fontWeight: "bold",
        fill: "#ffffff",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 100,
        top: 200,
        text: "• Point one\n• Point two\n• Point three",
        fontSize: 20,
        fill: "#b2bec3",
        fontFamily: "Inter",
      },
    ],
  },
  {
    name: "Business Card",
    preview: "💼",
    objects: [
      {
        type: "rect",
        left: 100,
        top: 100,
        width: 600,
        height: 350,
        fill: "#ffffff",
        rx: 16,
        ry: 16,
        shadow: new Shadow({ color: "rgba(0,0,0,0.15)", blur: 20 }),
      },
      {
        type: "rect",
        left: 100,
        top: 100,
        width: 600,
        height: 8,
        fill: "#6c5ce7",
      },
      {
        type: "itext",
        left: 140,
        top: 160,
        text: "Jane Smith",
        fontSize: 28,
        fontWeight: "bold",
        fill: "#2d3436",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 140,
        top: 210,
        text: "Creative Director",
        fontSize: 16,
        fill: "#636e72",
        fontFamily: "Inter",
      },
      {
        type: "itext",
        left: 140,
        top: 280,
        text: "jane@studio.com\n+1 (555) 0123",
        fontSize: 14,
        fill: "#636e72",
        fontFamily: "Inter",
      },
    ],
  },
  {
    name: "Poster",
    preview: "🎨",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        fill: "#0984e3",
      },
      {
        type: "circle",
        left: 550,
        top: -50,
        radius: 200,
        fill: "#74b9ff",
        opacity: 0.5,
      },
      {
        type: "circle",
        left: -50,
        top: 350,
        radius: 180,
        fill: "#a29bfe",
        opacity: 0.4,
      },
      {
        type: "itext",
        left: 60,
        top: 180,
        text: "CREATIVE\nDESIGN",
        fontSize: 64,
        fontWeight: "bold",
        fill: "#ffffff",
        fontFamily: "Inter",
        lineHeight: 1.1,
      },
      {
        type: "itext",
        left: 60,
        top: 380,
        text: "FESTIVAL 2025",
        fontSize: 24,
        fill: "#dfe6e9",
        fontFamily: "Inter",
        charSpacing: 400,
      },
    ],
  },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

const CategoryBtn = memo(
  ({
    icon: Icon,
    label,
    isActive,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-3 w-full transition-all duration-150 ${
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      }`}
    >
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-primary" />
      )}
      <Icon size={19} strokeWidth={isActive ? 2 : 1.8} />
      <span className="text-[10px] font-semibold tracking-wide leading-none">
        {label}
      </span>
    </button>
  ),
);

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 block">
    {children}
  </span>
);

const ToolBtn = memo(
  ({
    icon: Icon,
    label,
    onClick,
    active = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  ),
);

// ─── Panels ───────────────────────────────────────────────────────────────────

const TemplatesPanel = memo(
  ({
    search,
    onApply,
  }: {
    search: string;
    onApply: (t: (typeof TEMPLATES)[0]) => void;
  }) => (
    <div className="flex flex-col gap-1">
      <PanelLabel>Templates</PanelLabel>
      <div className="grid grid-cols-2 gap-2 px-1">
        {TEMPLATES.filter((t) =>
          t.name.toLowerCase().includes(search.toLowerCase()),
        ).map((t) => (
          <button
            key={t.name}
            onClick={() => onApply(t)}
            className="bg-accent/40 rounded-lg p-3 text-center hover:bg-accent transition-colors group"
          >
            <span className="text-2xl block mb-1">{t.preview}</span>
            <span className="text-[11px] text-muted-foreground group-hover:text-foreground">
              {t.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  ),
);

const ElementsPanel = memo(
  ({ search, onAdd }: { search: string; onAdd: (type: string) => void }) => {
    const filtered = SHAPES.filter((s) =>
      s.label.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <div className="flex flex-col gap-1">
        <PanelLabel>Shapes</PanelLabel>
        <div className="grid grid-cols-3 gap-1.5 px-1">
          {filtered.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className="bg-accent/40 rounded-lg p-3 flex flex-col items-center gap-1.5 hover:bg-accent transition-colors group"
            >
              <Icon
                size={22}
                className="text-muted-foreground group-hover:text-foreground"
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  },
);

const TextPanel = memo(
  ({
    onAdd,
  }: {
    onAdd: (preset: "heading" | "subheading" | "body") => void;
  }) => (
    <div className="flex flex-col gap-0.5">
      <PanelLabel>Insert</PanelLabel>
      <ToolBtn
        icon={Heading1}
        label="Heading"
        onClick={() => onAdd("heading")}
      />
      <ToolBtn
        icon={Heading2}
        label="Subheading"
        onClick={() => onAdd("subheading")}
      />
      <ToolBtn
        icon={AlignLeft}
        label="Body text"
        onClick={() => onAdd("body")}
      />
    </div>
  ),
);

const UploadsPanel = memo(
  ({
    onUpload,
  }: {
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <div className="flex flex-col gap-1">
        <PanelLabel>Upload</PanelLabel>
        <button
          onClick={() => ref.current?.click()}
          className="mx-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-8 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Upload size={22} />
          <span className="text-xs font-medium">Upload image</span>
        </button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUpload}
        />
      </div>
    );
  },
);

const DrawPanel = memo(
  ({
    isDrawing,
    brushSize,
    brushColor,
    onToggle,
    onBrushSize,
    onBrushColor,
  }: {
    isDrawing: boolean;
    brushSize: number;
    brushColor: string;
    onToggle: () => void;
    onBrushSize: (n: number) => void;
    onBrushColor: (c: string) => void;
  }) => (
    <div className="flex flex-col gap-3 px-1">
      <PanelLabel>Drawing</PanelLabel>
      <button
        onClick={onToggle}
        className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
          isDrawing
            ? "bg-primary text-primary-foreground"
            : "bg-accent/40 text-muted-foreground hover:bg-accent"
        }`}
      >
        <Brush size={16} />
        {isDrawing ? "Stop Drawing" : "Start Drawing"}
      </button>

      <div>
        <PanelLabel>Brush Size: {brushSize}px</PanelLabel>
        <input
          type="range"
          min={1}
          max={30}
          value={brushSize}
          onChange={(e) => onBrushSize(Number(e.target.value))}
          className="w-full accent-primary mt-1"
        />
      </div>

      <div>
        <PanelLabel>Color</PanelLabel>
        <div className="flex flex-wrap gap-2 pt-1">
          {BRUSH_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onBrushColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                brushColor === c
                  ? "border-primary scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  ),
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function CanvasLeftSidebar() {
  const { selectedCategory, setSelectedCategory, canvas } = useCanvasContext();
  const [search, setSearch] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSizeLocal] = useState(4);
  const [brushColor, setBrushColorLocal] = useState("#1a1a2e");

  const {
    addShape,
    addImage,
    addText,
    toggleDrawing,
    setBrushSize,
    setBrushColor,
  } = useFabric();

  // Default to first category if none selected
  const activeCategory = selectedCategory ?? "templates";

  const applyTemplate = (template: (typeof TEMPLATES)[0]) => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    template.objects.forEach((objData: any) => {
      const { type, ...options } = objData;
      let obj: FabricObject;
      if (type === "rect") {
        obj = new Rect(options);
      } else if (type === "circle") {
        obj = new FabricCircle(options);
      } else if (type === "itext" || type === "textbox") {
        const { text, ...textOptions } = options;
        obj = new Textbox(text || "", {
          ...textOptions,
          width: textOptions.width || 500,
        });
      } else return;
      canvas.add(obj);
    });
    canvas.renderAll();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) addImage(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleDraw = () => {
    const next = !isDrawing;
    setIsDrawing(next);
    toggleDrawing(next, brushSize);
  };

  const handleBrushSize = (size: number) => {
    setBrushSizeLocal(size);
    setBrushSize(size);
  };
  const handleBrushColor = (color: string) => {
    setBrushColorLocal(color);
    setBrushColor(color);
  };

  const renderPanel = () => {
    switch (activeCategory) {
      case "templates":
        return <TemplatesPanel search={search} onApply={applyTemplate} />;
      case "elements":
        return <ElementsPanel search={search} onAdd={addShape} />;
      case "text":
        return <TextPanel onAdd={addText} />;
      case "uploads":
        return <UploadsPanel onUpload={handleUpload} />;
      case "draw":
        return (
          <DrawPanel
            isDrawing={isDrawing}
            brushSize={brushSize}
            brushColor={brushColor}
            onToggle={toggleDraw}
            onBrushSize={handleBrushSize}
            onBrushColor={handleBrushColor}
          />
        );
    }
  };

  return (
    <div className="editor-sidebar-left flex h-full border-r border-border bg-editor-surface">
      {/* ── Icon rail ── */}
      <div className="flex w-20 flex-col items-center gap-1.5 border-r border-border/60 px-2 py-3">
        {CATEGORIES.map(({ id, icon, label }) => (
          <CategoryBtn
            key={id}
            icon={icon}
            label={label}
            isActive={activeCategory === id}
            onClick={() =>
              setSelectedCategory(activeCategory === id ? null : id)
            }
          />
        ))}
      </div>

      {/* ── Tool panel ── */}
      <div className="flex w-60 flex-col overflow-y-auto p-2.5">
        {/* Search bar — shown for templates & elements */}
        {(activeCategory === "templates" || activeCategory === "elements") && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-2">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-xs text-foreground outline-none flex-1 placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* Panel title */}
        <p className="mb-1 px-1 text-sm font-semibold text-foreground capitalize">
          {activeCategory}
        </p>

        {renderPanel()}
      </div>
    </div>
  );
}
