/**
 * src/domain/features/PatternLinear.ts
 * Replica o corpo atual N vezes ao longo de um eixo cartesiano (X/Y/Z mundo).
 * count inclui a instância original — count=1 não faz nada, count=2 cria 1 cópia.
 *
 * O caller é responsável por unir as cópias com o corpo original via boolean.
 * Aqui retornamos apenas a LISTA de geometrias deslocadas (sem o original).
 */
import * as THREE from 'three';
import type { PatternLinearParams } from '@/domain/types';

export interface PatternLinearResult {
  copies: THREE.BufferGeometry[];
  error: string | null;
}

export function evaluatePatternLinear(
  body: THREE.BufferGeometry,
  p: PatternLinearParams,
): PatternLinearResult {
  try {
    const count = Math.max(1, Math.floor(p.count));
    const spacing = Math.max(0, Math.abs(p.spacing));
    if (count < 2 || spacing === 0) {
      return { copies: [], error: null };
    }

    const dir = directionVector(p.axis, p.sign);
    const copies: THREE.BufferGeometry[] = [];
    for (let i = 1; i < count; i++) {
      const copy = body.clone();
      copy.translate(dir.x * spacing * i, dir.y * spacing * i, dir.z * spacing * i);
      copy.computeBoundingSphere();
      copies.push(copy);
    }
    return { copies, error: null };
  } catch (err) {
    return {
      copies: [],
      error: `Pattern falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function directionVector(axis: PatternLinearParams['axis'], sign: 1 | -1): THREE.Vector3 {
  switch (axis) {
    case 'X':
      return new THREE.Vector3(sign, 0, 0);
    case 'Y':
      return new THREE.Vector3(0, sign, 0);
    case 'Z':
      return new THREE.Vector3(0, 0, sign);
  }
}

export function defaultPatternLinearParams(): PatternLinearParams {
  return { axis: 'X', sign: 1, count: 3, spacing: 30 };
}
