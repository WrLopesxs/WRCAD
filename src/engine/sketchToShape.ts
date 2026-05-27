/**
 * src/engine/sketchToShape.ts
 * Converte SketchEntity[] num THREE.Shape consumível por ExtrudeGeometry.
 *
 * Pipeline:
 *  1. Extrai TODOS os loops fechados (cada círculo/rect é loop; linhas viram
 *     polígonos quando formam cadeia fechada).
 *  2. Maior loop por área = contorno externo (outer).
 *  3. Demais loops são candidatos a furos. Aplicam-se 2 filtros:
 *     a) Containment: o centroide do loop tem que estar DENTRO do outer
 *        (senão Three.js earcut quebra)
 *     b) Não-overlap: descarta furos cujas bboxes se sobrepõem a furos já
 *        aceitos (earcut também quebra)
 *  4. Loops descartados são reportados no diagnóstico — a dica é fazer
 *     extrudes separadas + cut-extrude para casos complexos.
 */
import * as THREE from 'three';
import type { SketchEntity, Vec2 } from '@/domain/types';

const TOL = 1e-3;

export interface SketchToShapeResult {
  shape: THREE.Shape | null;
  error: string | null;
  loopsFound: number;
  holesFound: number;
  droppedCount: number;
  droppedReasons: string[];
}

interface Loop {
  kind: 'circle' | 'polygon';
  vertices: Vec2[]; // sempre populado (mesmo para círculo, com pontos amostrados)
  center?: Vec2;
  radius?: number;
  area: number;
  bbox: BBox;
}

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function sketchToShape(entities: SketchEntity[]): SketchToShapeResult {
  const drawables = entities.filter((e) => !e.construction);
  if (drawables.length === 0) {
    return emptyResult('Esboço vazio.');
  }

  const loops = extractLoops(drawables);
  if (loops.length === 0) {
    return emptyResult(
      'Nenhum loop fechado encontrado. Verifique se as linhas conectam (use snap endpoint).',
    );
  }

  loops.sort((a, b) => b.area - a.area);
  const [outer, ...candidates] = loops;

  const droppedReasons: string[] = [];
  const acceptedHoles: Loop[] = [];

  for (const cand of candidates) {
    // Filtro A: centroide deve estar dentro do outer
    if (!pointInsideLoop(centroidOf(cand), outer)) {
      droppedReasons.push(
        `${describeLoop(cand)} fora do contorno principal (não pode virar furo)`,
      );
      continue;
    }
    // Filtro B: bbox não pode sobrepor um furo já aceito
    const overlapping = acceptedHoles.find((h) => bboxOverlap(cand.bbox, h.bbox));
    if (overlapping) {
      droppedReasons.push(
        `${describeLoop(cand)} sobreposto a outro furo (use Corte separado)`,
      );
      continue;
    }
    acceptedHoles.push(cand);
  }

  const shape = new THREE.Shape();
  loopToPath(outer, shape);
  for (const hole of acceptedHoles) {
    const path = new THREE.Path();
    loopToPath(hole, path);
    shape.holes.push(path);
  }

  return {
    shape,
    error: null,
    loopsFound: loops.length,
    holesFound: acceptedHoles.length,
    droppedCount: droppedReasons.length,
    droppedReasons,
  };
}

function emptyResult(error: string): SketchToShapeResult {
  return {
    shape: null,
    error,
    loopsFound: 0,
    holesFound: 0,
    droppedCount: 0,
    droppedReasons: [],
  };
}

/* ============== extração de loops ============== */

function extractLoops(entities: SketchEntity[]): Loop[] {
  const loops: Loop[] = [];
  const lineSegs: { from: Vec2; to: Vec2 }[] = [];

  for (const e of entities) {
    switch (e.type) {
      case 'circle': {
        if (e.points.length < 2) break;
        const [c, edge] = e.points;
        const r = Math.hypot(edge[0] - c[0], edge[1] - c[1]);
        if (r > 0) loops.push(makeCircleLoop(c, r));
        break;
      }
      case 'rect': {
        if (e.points.length < 2) break;
        const [a, b] = e.points;
        const verts: Vec2[] = [
          [a[0], a[1]],
          [b[0], a[1]],
          [b[0], b[1]],
          [a[0], b[1]],
        ];
        loops.push(makePolygonLoop(verts));
        break;
      }
      case 'line': {
        if (e.points.length === 2) lineSegs.push({ from: e.points[0], to: e.points[1] });
        break;
      }
      default:
        break;
    }
  }

  const polys = tracePolygons(lineSegs);
  for (const p of polys) loops.push(makePolygonLoop(p));

  return loops.filter((l) => l.area > 1e-6);
}

