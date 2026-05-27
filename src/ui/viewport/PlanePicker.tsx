/**
 * src/ui/viewport/PlanePicker.tsx
 * Quando NÃO há esboço ativo, renderiza 3 planos clicáveis (XY, YZ, XZ) com
 * hover destacado. Clicar inicia um esboço naquele plano. Os planos só
 * aparecem se nenhum esboço estiver ativo — em modo sketch eles são ocultados.
 */
import { useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RefPlane, Theme } from '@/domain/types';
import { useSketchStore } from '@/state/sketchStore';
import { useUIStore } from '@/state/uiStore';
import { useCommandStore } from '@/state/commandStore';

interface PlanePickerProps {
  size?: number;
  theme: Theme;
}

interface PlaneDef {
  plane: RefPlane;
  label: string;
  rotation: [number, number, number];
  position: [number, number, number];
  color: string;
  hoverColor: string;
}

const EPS = 0.05;

function planeDefs(theme: Theme): PlaneDef[] {
  const dark = theme === 'dark';
  return [
    {
      plane: 'XY',
      label: 'XY',
      rotation: [-Math.PI / 2, 0, 0],
      position: [0, EPS, 0],
      color: dark ? '#3b82f6' : '#2563eb',
      hoverColor: '#60a5fa',
    },
    {
      plane: 'YZ',
      label: 'YZ',
      rotation: [0, Math.PI / 2, 0],
      position: [EPS, 0, 0],
      color: dark ? '#ef4444' : '#dc2626',
      hoverColor: '#f87171',
    },
    {
      plane: 'XZ',
      label: 'XZ',
      rotation: [0, 0, 0],
      position: [0, 0, EPS],
      color: dark ? '#22c55e' : '#16a34a',
      hoverColor: '#4ade80',
    },
  ];
}

export function PlanePicker({ size = 50, theme }: PlanePickerProps) {
  const isSketching = useSketchStore((s) => s.activeSketchId !== null);
  const beginSketch = useSketchStore((s) => s.beginSketch);
  const setRibbonTab = useUIStore((s) => s.setRibbonTab);
  const log = useCommandStore((s) => s.log);

  if (isSketching) return null;

  const defs = planeDefs(theme);
  const half = size / 2;

  return (
    <group>
      {defs.map((def) => (
        <PickablePlane
          key={def.plane}
          {...def}
          size={size}
          half={half}
          onPick={() => {
            beginSketch(def.plane);
            setRibbonTab('sketch');
            log({ text: `Esboço iniciado no plano ${def.plane}.`, kind: 'info' });
          }}
        />
      ))}
    </group>
  );
}

interface PickablePlaneProps extends PlaneDef {
  size: number;
  half: number;
  onPick: () => void;
}

function PickablePlane({
  rotation,
  position,
  color,
  hoverColor,
  size,
  half,
  label,
  onPick,
}: PickablePlaneProps) {
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();

  const edgePoints = new Float32Array([
    -half, -half, 0,  half, -half, 0,
     half, -half, 0,  half,  half, 0,
     half,  half, 0, -half,  half, 0,
    -half,  half, 0, -half, -half, 0,
  ]);
  void label;

  return (
    <group rotation={rotation} position={position}>
      {/* face clicável invisível-quase */}
      <mesh
        renderOrder={-2}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          gl.domElement.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          gl.domElement.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPick();
          gl.domElement.style.cursor = '';
        }}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={hovered ? hoverColor : color}
          transparent
          opacity={hovered ? 0.18 : 0.04}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* borda */}
      <lineSegments renderOrder={-1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={hovered ? hoverColor : color}
          transparent
          opacity={hovered ? 0.9 : 0.5}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
