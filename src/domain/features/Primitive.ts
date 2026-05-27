/**
 * src/domain/features/Primitive.ts
 * Gera geometria de uma primitiva pronta (box, cilindro, esfera, cone, toro).
 *
 * Convenção: a primitiva fica POSICIONADA com sua BASE em y=0 + p.position
 * — facilita "plug and play" (a peça sempre aparece sobre a grid).
 *
 * Cada shape usa o geometry built-in do three.js com defaults sensatos.
 * O caller (evaluator) chama booleanGeometries com 'union' pra encadear
 * com o corpo atual (ou usa solta se for a primeira feature).
 */
import * as THREE from 'three';
import type { PrimitiveParams, PrimitiveShape } from '@/domain/types';

export interface PrimitiveResult {
  geometry: THREE.BufferGeometry | null;
  error: string | null;
}

export function evaluatePrimitive(p: PrimitiveParams): PrimitiveResult {
  try {
    let geom: THREE.BufferGeometry;
    let baseLift = 0; // quanto subir em Y depois pra base ficar em y=0

    switch (p.shape) {
      case 'box': {
        const w = Math.max(0.1, p.width ?? 20);
        const h = Math.max(0.1, p.height ?? 20);
        const d = Math.max(0.1, p.depth ?? 20);
        geom = new THREE.BoxGeometry(w, h, d);
        baseLift = h / 2;
        break;
      }
      case 'cylinder': {
        const r = Math.max(0.1, p.radius ?? 10);
        const h = Math.max(0.1, p.height ?? 20);
        const segs = Math.max(8, p.segments ?? 32);
        geom = new THREE.CylinderGeometry(r, r, h, segs);
        baseLift = h / 2;
        break;
      }
      case 'sphere': {
        const r = Math.max(0.1, p.radius ?? 15);
        const segs = Math.max(8, p.segments ?? 32);
        // sphere segments * 2 nos meridianos pra ficar suave
        geom = new THREE.SphereGeometry(r, segs, Math.max(6, segs / 2));
        baseLift = r;
        break;
      }
      case 'cone': {
        const rBase = Math.max(0.1, p.radius ?? 10);
        const rTop = Math.max(0, p.radiusTop ?? 0);
        const h = Math.max(0.1, p.height ?? 20);
        const segs = Math.max(8, p.segments ?? 32);
        geom = new THREE.CylinderGeometry(rTop, rBase, h, segs);
        baseLift = h / 2;
        break;
      }
      case 'torus': {
        const r = Math.max(0.1, p.radius ?? 15);
        const tubeR = Math.max(0.05, p.tubeRadius ?? 4);
        const segs = Math.max(8, p.segments ?? 32);
        // TorusGeometry(radius, tube, radialSegs, tubularSegs)
        geom = new THREE.TorusGeometry(r, tubeR, Math.max(6, segs / 2), segs);
        // Torus padrão fica em XY (em pé). Roda pra ficar deitado em XZ:
        geom.rotateX(Math.PI / 2);
        baseLift = tubeR;
        break;
      }
      default:
        return { geometry: null, error: `Shape desconhecido: ${p.shape as string}` };
    }

    // Sobe pra base em y=0 (CylinderGeometry/BoxGeometry vêm centralizados)
    geom.translate(0, baseLift, 0);

    // Rotação opcional em torno de Y
    if (p.rotationY) {
      geom.rotateY(THREE.MathUtils.degToRad(p.rotationY));
    }

    // Posiciona no mundo
    geom.translate(p.position[0], p.position[1], p.position[2]);

    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    return { geometry: geom, error: null };
  } catch (err) {
    return {
      geometry: null,
      error: `Primitiva falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

const DEFAULT_DIMS: Record<PrimitiveShape, Partial<PrimitiveParams>> = {
  box: { width: 30, height: 20, depth: 20 },
  cylinder: { radius: 10, height: 30 },
  sphere: { radius: 15 },
  cone: { radius: 12, radiusTop: 0, height: 25 },
  torus: { radius: 18, tubeRadius: 5 },
};

export function defaultPrimitiveParams(shape: PrimitiveShape): PrimitiveParams {
  return {
    shape,
    position: [0, 0, 0],
    rotationY: 0,
    color: '#9ca3af', // zinc-400, neutro mas vívido o suficiente
    ...DEFAULT_DIMS[shape],
  };
}
