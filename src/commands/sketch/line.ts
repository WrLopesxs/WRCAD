/**
 * src/commands/sketch/line.ts
 * Comando LINE — clique inicial = primeiro ponto; cliques seguintes desenham
 * uma linha do ponto anterior até o novo ponto (modo contínuo, igual AutoCAD).
 * ESC sai do modo contínuo.
 */
import type { Vec2 } from '@/domain/types';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { useDocumentStore } from '@/state/documentStore';
import { newId } from '@/utils/ids';
import { requireSketch } from './guards';

export function lineCommand() {
  if (!requireSketch('LINE')) return;

  const cs = useCommandStore.getState();
  const sk = useSketchStore.getState();

  sk.clearPending();
  sk.setPreviewKind('line');
  cs.setActiveCommand('LINE');
  cs.setPrompt('Primeiro ponto:');

  let from: Vec2 | null = null;

  const handler = (p: Vec2) => {
    if (from === null) {
      from = p;
      useSketchStore.getState().pushPendingPoint(p);
      useCommandStore.getState().setPrompt('Próximo ponto (ESC sai):');
      return;
    }

    const layerId = useDocumentStore.getState().activeLayerId;
    useSketchStore.getState().addEntity({
      id: newId(),
      type: 'line',
      points: [from, p],
      construction: false,
      layerId,
    });

    // continua a partir do último ponto (modo contínuo)
    from = p;
    useSketchStore.getState().clearPending();
    useSketchStore.getState().pushPendingPoint(p);
  };

  cs.setOnPoint(handler);
}
