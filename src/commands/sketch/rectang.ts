/**
 * src/commands/sketch/rectang.ts
 * Comando RECTANG — dois cliques definem cantos opostos do retângulo.
 * Armazenado como type='rect' com points = [corner1, corner2].
 */
import type { Vec2 } from '@/domain/types';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { useDocumentStore } from '@/state/documentStore';
import { newId } from '@/utils/ids';
import { requireSketch } from './guards';

export function rectangCommand() {
  if (!requireSketch('RECTANG')) return;

  const cs = useCommandStore.getState();
  const sk = useSketchStore.getState();

  sk.clearPending();
  sk.setPreviewKind('rect');
  cs.setActiveCommand('RECTANG');
  cs.setPrompt('Primeiro canto:');

  let corner: Vec2 | null = null;

  const handler = (p: Vec2) => {
    if (corner === null) {
      corner = p;
      useSketchStore.getState().pushPendingPoint(p);
      useCommandStore.getState().setPrompt('Canto oposto:');
      return;
    }

    const layerId = useDocumentStore.getState().activeLayerId;
    useSketchStore.getState().addEntity({
      id: newId(),
      type: 'rect',
      points: [corner, p],
      construction: false,
      layerId,
    });

    corner = null;
    useSketchStore.getState().clearPending();
    useCommandStore.getState().setPrompt('Primeiro canto (ESC sai):');
  };

  cs.setOnPoint(handler);
}
