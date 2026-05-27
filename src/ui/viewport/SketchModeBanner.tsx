/**
 * src/ui/viewport/SketchModeBanner.tsx
 * Banner discreto no topo do viewport quando há esboço ativo. Mostra qual
 * plano está em uso, contador de entidades, e botões para concluir/descartar.
 */
import { PenLine, Check, X } from 'lucide-react';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { executeCommand } from '@/commands/parser';

export function SketchModeBanner() {
  const plane = useSketchStore((s) => s.plane);
  const entityCount = useSketchStore((s) => s.entities.length);
  const activeSketchId = useSketchStore((s) => s.activeSketchId);
  const exit = useSketchStore((s) => s.exit);

  if (!activeSketchId || !plane) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 floating-panel px-3 py-1.5 flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5 text-accent">
        <PenLine size={13} />
        <span className="font-semibold">Modo Esboço</span>
      </div>
      <span className="text-fg-faint">·</span>
      <span className="text-fg-muted">
        Plano <span className="text-fg font-medium">{plane}</span>
      </span>
      <span className="text-fg-faint">·</span>
      <span className="text-fg-muted">
        {entityCount} {entityCount === 1 ? 'entidade' : 'entidades'}
      </span>
      <div className="w-px h-4 bg-edge mx-1" />
      <button
        type="button"
        onClick={() => executeCommand('FINISH-SKETCH')}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-[rgb(var(--color-accent-contrast))] font-medium hover:bg-accent-hover transition-colors"
        title="Concluir esboço"
      >
        <Check size={12} />
        <span>Concluir</span>
      </button>
      <button
        type="button"
        onClick={() => {
          const cs = useCommandStore.getState();
          cs.setOnPoint(null);
          cs.setActiveCommand(null);
          cs.setPrompt('Comando:');
          exit();
          cs.log({ text: 'Esboço descartado.', kind: 'info' });
        }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-fg-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Descartar esboço"
      >
        <X size={12} />
        <span>Descartar</span>
      </button>
    </div>
  );
}
