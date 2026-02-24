import { useState, useRef } from "react";
import {
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
  Palette,
  Brush,
  Upload,
} from "lucide-react";
import { useCanvasContext, SelectedCategory } from "@/contexts/CanvasContext";
import {
  FabricObject,
  Rect,
  Circle as FabricCircle,
  Shadow,
  Textbox,
} from "fabric";

interface AssetDrawerProps {
  onAddShape: (type: string) => void;
  onAddText: (preset: "heading" | "subheading" | "body") => void;
  onAddImage: (url: string) => void;
  onToggleDrawing: (enable: boolean, brushSize?: number) => void;
  onSetBrushSize: (size: number) => void;
  onSetBrushColor: (color: string) => void;
}

const shapes = [
  { type: "rect", icon: Square, label: "Rectangle" },
  { type: "circle", icon: LucideCircle, label: "Circle" },
  { type: "triangle", icon: Triangle, label: "Triangle" },
  { type: "star", icon: Star, label: "Star" },
  { type: "line", icon: Minus, label: "Line" },
  { type: "arrow", icon: ArrowRight, label: "Arrow" },
  { type: "diamond", icon: Diamond, label: "Diamond" },
];

const templates = [
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
        rx: 0,
        ry: 0,
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

const brushColors = [
  "#1a1a2e",
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e91e63",
];

export default function AssetDrawer({
  onAddShape,
  onAddText,
  onAddImage,
  onToggleDrawing,
  onSetBrushSize,
  onSetBrushColor,
}: AssetDrawerProps) {
  const { selectedCategory, canvas } = useCanvasContext();
  const [search, setSearch] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSizeLocal] = useState(4);
  const [brushColor, setBrushColorLocal] = useState("#1a1a2e");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selectedCategory) return null;

  const applyTemplate = (template: (typeof templates)[0]) => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    template.objects.forEach((objData: any) => {
      // 1. Destructure to separate 'type' from the rest of the properties
      const { type, ...options } = objData;
      let obj: FabricObject;

      if (type === "rect") {
        // Pass only the options (without the 'type' key)
        obj = new Rect(options);
      } else if (type === "circle") {
        // Note: In Fabric 7, the class is usually just 'Circle'
        obj = new FabricCircle(options);
      } else if (type === "itext" || type === "textbox") {
        // Textbox constructor: new Textbox(text, options)
        const { text, ...textOptions } = options;
        obj = new Textbox(text || "", {
          ...textOptions,
          width: textOptions.width || 500,
        });
      } else {
        return;
      }

      canvas.add(obj);
    });

    canvas.renderAll();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) onAddImage(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleDraw = () => {
    const next = !isDrawing;
    setIsDrawing(next);
    onToggleDrawing(next, brushSize);
  };

  const handleBrushSize = (size: number) => {
    setBrushSizeLocal(size);
    onSetBrushSize(size);
  };

  const handleBrushColor = (color: string) => {
    setBrushColorLocal(color);
    onSetBrushColor(color);
  };

  const filteredShapes = shapes.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className="w-64 bg-surface-dark border-r border-toolbar-border flex flex-col shrink-0 overflow-hidden">
      {/* Search bar */}
      <div className="p-3 border-b border-toolbar-border">
        <div className="flex items-center gap-2 bg-surface-hover rounded-md px-2.5 py-1.5">
          <Search size={14} className="text-surface-dark-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="bg-transparent text-surface-dark-foreground text-xs outline-none flex-1 placeholder:text-surface-darker-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {selectedCategory === "templates" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider">
              Templates
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {templates
                .filter((t) =>
                  t.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((t) => (
                  <button
                    key={t.name}
                    onClick={() => applyTemplate(t)}
                    className="bg-surface-hover rounded-lg p-3 text-center hover:bg-primary/20 transition-colors group"
                  >
                    <span className="text-2xl block mb-1">{t.preview}</span>
                    <span className="text-[10px] text-surface-dark-foreground group-hover:text-primary-foreground">
                      {t.name}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {selectedCategory === "elements" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider">
              Shapes
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {filteredShapes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => onAddShape(type)}
                  className="bg-surface-hover rounded-lg p-3 flex flex-col items-center gap-1 hover:bg-primary/20 transition-colors group"
                >
                  <Icon
                    size={24}
                    className="text-surface-dark-foreground group-hover:text-primary"
                  />
                  <span className="text-[10px] text-surface-darker-foreground">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCategory === "text" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider mb-3">
              Text
            </h3>
            {[
              {
                preset: "heading" as const,
                icon: Heading1,
                label: "Add a heading",
                desc: "Bold, 36px",
              },
              {
                preset: "subheading" as const,
                icon: Heading2,
                label: "Add a subheading",
                desc: "Semi-bold, 24px",
              },
              {
                preset: "body" as const,
                icon: AlignLeft,
                label: "Add body text",
                desc: "Regular, 16px",
              },
            ].map(({ preset, icon: Icon, label, desc }) => (
              <button
                key={preset}
                onClick={() => onAddText(preset)}
                className="w-full flex items-center gap-3 bg-surface-hover rounded-lg px-3 py-3 hover:bg-primary/20 transition-colors group text-left"
              >
                <Icon
                  size={18}
                  className="text-surface-dark-foreground group-hover:text-primary shrink-0"
                />
                <div>
                  <div className="text-xs text-surface-dark-foreground font-medium">
                    {label}
                  </div>
                  <div className="text-[10px] text-surface-darker-foreground">
                    {desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedCategory === "uploads" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider">
              Upload
            </h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-toolbar-border rounded-lg py-8 text-surface-dark-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload size={20} />
              <span className="text-sm font-medium">Upload image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}

        {selectedCategory === "draw" && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-surface-dark-foreground uppercase tracking-wider">
              Drawing
            </h3>
            <button
              onClick={toggleDraw}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-colors ${
                isDrawing
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-hover text-surface-dark-foreground hover:bg-primary/20"
              }`}
            >
              <Brush size={18} />
              {isDrawing ? "Stop Drawing" : "Start Drawing"}
            </button>

            <div>
              <label className="text-[10px] text-surface-darker-foreground uppercase tracking-wider block mb-2">
                Brush Size: {brushSize}px
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={brushSize}
                onChange={(e) => handleBrushSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-[10px] text-surface-darker-foreground uppercase tracking-wider block mb-2">
                Brush Color
              </label>
              <div className="flex flex-wrap gap-2">
                {brushColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleBrushColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${brushColor === c ? "border-primary scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
