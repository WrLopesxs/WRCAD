/**
 * src/ui/viewport/Viewport.tsx
 * Cena 3D principal. Câmera isométrica balanceada (horizonte no meio), bg
 * com gradiente linear sutil, fog longa para a grid sumir gradualmente, e um
 * marcador de origem na intersecção dos eixos para a cena nunca parecer vazia.
 */
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '@/state/uiStore';
import { PlanePicker } from './PlanePicker';
import { CADGrid } from './CADGrid';
import { OriginMarker } from './OriginMarker';
import { SketchLayer } from './SketchLayer';
import { ModelScene } from './ModelScene';
import { KeyboardNavigation } from './KeyboardNavigation';

interface ThemePalette {
  bgGradient: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  cellColor: string;
  sectionColor: string;
  cubeBg: string;
  cubeStroke: string;
  cubeText: string;
  cubeHover: string;
  ambient: number;
}

const DARK_PALETTE: ThemePalette = {
  bgGradient: 'linear-gradient(180deg, #18181b 0%, #0b0b0e 100%)',
  fog: '#0b0b0e',
  fogNear: 800,
  fogFar: 3500,
  cellColor: '#3f3f46',
  sectionColor: '#52525b',
  cubeBg: '#18181b',
  cubeStroke: '#eab308',
  cubeText: '#fde047',
  cubeHover: '#facc15',
  ambient: 0.6,
};

const LIGHT_PALETTE: ThemePalette = {
  bgGradient: 'linear-gradient(180deg, #fafaf9 0%, #e7e5e4 100%)',
  fog: '#e7e5e4',
  fogNear: 800,
  fogFar: 3500,
  cellColor: '#a1a1aa',
  sectionColor: '#52525b',
  cubeBg: '#27272a',
  cubeStroke: '#facc15',
  cubeText: '#fef9c3',
  cubeHover: '#fde047',
  ambient: 0.75,
};

export function Viewport() {
  const theme = useUIStore((s) => s.theme);
  const palette = useMemo(() => (theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE), [theme]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: palette.bgGradient }}
    >
      <Canvas
        key={theme}
        // câmera isométrica clássica de CAD: 35° de elevação, horizonte centralizado
        camera={{ position: [110, 90, 110], fov: 35, near: 1, far: 8000 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        onCreated={({ scene }) => {
          scene.fog = new THREE.Fog(palette.fog, palette.fogNear, palette.fogFar);
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={palette.ambient} />
        <directionalLight position={[100, 200, 100]} intensity={0.9} castShadow />
        <directionalLight position={[-100, 50, -100]} intensity={0.3} />

        <CADGrid
          size={5000}
          cellSize={10}
          sectionSize={100}
          cellColor={palette.cellColor}
          sectionColor={palette.sectionColor}
        />

        <axesHelper args={[50]} />
        <OriginMarker theme={theme} />
        <PlanePicker size={60} theme={theme} />
        <SketchLayer theme={theme} />
        <ModelScene />
        <KeyboardNavigation />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={3000}
          /* zoom focado no cursor — clássico CAD/3D, muito mais natural */
          zoomToCursor
          zoomSpeed={1.2}
          panSpeed={1.0}
          rotateSpeed={0.9}
          /* clamp da rotação: NÃO permite rotacionar abaixo do horizonte (eq.) */
          maxPolarAngle={Math.PI / 2 - 0.01}
          /* pan em screen-space (mais intuitivo na maioria dos CAD) */
          screenSpacePanning
          /* clamp do pan: se o usuário puxar o target abaixo de y=0, desfazemos
             a componente Y do delta — pan horizontal continua livre, vertical
             para no plano da grid. Como pan move target e câmera juntos, também
             precisamos shiftar a câmera de volta pra manter continuidade visual. */
          onChange={(e) => {
            const ctrl = e?.target as
              | { target?: { y: number }; object?: { position: { y: number } } }
              | undefined;
            if (!ctrl?.target || !ctrl.object) return;
            if (ctrl.target.y < 0) {
              const dy = -ctrl.target.y;
              ctrl.target.y = 0;
              ctrl.object.position.y += dy;
            }
            // safety: câmera nunca abaixo de y=0.1 (mesmo em casos de borda)
            if (ctrl.object.position.y < 0.1) {
              ctrl.object.position.y = 0.1;
            }
          }}
        />

        <GizmoHelper alignment="top-right" margin={[90, 90]}>
          <GizmoViewcube
            color={palette.cubeBg}
            strokeColor={palette.cubeStroke}
            textColor={palette.cubeText}
            hoverColor={palette.cubeHover}
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
