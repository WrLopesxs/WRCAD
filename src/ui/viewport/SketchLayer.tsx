/**
 * src/ui/viewport/SketchLayer.tsx
 * Camada do viewport ativa em modo Esboço. Responsabilidades:
 *  - Capturar movimento/click do mouse sobre o plano de esboço
 *  - Aplicar snap engine sobre o cursor
 *  - Atualizar sketchStore.cursor para preview
 *  - Chamar onPoint do commandStore quando o usuário clica
 *  - Renderizar entidades já desenhadas + preview + marcador de snap
 */
import { useEffect, useMemo, useRef } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  RefPlane,
  SketchEntity,
  SnapHit,
  SnapType,
  Theme,
  Vec2,
} from '@/domain/types';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { findSnap } from '@/engine/snap';
import {
  clampPointToGrid,
  getPlaneBasis,
  planeToWorld,
  worldToPlane,
} from '@/engine/sketchPlane';

interface SketchLayerProps {
  theme: Theme;
}

export function SketchLayer({ theme }: SketchLayerProps) {
  const activeSketchId = useSketchStore((s) => s.activeSketchId);
  const plane = useSketchStore((s) => s.plane);
  const entities = useSketchStore((s) => s.entities);
  const cursor = useSketchStore((s) => s.cursor);
  const pendingPoints = useSketchStore((s) => s.pendingPoints);
  const previewKind = useSketchStore((s) => s.previewKind);
  const snaps = useUIStore((s) => s.snaps);

  const snapHit = useMemo<SnapHit | null>(() => {
    if (!cursor) return null;
    return findSnap({ cursor, entities, pendingPoints, snaps });
  }, [cursor, entities, pendingPoints, snaps]);

  // ponto efetivo = snap (se houver) ou cursor cru
  const effective = snapHit?.point ?? cursor;

  if (!activeSketchId || !plane) return null;

  return (
    <group>
      <PlanePickSurface plane={plane} getSnap={() => snapHit} />
      <SketchEntitiesLayer entities={entities} plane={plane} theme={theme} />
      <PreviewLayer
        plane={plane}
        pendingPoints={pendingPoints}
        cursor={effective}
        previewKind={previewKind}
        theme={theme}
      />
      {effective && <CursorCrosshair plane={plane} cursor={effective} theme={theme} />}
      {snapHit && <SnapMarker plane={plane} snap={snapHit} theme={theme} />}
    </group>
  );
}

/* ============== superfície invisível p/ capturar pointer ============== */

interface PickSurfaceProps {
  plane: RefPlane;
  getSnap: () => SnapHit | null;
}

