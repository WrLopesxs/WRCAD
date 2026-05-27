/**
 * src/commands/sketch/cline.ts
 * Comando CLINE — linha de CONSTRUÇÃO. Idêntico ao LINE em fluxo, mas as
 * entidades criadas têm `construction: true`. Não viram contorno de extrusão
 * (filtrado em sketchToShape) e servem como referência geométrica:
 *  - Eixo de revolução
 *  - Eixo de espelhamento
 *  - Auxiliar de cotagem
 *
 * Renderização: tracejado amarelo no SketchLayer.
 */
import type { Vec2 } from '@/domain/types';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { useDocumentStore } from '@/state/documentStore';
import { newId } from '@/utils/ids';
import { requireSketch } from './guards';

export function clineCommand() {
  if (!requireSketch('CLINE')) return;

  const cs = useCommandStore.getState();
  const sk = useSketchStore.getState();

  sk.clearPending();
  sk.setPreviewKind('line');
  cs.setActiveCommand('CLINE');
  cs.setPrompt('Eixo · primeiro ponto:');

  let from: Vec2 | null = null;

  const handler = (p: Vec2) => {
    if (from === null) {
      from = p;
      useSketchStore.getState().pushPendingPoint(p);
      useCommandStore.getState().setPrompt('Eixo · próximo ponto (ESC sai):');
      return;
    }

    const layerId = useDocumentStore.getState().activeLayerId;
    useSketchStore.getState().addEntity({
      id: newId(),
      type: 'line',
      points: [from, p],
      construction: true,
      layerId,
    });

    from = p;
    useSketchStore.getState().clearPending();
    useSketchStore.getState().pushPendingPoint(p);
  };

  cs.setOnPoint(handler);
}