function makeCircleLoop(c: Vec2, r: number): Loop {
  // amostragem leve só para containment/bbox (não usado no path do shape)
  const N = 32;
  const vertices: Vec2[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    vertices.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]);
  }
  return {
    kind: 'circle',
    vertices,
    center: c,
    radius: r,
    area: Math.PI * r * r,
    bbox: { minX: c[0] - r, maxX: c[0] + r, minY: c[1] - r, maxY: c[1] + r },
  };
}

function makePolygonLoop(verts: Vec2[]): Loop {
  return {
    kind: 'polygon',
    vertices: verts,
    area: polygonArea(verts),
    bbox: polygonBBox(verts),
  };
}

/* ============== tracing de polígono a partir de linhas ============== */

interface Segment {
  from: Vec2;
  to: Vec2;
}

function tracePolygons(segs: Segment[]): Vec2[][] {
  const remaining = [...segs];
  const polygons: Vec2[][] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const polygon: Vec2[] = [seed.from, seed.to];
    let currentEnd = seed.to;
    let closed = false;

    while (remaining.length > 0) {
      let idx = -1;
      let nextPoint: Vec2 | null = null;
      for (let i = 0; i < remaining.length; i++) {
        const s = remaining[i];
        if (pointsEqual(s.from, currentEnd)) {
          idx = i;
          nextPoint = s.to;
          break;
        }
        if (pointsEqual(s.to, currentEnd)) {
          idx = i;
          nextPoint = s.from;
          break;
        }
      }
      if (idx === -1 || !nextPoint) break;
      remaining.splice(idx, 1);

      if (pointsEqual(nextPoint, polygon[0])) {
        closed = true;
        break;
      }
      polygon.push(nextPoint);
      currentEnd = nextPoint;
    }

    if (closed && polygon.length >= 3) polygons.push(polygon);
  }

  return polygons;
}

/* ============== geometria 2D ============== */

function polygonArea(verts: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i];
    const q = verts[(i + 1) % verts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

function polygonBBox(verts: Vec2[]): BBox {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const v of verts) {
    if (v[0] < minX) minX = v[0];
    if (v[0] > maxX) maxX = v[0];
    if (v[1] < minY) minY = v[1];
    if (v[1] > maxY) maxY = v[1];
  }
  return { minX, maxX, minY, maxY };
}

function centroidOf(loop: Loop): Vec2 {
  if (loop.kind === 'circle' && loop.center) return loop.center;
  // centroide simples (média dos vértices) — bom o suficiente para containment
  let cx = 0,
    cy = 0;
  for (const v of loop.vertices) {
    cx += v[0];
    cy += v[1];
  }
  return [cx / loop.vertices.length, cy / loop.vertices.length];
}

function pointInsideLoop(p: Vec2, loop: Loop): boolean {
  if (loop.kind === 'circle' && loop.center && loop.radius != null) {
    const dx = p[0] - loop.center[0];
    const dy = p[1] - loop.center[1];
    return Math.hypot(dx, dy) < loop.radius - TOL;
  }
  return pointInPolygon(p, loop.vertices);
}

// Ray-casting padrão
function pointInPolygon(p: Vec2, verts: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i][0],
      yi = verts[i][1];
    const xj = verts[j][0],
      yj = verts[j][1];
    const intersect = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function bboxOverlap(a: BBox, b: BBox): boolean {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
}

function describeLoop(loop: Loop): string {
  if (loop.kind === 'circle') return 'círculo';
  if (loop.vertices.length === 4) return 'retângulo';
  return `polígono (${loop.vertices.length} lados)`;
}

/* ============== conversão para Three.js Shape/Path ============== */

function loopToPath(loop: Loop, path: THREE.Shape | THREE.Path): void {
  if (loop.kind === 'circle' && loop.center && loop.radius != null) {
    const [cx, cy] = loop.center;
    path.moveTo(cx + loop.radius, cy);
    path.absarc(cx, cy, loop.radius, 0, Math.PI * 2, false);
    return;
  }
  const v = loop.vertices;
  if (v.length < 3) return;
  path.moveTo(v[0][0], v[0][1]);
  for (let i = 1; i < v.length; i++) path.lineTo(v[i][0], v[i][1]);
  path.closePath();
}

function pointsEqual(a: Vec2, b: Vec2): boolean {
  return Math.abs(a[0] - b[0]) < TOL && Math.abs(a[1] - b[1]) < TOL;
}
