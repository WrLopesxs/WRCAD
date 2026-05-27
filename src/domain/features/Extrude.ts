/**
 * src/domain/features/Extrude.ts
 * Avalia uma feature de extrusão: pega o sketch referenciado, transforma em
 * THREE.Shape, gera ExtrudeGeometry, e orienta no mundo conforme a base do
 * plano de esboço (usando Matrix4.makeBasis — bate exato com como a sketch
 * foi desenhada no viewport via planeToWorld).
 *
 * Three.js ExtrudeGeometry produz geometria em local (X, Y, Z=0..depth).
 * Mapeamos local (X, Y, Z) → mundo (basis.u, basis.v, basis.normal) — assim
 * o sólido aparece exatamente sobre/sob o esboço.
 */
import * as THREE from 'three';
import type { ExtrudeParams, Sketch } from '@/domain/types';
import { sketchToShape } from '@/engine/sketchToShape';
import { getPlaneBasis } from '@/engine/sketchPlane';

export interface ExtrudeResult {
  geometry: THREE.BufferGeometry | null;
  error: string | null;
  loopsFound?: number;
  holesFound?: number;
  droppedCount?: number;
  droppedReasons?: string[];
}

export function evaluateExtrude(sketch: Sketch, p: ExtrudeParams): ExtrudeResult {
  try {
    const { shape, error, loopsFound, holesFound, droppedCount, droppedReasons } =
      sketchToShape(sketch.entities);
    if (!shape) {
      return { geometry: null, error, loopsFound, holesFound, droppedCount, droppedReasons };
    }

    const distance = Math.max(0.001, Math.abs(p.distance));

    // 1. extruda em +Z local. curveSegments=32 já dá um círculo bem suave
    //    visualmente (3% de erro em raio) e gera metade dos triângulos
    //    comparado com 64. Boa relação qualidade/performance.
    //
    // Bevel: aplica chanfro/filete nas arestas do topo e base. ExtrudeGeometry
    // do three.js suporta isso nativamente — bevelSegments=1 dá chanfro reto,
    // bevelSegments>=3 dá filete arredondado.
    const rimStyle = p.rimStyle ?? 'sharp';
    const rimSize = Math.max(0, p.rimSize ?? 0);
    const bevelEnabled = rimStyle !== 'sharp' && rimSize > 0;
    // clamp do bevel: não pode ser maior que metade da espessura nem o bevel
    // "engole" a peça inteira em três.js (gera geom degenerada).
    const safeBevel = bevelEnabled ? Math.min(rimSize, distance / 2 - 0.001) : 0;

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: distance,
      bevelEnabled: bevelEnabled && safeBevel > 0,
      bevelThickness: safeBevel,
      bevelSize: safeBevel,
      bevelOffset: 0,
      bevelSegments: rimStyle === 'fillet' ? 4 : 1,
      steps: 1,
      curveSegments: 32,
    });

    // 2. direção da extrusão (offset/espelho em Z local)
    switch (p.direction) {
      case 'normal':
        break;
      case 'reverse':
        geom.translate(0, 0, -distance);
        geom.scale(1, 1, -1);
        geom.computeVertexNormals();
        break;
      case 'midplane':
        geom.translate(0, 0, -distance / 2);
        break;
      case 'both':
        geom.dispose();
        return evaluateExtrude(sketch, {
          ...p,
          direction: 'midplane',
          distance: distance * 2,
        });
    }

    // 3. mapeia local → mundo via base do plano
    const basis = getPlaneBasis(sketch.plane);
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(basis.u, basis.v, basis.normal);
    matrix.setPosition(basis.origin);
    geom.applyMatrix4(matrix);

    geom.computeVertexNormals();
    geom.computeBoundingSphere();

    return {
      geometry: geom,
      error: null,
      loopsFound,
      holesFound,
      droppedCount,
      droppedReasons,
    };
  } catch (err) {
    return {
      geometry: null,
      error: `Extrusão falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function defaultExtrudeParams(sketchId: string): ExtrudeParams {
  return {
    sketchId,
    distance: 10,
    direction: 'normal',
    endCondition: 'blind',
  };
}
