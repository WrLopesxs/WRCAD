/**
 * src/ui/viewport/PickingBanner.tsx
 * Banner que aparece no topo do viewport quando há um onPick ativo (modo
 * picking 3D). Lê o estado do commandStore e mostra prompt + botão cancelar.
 */
import { MousePointer2, X } from 'lucide-react';
import { useCommandStore } from '@/state/commandStore';
import { executeCommand } from '@/commands/parser';

export function PickingBanner() {
  const onPick = useCommandStore((s) => s.onPick);
  const prompt = useCommandStore((s) => s.prompt);
  const activeCommand = useCommandStore((s) => s.activeCommand);

  if (!onPick) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 floating-panel px-3 py-1.5 flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5 text-accent">
        <MousePointer2 size={13} />
        <span className="font-semibold">{activeCommand ?? 'Picking'}</span>
      </div>
      <span className="text-fg-faint">·</span>
      <span className="text-fg-muted">{prompt}</span>
      <div className="w-px h-4 bg-edge mx-1" />
      <button
        type="button"
        onClick={() => executeCommand('CANCEL')}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-fg-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Cancelar (ESC)"
      >
        <X size={12} />
        <span>Cancelar</span>
      </button>
    </div>
  );
}
