/**
 * src/ui/trees/LayerPanel.tsx
 * Painel de camadas (AutoCAD-like). Linha por camada com swatch de cor,
 * toggles de visibilidade/lock/plot. Ativa fica destacada com barra accent.
 */
import { Eye, EyeOff, Lock, Unlock, Printer, PrinterCheck, Plus, Trash2 } from 'lucide-react';
import { useDocumentStore } from '@/state/documentStore';
import { newId } from '@/utils/ids';
import type { Layer } from '@/domain/types';

const SWATCHES = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

function makeLayer(index: number): Layer {
  return {
    id: newId(),
    name: `Camada ${index}`,
    color: SWATCHES[index % SWATCHES.length],
    lineType: 'continuous',
    lineWeight: 0.25,
    visible: true,
    locked: false,
    plot: true,
  };
}

export function LayerPanel() {
  const layers = useDocumentStore((s) => s.doc.layers);
  const activeLayerId = useDocumentStore((s) => s.activeLayerId);
  const setActiveLayer = useDocumentStore((s) => s.setActiveLayer);
  const updateLayer = useDocumentStore((s) => s.updateLayer);
  const addLayer = useDocumentStore((s) => s.addLayer);
  const removeLayer = useDocumentStore((s) => s.removeLayer);

  return (
    <div className="px-1 pb-1.5">
      <div className="flex items-center justify-end px-2 mb-1">
        <button
          type="button"
          onClick={() => addLayer(makeLayer(layers.length))}
          title="Nova camada"
          className="btn-ghost !px-1.5 !py-0.5"
        >
          <Plus size={11} />
          <span>Adicionar</span>
        </button>
      </div>

      <ul className="space-y-px">
        {layers.map((l) => {
          const isActive = activeLayerId === l.id;
          return (
            <li
              key={l.id}
              className={`group flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-md cursor-pointer transition-colors ${
                isActive ? 'bg-accent/12' : 'hover:bg-surface-2'
              }`}
              onClick={() => setActiveLayer(l.id)}
            >
              <span
                className={`w-1 h-5 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`}
              />
              <label className="relative inline-block w-3.5 h-3.5 rounded shadow-sm ring-1 ring-black/10 cursor-pointer overflow-hidden flex-shrink-0">
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: l.color }}
                />
                <input
                  type="color"
                  value={l.color}
                  onChange={(e) => updateLayer(l.id, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
              <input
                value={l.name}
                onChange={(e) => updateLayer(l.id, { name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent text-[11px] text-fg outline-none focus:bg-surface-2 px-1 rounded"
              />
              <IconBtn
                onClick={() => updateLayer(l.id, { visible: !l.visible })}
                title={l.visible ? 'Ocultar' : 'Mostrar'}
              >
                {l.visible ? <Eye size={11} /> : <EyeOff size={11} className="text-fg-faint" />}
              </IconBtn>
              <IconBtn
                onClick={() => updateLayer(l.id, { locked: !l.locked })}
                title={l.locked ? 'Destravar' : 'Travar'}
              >
                {l.locked ? <Lock size={11} /> : <Unlock size={11} className="text-fg-faint" />}
              </IconBtn>
              <IconBtn
                onClick={() => updateLayer(l.id, { plot: !l.plot })}
                title={l.plot ? 'Não imprimir' : 'Imprimir'}
              >
                {l.plot ? <PrinterCheck size={11} /> : <Printer size={11} className="text-fg-faint" />}
              </IconBtn>
              <IconBtn
                onClick={() => removeLayer(l.id)}
                title="Excluir camada"
                danger
              >
                <Trash2 size={11} />
              </IconBtn>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface IconBtnProps {
  onClick: () => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}

function IconBtn({ onClick, title, danger, children }: IconBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1 rounded transition-colors opacity-70 hover:opacity-100 ${
        danger
          ? 'text-fg-faint hover:text-red-500 hover:bg-red-500/10'
          : 'text-fg-muted hover:text-fg hover:bg-surface-3'
      }`}
    >
      {children}
    </button>
  );
}
