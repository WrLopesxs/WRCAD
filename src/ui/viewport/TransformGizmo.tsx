/**
 * src/ui/viewport/TransformGizmo.tsx
 * Gizmo 3D pra arrastar uma feature pelo viewport. Usa TransformControls do
 * drei (que envolve o helper nativo do three.js).
 *
 * Padrão de funcionamento:
 *  1. Renderiza um mesh "âncora" invisível na posição atual da feature.
 *  2. TransformControls anexa nesse âncora — desenha os 3 eixos coloridos.
 *  3. Quando o usuário arrasta, o âncora se move; capturamos a nova posição
 *     via onObjectChange e atualizamos a feature no documentStore.
 *  4. Durante o drag, desabilitamos o OrbitControls pra a câmera não rodar.
 *
 * Funciona pra qualquer feature cujos parameters tenham `position: Vec3`
 * (primitives e holes hoje).
 */
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Feature, Vec3 } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';

interface TransformGizmoProps {
  feature: Feature;
}

interface PositionedParams {
  position: Vec3;
}

export function TransformGizmo({ feature }: TransformGizmoProps) {
  const anchorRef = useRef<THREE.Mesh>(null);
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const orbitControls = useThree((s) => s.controls) as
    | { enabled?: boolean }
    | null;

  const params = feature.parameters as unknown as PositionedParams;
  const [px, py, pz] = params.position;

  // Quando a feature muda externamente (slider no form, undo), sincronizamos
  // a posição do âncora pra refletir o estado.
  useEffect(() => {
    if (!anchorRef.current) return;
    anchorRef.current.position.set(px, py, pz);
  }, [px, py, pz]);

  // Drag start/end → liga/desliga OrbitControls
  const onDraggingChanged = (e: { value: boolean }) => {
    if (orbitControls && 'enabled' in orbitControls) {
      orbitControls.enabled = !e.value;
    }
  };

  // Cada frame em que o gizmo move, captura position e propaga pro store
  const onObjectChange = () => {
    if (!anchorRef.current) return;
    const p = anchorRef.current.position;
    // Evita atualização redundante se nada mudou
    if (Math.abs(p.x - px) < 1e-4 && Math.abs(p.y - py) < 1e-4 && Math.abs(p.z - pz) < 1e-4) {
      return;
    }
    updateFeature(feature.id, {
      parameters: {
        ...params,
        position: [p.x, p.y, p.z],
      } as unknown as Record<string, unknown>,
    });
  };

  return (
    <>
      <mesh ref={anchorRef} position={[px, py, pz]} visible={false}>
        {/* geometria mínima — só precisa existir pra TransformControls anexar */}
        <boxGeometry args={[0.1, 0.1, 0.1]} />
      </mesh>
      {anchorRef.current && (
        <TransformControls
          object={anchorRef.current}
          mode="translate"
          size={0.8}
          onObjectChange={onObjectChange}
          onMouseDown={() => onDraggingChanged({ value: true })}
          onMouseUp={() => onDraggingChanged({ value: false })}
        />
      )}
    </>
  );
}
