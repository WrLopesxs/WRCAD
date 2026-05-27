/**
 * src/ui/viewport/ModelScene.tsx
 * Renderiza o corpo FINAL do evaluator (cinza, com edges) MAIS:
 *  - PrimitiveOverlay por primitiva: pickable + outline quando selecionada
 *  - TransformGizmo: setinhas 3D pra arrastar features posicionáveis
 *
 * Otimizações:
 *  - EdgesGeometry com threshold 45° + skip se >MAX_EDGE_TRIS triângulos
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type ThreeEvent, useThree } from '@react-three/fiber';
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUIStore } from '@/state/uiStore';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { evaluate } from '@/engine/evaluator';
import type { Feature, Theme } from '@/domain/types';
import { TransformGizmo } from './TransformGizmo';
import { PrimitiveMesh } from './PrimitiveMesh';

/** Acima desse limite de triângulos, paramos de renderizar arestas. */
const MAX_EDGE_TRIS = 30_000;
const HEAVY_TRIS = 50_000;

/** Tipos de feature que podem usar o gizmo de arrastar (têm `position: Vec3`). */
const POSITIONABLE_TYPES: ReadonlySet<Feature['type']> = new Set([
  'primitive',
  'hole',
]);

export function ModelScene() {
  const doc = useDocumentStore((s) => s.doc);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);
  const theme = useUIStore((s) => s.theme);
  const inSketch = useSketchStore((s) => s.activeSketchId !== null);

  const finalGeom = useMemo(() => {
    try {
      const results = evaluate(doc);
      for (const [id, entry] of results) {
        if (entry.isFinal && isRenderable(entry.geometry)) {
          const triCount = countTriangles(entry.geometry);
          if (triCount > HEAVY_TRIS) {
            console.warn(
              `[WRCAD] Mesh pesado: ${triCount.toLocaleString()} triângulos. ` +
                `Considere reduzir patterns ou simplificar o esboço.`,
            );
          }
          return { id, geom: entry.geometry, triCount };
        }
      }
      return null;
    } catch (err) {
      console.error('[WRCAD] evaluator crash:', err);
      return null;
    }
  }, [doc]);

  if (inSketch) return null;

  // Primitivas visíveis pra renderizar overlays pickáveis
  const visiblePrimitives = doc.features.filter(
    (f) => f.type === 'primitive' && f.visible && !f.suppressed,
  );

  // Feature selecionada que pode ser arrastada
  const draggable = doc.features.find(
    (f) => selectedIds.includes(f.id) && POSITIONABLE_TYPES.has(f.type) && !f.suppressed,
  );

  return (
    <>
      {finalGeom && (
        <FeatureMesh
          geometry={finalGeom.geom}
          theme={theme}
          triCount={finalGeom.triCount}
        />
      )}

      {/* Cada primitiva é seu próprio mesh standalone (com cor própria) */}
      {visiblePrimitives.map((f) => (
        <PrimitiveMesh
          key={f.id}
          feature={f}
          selected={selectedIds.includes(f.id)}
          onSelect={() => select([f.id])}
        />
      ))}

      {draggable && <TransformGizmo feature={draggable} />}
    </>
  );
}

function isRenderable(geom: THREE.BufferGeometry): boolean {
  const pos = geom.getAttribute('position');
  return !!pos && pos.count > 0;
}

function countTriangles(geom: THREE.BufferGeometry): number {
  const index = geom.getIndex();
  if (index) return index.count / 3;
  const pos = geom.getAttribute('position');
  return pos ? pos.count / 3 : 0;
}

interface FeatureMeshProps {
  geometry: THREE.BufferGeometry;
  theme: Theme;
  triCount: number;
}

/**
 * Mesh do corpo final do documento. Renderiza CINZA sempre (sem destaque
 * amarelo global) — a seleção visual fica por conta do PrimitiveOverlay.
 *
 * Captura cliques APENAS pra modo picking (HOLE) — quando há um onPick
 * registrado no commandStore. Para seleção normal, os overlays é que
 * interceptam o click antes (PrimitiveOverlay).
 */
function FeatureMesh({ geometry, theme, triCount }: FeatureMeshProps) {
  const fillColor = theme === 'dark' ? '#a1a1aa' : '#d4d4d8';
  const edgeColor = theme === 'dark' ? '#fafafa' : '#27272a';

  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  const edges = useMemo(() => {
    if (triCount > MAX_EDGE_TRIS) return null;
    try {
      return new THREE.EdgesGeometry(geometry, 45);
    } catch (err) {
      console.warn('[WRCAD] EdgesGeometry failed:', err);
      return null;
    }
  }, [geometry, triCount]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!useCommandStore.getState().onPick) return;
    e.stopPropagation();
    gl.domElement.style.cursor = 'crosshair';
  };

  const handlePointerOut = () => {
    if (!useCommandStore.getState().onPick) return;
    gl.domElement.style.cursor = '';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const onPick = useCommandStore.getState().onPick;
    if (!onPick || !e.face || !meshRef.current) return;
    e.stopPropagation();
    const worldNormal = e.face.normal
      .clone()
      .transformDirection(meshRef.current.matrixWorld)
      .normalize();
    onPick({
      point: [e.point.x, e.point.y, e.point.z],
      normal: [worldNormal.x, worldNormal.y, worldNormal.z],
    });
    gl.domElement.style.cursor = '';
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshStandardMaterial
          color={fillColor}
          metalness={0.1}
          roughness={0.55}
          flatShading={false}
        />
      </mesh>
      {edges && (
        <lineSegments geometry={edges} renderOrder={2}>
          <lineBasicMaterial color={edgeColor} transparent opacity={0.9} depthTest />
        </lineSegments>
      )}
    </group>
  );
}
