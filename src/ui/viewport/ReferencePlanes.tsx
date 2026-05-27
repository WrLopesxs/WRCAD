/**
 * src/ui/viewport/ReferencePlanes.tsx
 * Planos de referência discretos — só bordas coloridas (sem preenchimento)
 * para não competir com a geometria modelada. Cada plano tem leve offset
 * para não coincidir entre si nem com a grid no plano XZ.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Theme } from '@/domain/types';

interface ReferencePlanesProps {
  size?: number;
  theme: Theme;
}

const EPS = 0.05;

const COLORS_DARK = {
  xy: '#3b82f6',
  yz: '#ef4444',
  xz: '#22c55e',
};

const COLORS_LIGHT = {
  xy: '#2563eb',
  yz: '#dc2626',
  xz: '#16a34a',
};

export function ReferencePlanes({ size = 50, theme }: ReferencePlanesProps) {
  const colors = theme === 'dark' ? COLORS_DARK : COLORS_LIGHT;
  const half = size / 2;

  const edgePoints = useMemo(
    () =>
      new Float32Array([
        -half, -half, 0,  half, -half, 0,
         half, -half, 0,  half,  half, 0,
         half,  half, 0, -half,  half, 0,
        -half,  half, 0, -half, -half, 0,
      ]),
    [half],
  );

  return (
    <group>
      <PlaneEdge
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, EPS, 0]}
        color={colors.xy}
        points={edgePoints}
      />
      <PlaneEdge
        rotation={[0, Math.PI / 2, 0]}
        position={[EPS, 0, 0]}
        color={colors.yz}
        points={edgePoints}
      />
      <PlaneEdge
        rotation={[0, 0, 0]}
        position={[0, 0, EPS]}
        color={colors.xz}
        points={edgePoints}
      />
    </group>
  );
}

interface PlaneEdgeProps {
  rotation: [number, number, number];
  position: [number, number, number];
  color: string;
  points: Float32Array;
}

function PlaneEdge({ rotation, position, color, points }: PlaneEdgeProps) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(points, 3));
    return g;
  }, [points]);

  return (
    <lineSegments rotation={rotation} position={position} geometry={geom} renderOrder={-5}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </lineSegments>
  );
}
