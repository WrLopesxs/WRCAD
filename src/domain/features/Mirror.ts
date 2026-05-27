/**
 * src/domain/features/Mirror.ts
 * Espelha o corpo atual ao redor de um plano canônico (XY/YZ/XZ).
 * Não cria um sólido novo do nada — precisa de um corpo já existente
 * (vem do encadeamento do evaluator).
 */
import * as THREE from 'three';
import type { MirrorParams } from '@/domain/types';

export interface MirrorResult {
  geometry: THREE.BufferGeometry | null;
  error: string | null;
}

/**
 * Aplica o espelhamento. Retorna a cópia espelhada da geometria — caller
 * decide se vai fazer union (keepOriginal) ou substituir.
 *
 * IMPORTANTE: após escalar com -1 em um eixo, a orientação dos triângulos
 * inverte (winding order). Chamamos invertNormals para que normais voltem
 * a apontar para fora do sólido — senão a iluminação fica trocada.
 */
export function evaluateMirror(
  body: THREE.BufferGeometry,
  p: MirrorParams,
): MirrorResult {
  try {
    const mirrored = body.clone();
    const matrix = mirrorMatrix(p.plane);
    mirrored.applyMatrix4(matrix);

    // Inverte ordem dos triângulos (scale negativo inverte o winding)
    flipWinding(mirrored);
    mirrored.computeVertexNormals();
    mirrored.computeBoundingSphere();

    return { geometry: mirrored, error: null };
  } catch (err) {
    return {
      geometry: null,
      error: `Mirror falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function mirrorMatrix(plane: MirrorParams['plane']): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  // Plano XY (z=0) → espelha em Z; plano YZ (x=0) → espelha em X; etc.
  // Em CAD: "plano XY" significa o plano que CONTÉM os eixos X e Y.
  switch (plane) {
    case 'XY':
      m.makeScale(1, 1, -1);
      break;
    case 'YZ':
      m.makeScale(-1, 1, 1);
      break;
    case 'XZ':
      m.makeScale(1, -1, 1);
      break;
  }
  return m;
}

function flipWinding(geom: THREE.BufferGeometry): void {
  const index = geom.getIndex();
  if (index) {
    const arr = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
    index.needsUpdate = true;
  } else {
    const pos = geom.getAttribute('position');
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 9) {
      // troca os vértices 2 e 3 do triângulo
      for (let k = 0; k < 3; k++) {
        const tmp = arr[i + 3 + k];
        arr[i + 3 + k] = arr[i + 6 + k];
        arr[i + 6 + k] = tmp;
      }
    }
    pos.needsUpdate = true;
  }
}

export function defaultMirrorParams(): MirrorParams {
  return { plane: 'YZ', keepOriginal: true };
}
