/**
 * src/ui/viewport/CADGrid.tsx
 * Grid CAD construída manualmente com LineSegments. NÃO usa o componente <Grid>
 * do drei (que tem problemas de flickering em movimento de câmera e com
 * logarithmicDepthBuffer). Aqui há duas camadas: minor (cellSize) e major
 * (sectionSize), cada uma com sua cor.
 *
 * polygonOffset + depthWrite=false nas linhas evita z-fighting com geometria
 * que repouse no plano XZ (incluindo o plano de referência XY).
 */
import { useMemo } from 'react';
import * as THREE from 'three';

interface CADGridProps {
  size?: number;
  cellSize?: number;
  sectionSize?: number;
  cellColor: string;
  sectionColor: string;
  fadeDistance?: number;
}

interface GridBuffers {
  minor: Float32Array;
  major: Float32Array;
}

function buildGridGeometry(size: number, cellSize: number, sectionSize: number): GridBuffers {
  const half = size / 2;
  const minor: number[] = [];
  const major: number[] = [];

  const stepsPerSection = Math.round(sectionSize / cellSize);
  const totalSteps = Math.round(size / cellSize);
  const eps = 1e-4;

  for (let i = 0; i <= totalSteps; i++) {
    const v = -half + i * cellSize;
    const isMajor = Math.abs((i % stepsPerSection)) < eps;
    const dest = isMajor ? major : minor;

    // linha paralela a X (var em Z)
    dest.push(-half, 0, v, half, 0, v);
    // linha paralela a Z (var em X)
    dest.push(v, 0, -half, v, 0, half);
  }

  return {
    minor: new Float32Array(minor),
    major: new Float32Array(major),
  };
}

export function CADGrid({
  size = 2000,
  cellSize = 10,
  sectionSize = 100,
  cellColor,
  sectionColor,
  fadeDistance = 0,
}: CADGridProps) {
  const { minorGeom, majorGeom } = useMemo(() => {
    const { minor, major } = buildGridGeometry(size, cellSize, sectionSize);

    const minorGeom = new THREE.BufferGeometry();
    minorGeom.setAttribute('position', new THREE.BufferAttribute(minor, 3));

    const majorGeom = new THREE.BufferGeometry();
    majorGeom.setAttribute('position', new THREE.BufferAttribute(major, 3));

    return { minorGeom, majorGeom };
  }, [size, cellSize, sectionSize]);

  return (
    <group position={[0, -0.001, 0]}>
      <lineSegments geometry={minorGeom} renderOrder={-10}>
        <lineBasicMaterial
          color={cellColor}
          transparent
          opacity={0.55}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          fog={fadeDistance > 0}
        />
      </lineSegments>
      <lineSegments geometry={majorGeom} renderOrder={-9}>
        <lineBasicMaterial
          color={sectionColor}
          transparent
          opacity={0.9}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          fog={fadeDistance > 0}
        />
      </lineSegments>
    </group>
  );
}
