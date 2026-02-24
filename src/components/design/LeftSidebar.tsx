import { LayoutTemplate, Shapes, Type, Upload, Pencil, Settings } from 'lucide-react';
import { useCanvasContext, SelectedCategory } from '@/contexts/CanvasContext';

const categories: { id: SelectedCategory; icon: any; label: string }[] = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'elements', icon: Shapes, label: 'Elements' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'uploads', icon: Upload, label: 'Uploads' },
  { id: 'draw', icon: Pencil, label: 'Draw' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function LeftSidebar() {
  const { selectedCategory, setSelectedCategory, setDrawerOpen } = useCanvasContext();

  return (
    <aside className="w-16 bg-surface-darker flex flex-col items-center py-4 gap-1 shrink-0">
      {categories.map(({ id, icon: Icon, label }) => {
        const active = selectedCategory === id;
        return (
          <button
            key={id}
            onClick={() => {
              if (active) {
                setSelectedCategory(null);
                setDrawerOpen(false);
              } else {
                setSelectedCategory(id);
                setDrawerOpen(true);
              }
            }}
            className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg text-[10px] gap-0.5 transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-surface-darker-foreground hover:bg-surface-hover hover:text-surface-dark-foreground'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        );
      })}
    </aside>
  );
}
