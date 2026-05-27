/**
 * src/utils/math.ts
 * Helpers de matemática 2D/3D usados em todo o app.
 * Mantenha funções puras (sem side-effects) para facilitar teste.
 */
import * as THREE from 'three';
import type { Vec2, Vec3 } from '@/domain/types';

// ===== distância =====
export const dist2 = (a: Vec2, b: Vec2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const dist3 = (a: Vec3, b: Vec3): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ===== ponto médio =====
export const mid2 = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export const mid3 = (a: Vec3, b: Vec3): Vec3 => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
  (a[2] + b[2]) / 2,
];

// ===== ângulo entre vetores 3D =====
export function angleBetween(v1: Vec3, v2: Vec3): number {
  const a = new THREE.Vector3(...v1);
  const b = new THREE.Vector3(...v2);
  return a.angleTo(b);
}

// ===== normal de plano por 3 pontos =====
export function planeNormal(p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {
  const a = new THREE.Vector3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const b = new THREE.Vector3(p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]);
  const n = a.cross(b).normalize();
  return [n.x, n.y, n.z];
}

// ===== snap a ângulos polares =====
export function snapAngle(angleRad: number, stepDeg = 15): number {
  const step = THREE.MathUtils.degToRad(stepDeg);
  return Math.round(angleRad / step) * step;
}

// ===== snap a grid =====
export const snapToGrid = (v: number, step: number): number => Math.round(v / step) * step;

// ===== conversão de unidades =====
export const mmToInch = (mm: number): number => mm / 25.4;
export const inchToMm = (inch: number): number => inch * 25.4;

// ===== bounding box AABB =====
export interface AABB {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  size: Vec3;
}

export function aabb(points: Vec3[]): AABB {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return {
    min,
    max,
    center: mid3(min, max),
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}
