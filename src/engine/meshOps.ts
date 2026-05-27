/**
 * src/engine/meshOps.ts
 * Operações utilitárias de mesh:
 *   - safeMerge: concatena duas BufferGeometries num único buffer de posições.
 *     Não faz boolean (faces internas em sobreposições) — só junta os triângulos.
 *     Bulletproof: nunca falha, sempre retorna algo renderizável.
 *
 *   - hasGeometry: verifica se uma BufferGeometry tem ao menos 1 vértice.
 *
 * Usado como fallback quando three-bvh-csg falha ou retorna geometria vazia.
 */
import * as THREE from 'three';

/** Junta duas geometrias num único buffer (sem boolean). */
export function safeMerge(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
): THREE.BufferGeometry {
  // Converte para não-indexado pra simplificar concat
  const aNon = a.index ? a.toNonIndexed() : a;
  const bNon = b.index ? b.toNonIndexed() : b;

  const aPos = aNon.getAttribute('position') as THREE.BufferAttribute | undefined;
  const bPos = bNon.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!aPos || !bPos) {
    // se um deles não tem positions, devolve o que tem
    return aPos ? a : b;
  }

  const aArr = aPos.array as Float32Array;
  const bArr = bPos.array as Float32Array;
  const total = new Float32Array(aArr.length + bArr.length);
  total.set(aArr, 0);
  total.set(bArr, aArr.length);

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(total, 3));
  merged.computeVertexNormals();
  merged.computeBoundingSphere();

  // descarta os intermediários se foram clones
  if (aNon !== a) aNon.dispose();
  if (bNon !== b) bNon.dispose();

  return merged;
}

export function hasGeometry(g: THREE.BufferGeometry | null | undefined): boolean {
  if (!g) return false;
  const pos = g.getAttribute('position');
  return !!pos && pos.count > 0;
}
