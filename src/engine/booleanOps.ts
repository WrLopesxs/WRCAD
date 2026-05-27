/**
 * src/engine/booleanOps.ts
 * Wrappers sobre three-bvh-csg para union/subtract/intersect.
 *
 * Bug conhecido (descoberto na prática): reusar o mesmo Evaluator/Material
 * entre chamadas às vezes causa estado interno corrompido — operações
 * subsequentes retornam geometria parcial ou só uma das entradas. Solução:
 * CRIAR EVALUATOR + MATERIAL NOVOS em cada chamada. Pequeno overhead, mas
 * elimina bugs intermitentes.
 *
 * Também aplicamos clone() agressivo na saída pra não compartilhar buffers
 * com o estado interno do evaluator (poderia ser sobrescrito na próxima call).
 */
import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

export type BooleanOp = 'union' | 'subtract' | 'intersect';

const OP_MAP = {
  union: ADDITION,
  subtract: SUBTRACTION,
  intersect: INTERSECTION,
} as const;

export function booleanGeometries(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
  op: BooleanOp,
): THREE.BufferGeometry {
  // material e evaluator novos pra evitar state shared corrompido
  const material = new THREE.MeshBasicMaterial();
  const evaluator = new Evaluator();
  evaluator.useGroups = false;

  const brushA = new Brush(a, material);
  const brushB = new Brush(b, material);
  brushA.updateMatrixWorld();
  brushB.updateMatrixWorld();

  const result = evaluator.evaluate(brushA, brushB, OP_MAP[op]);

  // Clone agressivo: cópia profunda dos buffers pra ter ownership total
  const out = deepCloneGeometry(result.geometry);

  // libera o que veio do evaluator (pode estar em pool interno)
  result.geometry.dispose();
  material.dispose();

  return out;
}

/**
 * BufferGeometry.clone() não copia attributes de forma 100% deep em todas as
 * versões do three.js. Pra garantir, copiamos manualmente cada attribute
 * com slice() do array tipado — assim ninguém compartilha buffer com a saída
 * interna do evaluator.
 */
function deepCloneGeometry(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();

  for (const name of Object.keys(src.attributes)) {
    const attr = src.getAttribute(name) as THREE.BufferAttribute;
    if (!attr) continue;
    const arr = (attr.array as Float32Array | Uint16Array | Uint32Array).slice();
    out.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize, attr.normalized));
  }

  const idx = src.getIndex();
  if (idx) {
    const arr = (idx.array as Uint16Array | Uint32Array).slice();
    out.setIndex(new THREE.BufferAttribute(arr, 1));
  }

  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
