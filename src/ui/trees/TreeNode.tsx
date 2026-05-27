/**
 * src/ui/trees/TreeNode.tsx
 * Nó individual da árvore de features.
 *  - Sempre visível: ícone + nome (clique seleciona, duplo-clique renomeia)
 *  - Sempre visível: toggle de visibilidade (eye) se oculto/selecionado
 *  - Visível no hover: editar (para sketches), excluir (qualquer feature)
 *  - Estados visuais: suprimida (riscado), erro (vermelho + ⚠)
 */
import { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Box,
  Circle,
  RotateCw,
  Layers,
  CircleDot,
  Frame,
  Grid3x3,
  FlipHorizontal2,
  PenLine,
  HelpCircle,
  Pencil,
  Trash2,
  Scissors,
  Disc,
  Square,
} from 'lucide-react';
import type { Feature, FeatureType } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { deleteFeature, editSketchFeature } from '@/commands/featureOps';

const FEATURE_ICON: Partial<Record<FeatureType, JSX.Element>> = {
  sketch: <PenLine size={13} />,
  extrude: <Box size={13} />,
  'cut-extrude': <Scissors size={13} />,
  revolve: <RotateCw size={13} />,
  'cut-revolve': <RotateCw size={13} />,
  sweep: <Circle size={13} />,
  loft: <Layers size={13} />,
  fillet: <CircleDot size={13} />,
  chamfer: <CircleDot size={13} />,
  shell: <Frame size={13} />,
  'pattern-linear': <Grid3x3 size={13} />,
  'pattern-circular': <Grid3x3 size={13} />,
  mirror: <FlipHorizontal2 size={13} />,
  hole: <Disc size={13} />,
  primitive: <Square size={13} />,
};

interface TreeNodeProps {
  feature: Feature;
  selected: boolean;
  onSelect: () => void;
}

export function TreeNode({ feature, selected, onSelect }: TreeNodeProps) {
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(feature.name);
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const renameFeature = useDocumentStore((s) => s.renameFeature);

  const icon = FEATURE_ICON[feature.type] ?? <HelpCircle size={13} />;
  const isSketch = feature.type === 'sketch';

  const rowClass = [
    'group flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer select-none transition-colors',
    selected ? 'bg-accent/15 text-fg' : 'hover:bg-surface-2 text-fg',
  ].join(' ');

  const labelClass = [
    'flex-1 truncate text-xs',
    feature.suppressed ? 'line-through text-fg-faint' : '',
    feature.errored ? 'text-red-500' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={rowClass}
      onClick={onSelect}
      onDoubleClick={() => {
        if (isSketch && !editingName) {
          editSketchFeature(feature);
        } else {
          setEditingName(true);
        }
      }}
    >
      <span className={selected ? 'text-accent' : 'text-fg-muted'}>{icon}</span>

      {editingName ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            renameFeature(feature.id, draft || feature.name);
            setEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              renameFeature(feature.id, draft || feature.name);
              setEditingName(false);
            }
            if (e.key === 'Escape') {
              setDraft(feature.name);
              setEditingName(false);
            }
          }}
          className="flex-1 bg-surface-2 text-xs px-1.5 py-0.5 outline-none border border-accent rounded text-fg"
        />
      ) : (
        <span className={labelClass}>{feature.name}</span>
      )}

      {feature.errored && (
        <AlertCircle
          size={12}
          className="text-red-500 shrink-0"
          aria-label={`Erro em ${feature.name}`}
        />
      )}

      <div className="flex items-center gap-px shrink-0">
        {isSketch && (
          <RowButton
            onClick={() => editSketchFeature(feature)}
            title="Editar esboço"
            className="opacity-0 group-hover:opacity-100"
          >
            <Pencil size={11} />
          </RowButton>
        )}

        <RowButton
          onClick={() => updateFeature(feature.id, { visible: !feature.visible })}
          title={feature.visible ? 'Ocultar' : 'Mostrar'}
          className={
            feature.visible && !selected ? 'opacity-0 group-hover:opacity-100' : 'opacity-90'
          }
        >
          {feature.visible ? <Eye size={11} /> : <EyeOff size={11} />}
        </RowButton>

        <RowButton
          onClick={() => deleteFeature(feature)}
          title="Excluir"
          danger
          className="opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={11} />
        </RowButton>
      </div>
    </li>
  );
}

interface RowButtonProps {
  onClick: () => void;
  title: string;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}

function RowButton({ onClick, title, danger, className, children }: RowButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1 rounded transition-colors ${
        danger
          ? 'text-fg-muted hover:text-red-500 hover:bg-red-500/10'
          : 'text-fg-muted hover:text-fg hover:bg-surface-3'
      } ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
