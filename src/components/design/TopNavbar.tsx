import { Undo2, Redo2, Download, ZoomIn, ZoomOut, Group, Ungroup } from 'lucide-react';
import { useCanvasContext } from '@/contexts/CanvasContext';
import { useState } from 'react';

interface TopNavbarProps {
  onDownload: (format: 'png' | 'jpeg') => void;
  onGroup: () => void;
  onUngroup: () => void;
}

export default function TopNavbar({ onDownload, onGroup, onUngroup }: TopNavbarProps) {
  const { fileName, setFileName, zoom, setZoom, undo, redo, canUndo, canRedo, selectedObjects } = useCanvasContext();
  const [editing, setEditing] = useState(false);
  const hasMultiSelect = selectedObjects.length > 1;
  const isGroup = selectedObjects.length === 1 && (selectedObjects[0] as any)?.type === 'group';

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-surface-dark border-b border-toolbar-border shrink-0">
      {/* Left: File name */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">D</span>
        </div>
        {editing ? (
          <input
            className="bg-surface-hover text-surface-dark-foreground text-sm px-2 py-1 rounded outline-none border border-toolbar-border"
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={e => e.key === 'Enter' && setEditing(false)}
            autoFocus
          />
        ) : (
          <button onClick={() => setEditing(true)} className="text-surface-dark-foreground text-sm font-medium hover:text-primary-foreground transition-colors">
            {fileName}
          </button>
        )}
      </div>

      {/* Center: Undo/Redo + Group + Zoom */}
      <div className="flex items-center gap-1">
        <NavButton icon={Undo2} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" />
        <NavButton icon={Redo2} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" />

        <div className="w-px h-5 bg-toolbar-border mx-2" />

        {hasMultiSelect && (
          <NavButton icon={Group} onClick={onGroup} title="Group" />
        )}
        {isGroup && (
          <NavButton icon={Ungroup} onClick={onUngroup} title="Ungroup" />
        )}

        {(hasMultiSelect || isGroup) && <div className="w-px h-5 bg-toolbar-border mx-2" />}

        <NavButton icon={ZoomOut} onClick={() => setZoom(Math.max(25, zoom - 10))} title="Zoom Out" />
        <span className="text-surface-dark-foreground text-xs w-10 text-center">{zoom}%</span>
        <NavButton icon={ZoomIn} onClick={() => setZoom(Math.min(300, zoom + 10))} title="Zoom In" />
        <input
          type="range" min={25} max={300} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="w-20 h-1 accent-primary ml-1"
        />
      </div>

      {/* Right: Download */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onDownload('png')}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
        >
          <Download size={14} />
          PNG
        </button>
        <button
          onClick={() => onDownload('jpeg')}
          className="flex items-center gap-1.5 bg-surface-hover text-surface-dark-foreground text-xs font-medium px-3 py-1.5 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Download size={14} />
          JPG
        </button>
      </div>
    </header>
  );
}

function NavButton({ icon: Icon, onClick, disabled, title }: { icon: any; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-md text-surface-dark-foreground hover:bg-surface-hover hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <Icon size={16} />
    </button>
  );
}
