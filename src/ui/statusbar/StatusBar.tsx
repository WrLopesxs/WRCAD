/**
 * src/ui/statusbar/StatusBar.tsx
 * Barra inferior fina, fixa no DOM (não flutuante). Chips de OSNAP à esquerda,
 * meta + toggle de tema à direita.
 */
import type { ReactNode } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/state/uiStore';
import { useDocumentStore } from '@/state/documentStore';
import type { SnapToggles } from '@/domain/types';

interface SnapChipDef {
  key: keyof SnapToggles;
  label: string;
  hint: string;
}

const CHIPS: SnapChipDef[] = [
  { key: 'endpoint', label: 'END', hint: 'Endpoint snap' },
  { key: 'midpoint', label: 'MID', hint: 'Midpoint snap' },
  { key: 'center', label: 'CEN', hint: 'Center snap' },
  { key: 'intersection', label: 'INT', hint: 'Intersection snap' },
  { key: 'perpendicular', label: 'PER', hint: 'Perpendicular snap' },
  { key: 'tangent', label: 'TAN', hint: 'Tangent snap' },
  { key: 'nearest', label: 'NEA', hint: 'Nearest point' },
  { key: 'grid', label: 'GRID', hint: 'Snap to grid' },
  { key: 'ortho', label: 'ORTHO', hint: 'Ortho mode · F8' },
  { key: 'polar', label: 'POLAR', hint: 'Polar tracking' },
];

export function StatusBar() {
  const snaps = useUIStore((s) => s.snaps);
  const toggleSnap = useUIStore((s) => s.toggleSnap);
  const viewStyle = useUIStore((s) => s.viewStyle);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const units = useDocumentStore((s) => s.doc.units);

  return (
    <footer className="relative z-20 flex items-center h-7 px-3 bg-surface border-t border-edge text-[10px]">
      <div className="flex items-center gap-1">
        {CHIPS.map((c) => (
          <Chip
            key={c.key}
            active={snaps[c.key]}
            onClick={() => toggleSnap(c.key)}
            title={c.hint}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Meta label="Vis." value={viewStyle} />
        <Divider />
        <Meta label="Un." value={units} />
        <Divider />
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-fg-muted hover:text-accent hover:bg-surface-2 transition-colors"
        >
          {theme === 'dark' ? <Sun size={11} /> : <Moon size={11} />}
          <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>
      </div>
    </footer>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-fg-faint">{label}</span>
      <span className="text-fg">{value}</span>
    </span>
  );
}

function Divider() {
  return <span className="w-px h-3 bg-edge" />;
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}

function Chip({ active, onClick, title, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-1.5 py-0.5 rounded font-medium tracking-wider transition-colors ${
        active
          ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
          : 'text-fg-faint hover:text-fg hover:bg-surface-2'
      }`}
    >
      {children}
    </button>
  );
}
