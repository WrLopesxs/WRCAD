/**
 * src/engine/sketchPlane.ts
 * Utilidades para converter entre coordenadas 2D do esboço (no plano local) e
 * coordenadas 3D do mundo. Cada plano canônico tem uma "base" (origem + 2 vetores
 * que definem o sistema 2D) — pontos 2D viram 3D via origin + u*basisU + v*basisV.
 *
 * Three.js convenção: Y up. Em CAD, normalmente Z up — aqui adotamos a convenção
 * three.js (Y up) e os "planos CAD" são mapeados de forma intuitiva no viewport.
 */
import * as THREE from 'three';
import type { RefPlane, Vec2, Vec3 } from '@/domain/types';

export interface PlaneBasis {
  origin: THREE.Vector3;
  normal: THREE.Vector3; // direção saindo "para fora" do plano
  u: THREE.Vector3; // eixo "X" do plano (horizontal na 2D)
  v: THREE.Vector3; // eixo "Y" do plano (vertical na 2D)
}

/**
 * Bases dos 3 planos canônicos, escolhidas para que ao olhar para o plano "de
 * frente" (pela normal positiva) o eixo U vá para a direita e V para cima.
 */
const CANONICAL_BASES: Record<'XY' | 'YZ' | 'XZ', PlaneBasis> = {
  // Plano XY (CAD): horizontal "chão"; em three.js fica em y=0, normal = +Y.
  XY: {
    origin: new THREE.Vector3(0, 0, 0),
    normal: new THREE.Vector3(0, 1, 0),
    u: new THREE.Vector3(1, 0, 0),
    v: new THREE.Vector3(0, 0, -1), // olhando de cima para o chão, "para cima" no esboço aponta para -Z
  },
  // Plano YZ (CAD): vertical lateral; em three.js: normal = +X.
  YZ: {
    origin: new THREE.Vector3(0, 0, 0),
    normal: new THREE.Vector3(1, 0, 0),
    u: new THREE.Vector3(0, 0, -1),
    v: new THREE.Vector3(0, 1, 0),
  },
  // Plano XZ (CAD): vertical frontal; em three.js: normal = +Z.
  XZ: {
    origin: new THREE.Vector3(0, 0, 0),
    normal: new THREE.Vector3(0, 0, 1),
    u: new THREE.Vector3(1, 0, 0),
    v: new THREE.Vector3(0, 1, 0),
  },
};

export function getPlaneBasis(plane: RefPlane): PlaneBasis {
  if (plane === 'XY' || plane === 'YZ' || plane === 'XZ') {
    return CANONICAL_BASES[plane];
  }
  // plano customizado por ID — placeholder; Fase 2 só suporta canônicos
  return CANONICAL_BASES.XY;
}

/** Converte um ponto 2D do plano local para coordenadas 3D do mundo. */
export function planeToWorld(plane: RefPlane, p: Vec2): Vec3 {
  const b = getPlaneBasis(plane);
  const v3 = b.origin
    .clone()
    .addScaledVector(b.u, p[0])
    .addScaledVector(b.v, p[1]);
  return [v3.x, v3.y, v3.z];
}

/** Projeta um ponto 3D do mundo no plano (assumindo que já está nele) e retorna
 *  suas coordenadas 2D locais. */
export function worldToPlane(plane: RefPlane, p: Vec3): Vec2 {
  const b = getPlaneBasis(plane);
  const rel = new THREE.Vector3(p[0], p[1], p[2]).sub(b.origin);
  return [rel.dot(b.u), rel.dot(b.v)];
}

/** Constrói o Plane do three.js para raycasting. */
export function makeThreePlane(plane: RefPlane): THREE.Plane {
  const b = getPlaneBasis(plane);
  return new THREE.Plane(b.normal.clone(), -b.normal.dot(b.origin));
}

/** Intersecta um raycaster com o plano do esboço; retorna o ponto 3D
 *  ou null se não houver intersecção. */
export function raycastToSketchPlane(
  raycaster: THREE.Raycaster,
  plane: RefPlane,
): THREE.Vector3 | null {
  const threePlane = makeThreePlane(plane);
  const hit = new THREE.Vector3();
  const result = raycaster.ray.intersectPlane(threePlane, hit);
  return result ? hit : null;
}

/**
 * Clampa um ponto 2D do esboço para que seu equivalente 3D não fique abaixo
 * de y=0 (debaixo do grid). Em planos verticais (YZ e XZ) a coordenada V do
 * sketch mapeia para o Y do mundo — limitamos V >= 0. No plano XY (horizontal,
 * chão) todos os pontos já estão em y=0, sem restrição.
 */
export function clampPointToGrid(plane: RefPlane, p: Vec2): Vec2 {
  if (plane === 'YZ' || plane === 'XZ') {
    if (p[1] < 0) return [p[0], 0];
  }
  return p;
}

/** Posição da câmera para olhar "de frente" para o plano (vista normal). */
export function getPlaneViewCamera(plane: RefPlane, distance = 200): {
  position: Vec3;
  up: Vec3;
} {
  const b = getPlaneBasis(plane);
  const pos = b.origin.clone().addScaledVector(b.normal, distance);
  return {
    position: [pos.x, pos.y, pos.z],
    up: [b.v.x, b.v.y, b.v.z],
  };
}
