/**
 * src/commands/sketch/circle.ts
 * Comando CIRCLE — clique 1 = centro, clique 2 = ponto na circunferência.
 * Em planos verticais (YZ/XZ) o raio é clampado pra que o círculo não passe
 * abaixo da grid (Y=0 mundial). Se o usuário tenta um raio que faria isso,
 * o ponto de borda é projetado pra distância máxima permitida (= centro.v).
 */
import type { Vec2 } from '@/domain/types';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { useDocumentStore } from '@/state/documentStore';
import { newId } from '@/utils/ids';
import { requireSketch } from './guards';

export function circleCommand() {
  if (!requireSketch('CIRCLE')) return;

  const cs = useCommandStore.getState();
  const sk = useSketchStore.getState();

  sk.clearPending();
  sk.setPreviewKind('circle');
  cs.setActiveCommand('CIRCLE');
  cs.setPrompt('Centro:');

  let center: Vec2 | null = null;

  const handler = (p: Vec2) => {
    if (center === null) {
      center = p;
      useSketchStore.getState().pushPendingPoint(p);
      useCommandStore.getState().setPrompt('Ponto na circunferência (raio):');
      return;
    }

    const edgePoint = clampEdgeToGrid(center, p);
    const layerId = useDocumentStore.getState().activeLayerId;
    useSketchStore.getState().addEntity({
      id: newId(),
      type: 'circle',
      points: [center, edgePoint],
      construction: false,
      layerId,
    });

    center = null;
    useSketchStore.getState().clearPending();
    useCommandStore.getState().setPrompt('Centro (ESC sai):');
  };

  cs.setOnPoint(handler);
}

/**
 * Em planos YZ/XZ a coordenada V do plano = Y do mundo. O círculo só fica
 * acima da grid se center.v - radius >= 0. Se o usuário pede raio maior,
 * projetamos o ponto de borda na direção original, mas na distância
 * máxima = center.v.
 */
function clampEdgeToGrid(center: Vec2, edge: Vec2): Vec2 {
  const plane = useSketchStore.getState().plane;
  if (plane !== 'XZ' && plane !== 'YZ') return edge;

  const dx = edge[0] - center[0];
  const dy = edge[1] - center[1];
  const radius = Math.hypot(dx, dy);
  const maxRadius = center[1]; // center.v = world Y nesses planos
  if (radius <= maxRadius || maxRadius <= 0) return edge;

  // shrink: mantém a direção, encurta o raio para tocar a grid
  const angle = Math.atan2(dy, dx);
  return [center[0] + maxRadius * Math.cos(angle), center[1] + maxRadius * Math.sin(angle)];
}
