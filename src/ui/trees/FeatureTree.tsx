/**
 * src/ui/trees/FeatureTree.tsx
 * Painel flutuante (vidro fosco) com a árvore de features no topo e o
 * LayerPanel ancorado embaixo. Cabeçalhos pequenos, hover sutil.
 */
import { useState } from 'react';
import { Compass, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { TreeNode } from './TreeNode';
import { LayerPanel } from './LayerPanel';

export function FeatureTree() {
  const features = useDocumentStore((s) => s.doc.features);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);

  const [treeOpen, setTreeOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);

  return (
    <aside className="floating-panel h-full flex flex-col overflow-hidden">
      <SectionHeader open={treeOpen} onToggle={() => setTreeOpen(!treeOpen)}>
        Árvore de Recursos
      </SectionHeader>

      {treeOpen && (
        <div className="flex-1 min-h-0 overflow-y-auto px-1 py-1">
          <ul className="space-y-px">
            <li className="flex items-center gap-2 px-2 py-1.5 text-xs text-fg-muted rounded-md">
              <Compass size={14} className="text-accent" />
              <span>Origem</span>
              <span className="ml-auto text-[10px] text-fg-faint">XY · YZ · XZ</span>
            </li>
            {features.length === 0 ? (
              <li className="m-2 px-3 py-5 text-[11px] text-fg-faint border border-dashed border-edge rounded-lg text-center">
                <Plus size={16} className="mx-auto mb-1.5 opacity-50" />
                <p className="font-medium text-fg-muted">Nenhuma feature ainda</p>
                <p className="mt-0.5 opacity-80">Esboce e extrude para começar</p>
              </li>
            ) : (
              features.map((f) => (
                <TreeNode
                  key={f.id}
                  feature={f}
                  selected={selectedIds.includes(f.id)}
                  onSelect={() => select([f.id])}
                />
              ))
            )}
          </ul>
        </div>
      )}

      <div className="hairline opacity-70" />

      <SectionHeader open={layersOpen} onToggle={() => setLayersOpen(!layersOpen)}>
        Camadas
      </SectionHeader>
      {layersOpen && (
        <div className="max-h-[40%] overflow-y-auto">
          <LayerPanel />
        </div>
      )}
    </aside>
  );
}

interface SectionHeaderProps {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SectionHeader({ open, onToggle, children }: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 w-full px-3 py-2 text-[10px] uppercase tracking-[0.12em] font-semibold text-fg-muted hover:text-fg transition-colors"
    >
      {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      <span>{children}</span>
    </button>
  );
}
