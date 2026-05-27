/**
 * src/engine/snap.ts
 * Sistema de snap inspirado no OSNAP do AutoCAD. Recebe o cursor (2D, no plano
 * local do esboço) e uma lista de entidades candidatas, devolve o snap mais
 * próximo dentro do threshold (ou null). Toggles vêm do uiStore.
 */
import type { SketchEntity, SnapHit, SnapToggles, Vec2 } from '@/domain/types';

const DEFAULT_THRESHOLD = 4; // unidades do plano (mm)
const GRID_STEP = 5;

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

interface FindSnapInput {
  cursor: Vec2;
  entities: SketchEntity[];
  pendingPoints: Vec2[];
  snaps: SnapToggles;
  threshold?: number;
}

export function findSnap({
  cursor,
  entities,
  pendingPoints,
  snaps,
  threshold = DEFAULT_THRESHOLD,
}: FindSnapInput): SnapHit | null {
  const hits: SnapHit[] = [];

  const consider = (point: Vec2, type: SnapHit['type'], source?: string) => {
    const d = dist(cursor, point);
    if (d < threshold) hits.push({ point, type, distance: d, source });
  };

  // Entities já criadas
  for (const e of entities) {
    switch (e.type) {
      case 'line': {
        if (e.points.length < 2) break;
        const [a, b] = e.points;
        if (snaps.endpoint) {
          consider(a, 'endpoint', e.id);
          consider(b, 'endpoint', e.id);
        }
        if (snaps.midpoint) {
          consider([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], 'midpoint', e.id);
        }
        break;
      }
      case 'rect': {
        if (e.points.length < 2) break;
        const [a, b] = e.points;
        const corners: Vec2[] = [
          [a[0], a[1]],
          [b[0], a[1]],
          [b[0], b[1]],
          [a[0], b[1]],
        ];
        if (snaps.endpoint) {
          for (const c of corners) consider(c, 'endpoint', e.id);
        }
        if (snaps.midpoint) {
          for (let i = 0; i < 4; i++) {
            const c1 = corners[i];
            const c2 = corners[(i + 1) % 4];
            consider([(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2], 'midpoint', e.id);
          }
        }
        break;
      }
      case 'circle': {
        if (e.points.length < 2) break;
        const [c, edge] = e.points;
        if (snaps.center) consider(c, 'center', e.id);
        // quadrants
        if (snaps.endpoint) {
          const r = dist(c, edge);
          consider([c[0] + r, c[1]], 'endpoint', e.id);
          consider([c[0] - r, c[1]], 'endpoint', e.id);
          consider([c[0], c[1] + r], 'endpoint', e.id);
          consider([c[0], c[1] - r], 'endpoint', e.id);
        }
        break;
      }
      default:
        break;
    }
  }

  // pontos pendentes (ex: snap no próprio ponto inicial do comando)
  if (snaps.endpoint) {
    for (const p of pendingPoints) consider(p, 'endpoint', '__pending__');
  }

  // grid
  if (snaps.grid) {
    const gx = Math.round(cursor[0] / GRID_STEP) * GRID_STEP;
    const gy = Math.round(cursor[1] / GRID_STEP) * GRID_STEP;
    consider([gx, gy], 'grid');
  }

  if (hits.length === 0) return null;
  hits.sort((a, b) => a.distance - b.distance);
  return hits[0];
}
