/**
 * src/ui/viewport/PrimitiveMesh.tsx
 * Renderiza UMA primitiva como mesh independente.
 *
 * Cada primitiva tem:
 *   - Cor própria (de params.color)
 *   - Click handler que seleciona a feature
 *   - Quando selecionada: emissive yellow + outline mais grosso pra destaque
 *
 * Esse componente substitui o PrimitiveOverlay anterior (que era só pra
 * captura de clique). Agora a primitiva É renderizada por aqui — o evaluator
 * não a inclui mais no merged body, então não tem duplicação.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { type ThreeEvent, useThree } from '@react-three/fiber';
import type { Feature, PrimitiveParams } from '@/domain/types';
import { evaluatePrimitive } from '@/domain/features/Primitive';
import { useCommandStore } from '@/state/commandStore';

interface PrimitiveMeshProps {
  feature: Feature;
  selected: boolean;
  onSelect: () => void;
}

const DEFAULT_COLOR = '#9ca3af'; // zinc-400
const HIGHLIGHT_EMISSIVE = '#eab308'; // yellow-500
const HIGHLIGHT_OUTLINE = '#facc15'; // yellow-400

export function PrimitiveMesh({ feature, selected, onSelect }: PrimitiveMeshProps) {
  const params = feature.parameters as unknown as PrimitiveParams;
  const { gl } = useThree();
  const color = params.color ?? DEFAULT_COLOR;

  const geometry = useMemo(() => {
    const r = evaluatePrimitive(params);
    return r.geometry;
  }, [params]);

  const edges = useMemo(() => {
    if (!geometry) return null;
    try {
      return new THREE.EdgesGeometry(geometry, 25);
    } catch {
      return null;
    }
  }, [geometry]);

  if (!geometry) return null;

  return (
    <group>
      {/* Corpo principal — cor própria. Quando selecionada, ganha glow emissivo amarelo. */}
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (useCommandStore.getState().onPick) return; // modo HOLE picking — deixa passar
          e.stopPropagation();
          gl.domElement.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (useCommandStore.getState().onPick) return;
          gl.domElement.style.cursor = '';
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (useCommandStore.getState().onPick) return;
          e.stopPropagation();
          onSelect();
        }}
      >
        <meshStandardMaterial
          color={color}
          metalness={0.15}
          roughness={0.55}
          emissive={selected ? HIGHLIGHT_EMISSIVE : '#000000'}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>

      {/* Arestas: sempre visíveis, mas mais grossas e amarelas quando selecionado */}
      {edges && (
        <lineSegments geometry={edges} renderOrder={selected ? 3 : 2}>
          <lineBasicMaterial
            color={selected ? HIGHLIGHT_OUTLINE : '#27272a'}
            transparent
            opacity={selected ? 1 : 0.6}
            depthTest={!selected}
          />
        </lineSegments>
      )}
    </group>
  );
}
