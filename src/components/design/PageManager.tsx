import { Plus, X } from 'lucide-react';
import { useCanvasContext, ARTBOARD_PRESETS } from '@/contexts/CanvasContext';
import { useState } from 'react';

export default function PageManager() {
  const { pages, activePageIndex, switchPage, addPage, deletePage, updatePageDimensions } = useCanvasContext();
  const [showSizePopup, setShowSizePopup] = useState(false);
  const [customW, setCustomW] = useState(800);
  const [customH, setCustomH] = useState(600);

  const handleAddPage = (width?: number, height?: number) => {
    addPage(width, height);
    setShowSizePopup(false);
  };

  return (
    <footer className="h-20 bg-surface-dark border-t border-toolbar-border flex items-center px-4 gap-3 shrink-0 relative">
      {/* Page thumbnails */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin flex-1 py-2">
        {pages.map((page, i) => (
          <button
            key={page.id}
            onClick={() => switchPage(i)}
            className={`relative shrink-0 rounded-md border-2 transition-all group ${
              i === activePageIndex
                ? 'border-primary shadow-lg shadow-primary/20'
                : 'border-toolbar-border hover:border-surface-dark-foreground'
            }`}
          >
            <div
              className="bg-white rounded-sm overflow-hidden flex items-center justify-center"
              style={{ width: 64, height: 48 }}
            >
              {page.thumbnail ? (
                <img src={page.thumbnail} alt={page.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[8px] text-muted-foreground">Empty</span>
              )}
            </div>
            <span className="text-[9px] text-surface-dark-foreground block text-center mt-0.5 truncate max-w-[64px]">
              {page.name}
            </span>
            {/* Size indicator */}
            <span className="text-[7px] text-surface-darker-foreground block text-center">
              {page.width}×{page.height}
            </span>
            {pages.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); deletePage(i); }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Add page button */}
      <div className="relative">
        <button
          onClick={() => setShowSizePopup(!showSizePopup)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-hover text-surface-dark-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          title="Add Page"
        >
          <Plus size={20} />
        </button>

        {showSizePopup && (
          <div className="absolute bottom-14 right-0 bg-surface-dark border border-toolbar-border rounded-lg p-3 shadow-xl w-64 z-50">
            <h4 className="text-xs font-semibold text-surface-dark-foreground mb-2">New Page Size</h4>
            <div className="space-y-1 mb-3">
              {ARTBOARD_PRESETS.slice(1).map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleAddPage(preset.width, preset.height)}
                  className="w-full text-left text-xs text-surface-dark-foreground hover:bg-surface-hover rounded px-2 py-1.5 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="border-t border-toolbar-border pt-2">
              <span className="text-[10px] text-surface-darker-foreground uppercase tracking-wider">Custom</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="number" min={100} max={4000} value={customW}
                  onChange={e => setCustomW(Number(e.target.value))}
                  className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded px-2 py-1 border border-toolbar-border outline-none"
                  placeholder="Width"
                />
                <input
                  type="number" min={100} max={4000} value={customH}
                  onChange={e => setCustomH(Number(e.target.value))}
                  className="w-full bg-surface-hover text-surface-dark-foreground text-xs rounded px-2 py-1 border border-toolbar-border outline-none"
                  placeholder="Height"
                />
              </div>
              <button
                onClick={() => handleAddPage(customW, customH)}
                className="w-full mt-2 bg-primary text-primary-foreground text-xs rounded py-1.5 hover:opacity-90 transition-opacity"
              >
                Add Custom Page
              </button>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
