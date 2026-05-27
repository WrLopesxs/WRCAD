/**
 * src/domain/features/PatternCircular.ts
 * Replica o corpo atual N vezes em torno de um eixo do mundo (passando pela
 * origem). Útil para furos em flange, dentes de engrenagem, pás de hélice.
 *
 * count inclui a original; N-1 cópias são geradas, cada uma rotacionada por
 * (i / N) * totalAngle. Se totalAngle = 360, fica uma distribuição uniforme.
 */
import * as THREE from 'three';
import type { PatternCircularParams } from '@/domain/types';

export interface PatternCircularResult {
  copies: THREE.BufferGeometry[];
  error: string | null;
}

export function evaluatePatternCircular(
  body: THREE.BufferGeometry,
  p: PatternCircularParams,
): PatternCircularResult {
  try {
    const count = Math.max(1, Math.floor(p.count));
    const totalAngle = Math.max(0, Math.min(360, p.totalAngle));
    if (count < 2 || totalAngle === 0) {
      return { copies: [], error: null };
    }

    const axis = axisVector(p.axis);
    // Se totalAngle == 360: cópias em count posições igualmente espaçadas
    //   (não inclui a 360°, que coincide com 0°)
    // Se totalAngle < 360: distribui em (count-1) intervalos
    const step =
      totalAngle === 360
        ? (2 * Math.PI) / count
        : THREE.MathUtils.degToRad(totalAngle / (count - 1));

    const copies: THREE.BufferGeometry[] = [];
    for (let i = 1; i < count; i++) {
      const angle = step * i;
      const matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
      const copy = body.clone();
      copy.applyMatrix4(matrix);
      copy.computeBoundingSphere();
      copies.push(copy);
    }
    return { copies, error: null };
  } catch (err) {
    return {
      copies: [],
      error: `Padrão circular falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function axisVector(axis: PatternCircularParams['axis']): THREE.Vector3 {
  switch (axis) {
    case 'X':
      return new THREE.Vector3(1, 0, 0);
    case 'Y':
      return new THREE.Vector3(0, 1, 0);
    case 'Z':
      return new THREE.Vector3(0, 0, 1);
  }
}

export function defaultPatternCircularParams(): PatternCircularParams {
  return { axis: 'Y', count: 6, totalAngle: 360 };
}