function PlanePickSurface({ plane, getSnap }: PickSurfaceProps) {
  const basis = useMemo(() => getPlaneBasis(plane), [plane]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    // alinha a quad (que por padrão tem normal +Z) com a normal do plano CAD
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      basis.normal,
    );
    groupRef.current.quaternion.copy(q);
  }, [basis]);

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    const raw = worldToPlane(plane, [e.point.x, e.point.y, e.point.z]);
    useSketchStore.getState().setCursor(clampPointToGrid(plane, raw));
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const handler = useCommandStore.getState().onPoint;
    if (!handler) return;
    const snap = getSnap();
    const cur = useSketchStore.getState().cursor;
    const point = snap?.point ?? cur;
    if (!point) return;
    handler(clampPointToGrid(plane, point));
  };

  return (
    <group ref={groupRef}>
      <mesh
        renderOrder={-3}
        onPointerMove={handleMove}
        onPointerLeave={() => useSketchStore.getState().setCursor(null)}
        onClick={handleClick}
      >
        <planeGeometry args={[5000, 5000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ============== entidades commitadas ============== */

interface EntitiesLayerProps {
  entities: SketchEntity[];
  plane: RefPlane;
  theme: Theme;
}

function SketchEntitiesLayer({ entities, plane, theme }: EntitiesLayerProps) {
  const solidColor = theme === 'dark' ? '#fafafa' : '#18181b';
  const constructionColor = theme === 'dark' ? '#fde047' : '#a16207';
  return (
    <group>
      {entities.map((e) => (
        <EntityRenderer
          key={e.id}
          entity={e}
          plane={plane}
          color={e.construction ? constructionColor : solidColor}
          dashed={e.construction}
        />
      ))}
    </group>
  );
}

interface EntityRendererProps {
  entity: SketchEntity;
  plane: RefPlane;
  color: string;
  dashed?: boolean;
}

function EntityRenderer({ entity, plane, color, dashed }: EntityRendererProps) {
  const points = useMemo(() => entityToWorldPoints(entity, plane), [entity, plane]);
  if (points.length === 0) return null;
  return <LineFromPoints points={points} color={color} dashed={dashed} />;
}

/* ============== preview (entidade em construção) ============== */

interface PreviewLayerProps {
  plane: RefPlane;
  pendingPoints: Vec2[];
  cursor: Vec2 | null;
  previewKind: 'line' | 'circle' | 'rect' | null;
  theme: Theme;
}

function PreviewLayer({ plane, pendingPoints, cursor, previewKind, theme }: PreviewLayerProps) {
  if (!previewKind || !cursor || pendingPoints.length === 0) return null;
  const seed = pendingPoints[0];
  const color = theme === 'dark' ? '#fde047' : '#a16207';
  const previewEntity: SketchEntity = {
    id: '__preview__',
    type: previewKind === 'line' ? 'line' : previewKind === 'circle' ? 'circle' : 'rect',
    points: [seed, cursor],
    construction: false,
    layerId: '',
  };
  const points = entityToWorldPoints(previewEntity, plane);
  if (points.length === 0) return null;
  return <LineFromPoints points={points} color={color} dashed />;
}

/* ============== cursor crosshair ============== */

interface CursorCrosshairProps {
  plane: RefPlane;
  cursor: Vec2;
  theme: Theme;
}

function CursorCrosshair({ plane, cursor, theme }: CursorCrosshairProps) {
  const color = theme === 'dark' ? '#eab308' : '#a16207';
  const size = 2.5;
  const positions = useMemo(() => {
    const segs: Vec2[][] = [
      [[cursor[0] - size, cursor[1]], [cursor[0] + size, cursor[1]]],
      [[cursor[0], cursor[1] - size], [cursor[0], cursor[1] + size]],
    ];
    const pts3 = segs.flatMap((seg) => seg.map((p) => planeToWorld(plane, p)));
    const arr = new Float32Array(pts3.length * 3);
    for (let i = 0; i < pts3.length; i++) {
      arr[i * 3] = pts3[i][0];
      arr[i * 3 + 1] = pts3[i][1];
      arr[i * 3 + 2] = pts3[i][2];
    }
    return arr;
  }, [plane, cursor]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  return (
    <lineSegments geometry={geom} renderOrder={10}>
      <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.85} />
    </lineSegments>
  );
}

/* ============== marcador de snap ============== */

const SNAP_COLOR: Record<SnapType, string> = {
  endpoint: '#22c55e',
  midpoint: '#3b82f6',
  center: '#a855f7',
  intersection: '#ec4899',
  perpendicular: '#06b6d4',
  tangent: '#f97316',
  nearest: '#94a3b8',
  grid: '#eab308',
};

const SNAP_LABEL: Record<SnapType, string> = {
  endpoint: 'END',
  midpoint: 'MID',
  center: 'CEN',
  intersection: 'INT',
  perpendicular: 'PER',
  tangent: 'TAN',
  nearest: 'NEA',
  grid: 'GRID',
};

interface SnapMarkerProps {
  plane: RefPlane;
  snap: SnapHit;
  theme: Theme;
}

function SnapMarker({ plane, snap, theme }: SnapMarkerProps) {
  void theme;
  const color = SNAP_COLOR[snap.type];
  // marcador = quadrado para endpoint, triângulo p/ midpoint, círculo p/ center, X p/ grid
  const size = 2;
  const positions = useMemo(() => {
    const c = snap.point;
    let segs: Vec2[][] = [];
    switch (snap.type) {
      case 'endpoint':
        segs = [
          [[c[0] - size, c[1] - size], [c[0] + size, c[1] - size]],
          [[c[0] + size, c[1] - size], [c[0] + size, c[1] + size]],
          [[c[0] + size, c[1] + size], [c[0] - size, c[1] + size]],
          [[c[0] - size, c[1] + size], [c[0] - size, c[1] - size]],
        ];
        break;
      case 'midpoint':
        segs = [
          [[c[0] - size, c[1] - size], [c[0] + size, c[1] - size]],
          [[c[0] + size, c[1] - size], [c[0], c[1] + size]],
          [[c[0], c[1] + size], [c[0] - size, c[1] - size]],
        ];
        break;
      case 'center': {
        const N = 24;
        for (let i = 0; i < N; i++) {
          const t1 = (i / N) * Math.PI * 2;
          const t2 = ((i + 1) / N) * Math.PI * 2;
          segs.push([
            [c[0] + Math.cos(t1) * size, c[1] + Math.sin(t1) * size],
            [c[0] + Math.cos(t2) * size, c[1] + Math.sin(t2) * size],
          ]);
        }
        break;
      }
      case 'grid':
        segs = [
          [[c[0] - size, c[1] - size], [c[0] + size, c[1] + size]],
          [[c[0] - size, c[1] + size], [c[0] + size, c[1] - size]],
        ];
        break;
      default:
        segs = [
          [[c[0] - size, c[1] - size], [c[0] + size, c[1] + size]],
          [[c[0] - size, c[1] + size], [c[0] + size, c[1] - size]],
        ];
    }
    const pts3 = segs.flatMap((seg) => seg.map((p) => planeToWorld(plane, p)));
    const arr = new Float32Array(pts3.length * 3);
    for (let i = 0; i < pts3.length; i++) {
      arr[i * 3] = pts3[i][0];
      arr[i * 3 + 1] = pts3[i][1];
      arr[i * 3 + 2] = pts3[i][2];
    }
    return arr;
  }, [plane, snap]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <lineSegments geometry={geom} renderOrder={20}>
      <lineBasicMaterial color={color} depthTest={false} linewidth={2} />
    </lineSegments>
  );
}

// label do snap acessível externamente caso queira usar em HUD
export { SNAP_LABEL };

/* ============== utilidades de render ============== */

function entityToWorldPoints(entity: SketchEntity, plane: RefPlane): [number, number, number][] {
  switch (entity.type) {
    case 'line': {
      if (entity.points.length < 2) return [];
      const [a, b] = entity.points;
      return [planeToWorld(plane, a), planeToWorld(plane, b)];
    }
    case 'rect': {
      if (entity.points.length < 2) return [];
      const [a, b] = entity.points;
      const corners: Vec2[] = [
        [a[0], a[1]],
        [b[0], a[1]],
        [b[0], b[1]],
        [a[0], b[1]],
      ];
      const segs: Vec2[] = [];
      for (let i = 0; i < 4; i++) {
        segs.push(corners[i]);
        segs.push(corners[(i + 1) % 4]);
      }
      return segs.map((p) => planeToWorld(plane, p));
    }
    case 'circle': {
      if (entity.points.length < 2) return [];
      const [c, edge] = entity.points;
      const r = Math.hypot(edge[0] - c[0], edge[1] - c[1]);
      if (r <= 0) return [];
      const N = 64;
      const segs: Vec2[] = [];
      for (let i = 0; i < N; i++) {
        const t1 = (i / N) * Math.PI * 2;
        const t2 = ((i + 1) / N) * Math.PI * 2;
        segs.push([c[0] + Math.cos(t1) * r, c[1] + Math.sin(t1) * r]);
        segs.push([c[0] + Math.cos(t2) * r, c[1] + Math.sin(t2) * r]);
      }
      return segs.map((p) => planeToWorld(plane, p));
    }
    default:
      return [];
  }
}

interface LineFromPointsProps {
  points: [number, number, number][];
  color: string;
  dashed?: boolean;
}

function LineFromPoints({ points, color, dashed = false }: LineFromPointsProps) {
  const geom = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      arr[i * 3] = points[i][0];
      arr[i * 3 + 1] = points[i][1];
      arr[i * 3 + 2] = points[i][2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, [points]);

  const lineRef = useRef<THREE.LineSegments>(null);
  useEffect(() => {
    if (dashed && lineRef.current) lineRef.current.computeLineDistances();
  }, [dashed, geom]);

  return (
    <lineSegments ref={lineRef} geometry={geom} renderOrder={5}>
      {dashed ? (
        <lineDashedMaterial
          color={color}
          dashSize={1.2}
          gapSize={0.6}
          depthTest={false}
          transparent
          opacity={0.9}
        />
      ) : (
        <lineBasicMaterial color={color} depthTest={false} />
      )}
    </lineSegments>
  );
}
