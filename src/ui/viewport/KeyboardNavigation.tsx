/**
 * src/ui/viewport/KeyboardNavigation.tsx
 * Navegação fluida por teclado:
 *  - Setas:         orbita continuamente (90°/s)
 *  - Shift + setas: pan continuamente (50% da distância por segundo)
 *  - Ctrl + setas:  zoom contínuo (1.5x por segundo)
 *
 * Em vez de uma transformação discreta por toque (que ficava "engasgada"),
 * mantemos um Set de teclas pressionadas e aplicamos delta-time a cada frame
 * via useFrame. Resultado: enquanto a seta está apertada, a câmera desliza;
 * solta a tecla e ela para.
 *
 * Atenção a edge cases:
 *  - Foco em <input>: ignoramos completamente (digitação não move câmera)
 *  - Window blur (alt-tab): limpamos o set para não ficar uma tecla "presa"
 *  - Respeita clamps do OrbitControls (polar, distância, target.y>=0)
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

const ORBIT_RATE_DEG_PER_S = 90;
const PAN_RATIO_PER_S = 0.5; // fração da distância câmera-target por segundo
const ZOOM_RATE_PER_S = 1.5; // fator por segundo

type ControlsLike = {
  target: THREE.Vector3;
  object: THREE.Camera;
  minDistance?: number;
  maxDistance?: number;
  update: () => void;
};

type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
const ARROW_SET: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
]);

export function KeyboardNavigation() {
  const controls = useThree((s) => s.controls) as ControlsLike | null;

  const pressed = useRef<Set<ArrowKey>>(new Set());
  const shift = useRef(false);
  const ctrl = useRef(false);

  useEffect(() => {
    const isFormFocus = (t: EventTarget | null) =>
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

    const onDown = (e: KeyboardEvent) => {
      if (isFormFocus(e.target)) return;
      if (e.key === 'Shift') shift.current = true;
      if (e.key === 'Control' || e.key === 'Meta') ctrl.current = true;
      if (ARROW_SET.has(e.key)) {
        pressed.current.add(e.key as ArrowKey);
        e.preventDefault(); // impede scroll da página
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shift.current = false;
      if (e.key === 'Control' || e.key === 'Meta') ctrl.current = false;
      if (ARROW_SET.has(e.key)) {
        pressed.current.delete(e.key as ArrowKey);
      }
    };

    const onBlur = () => {
      pressed.current.clear();
      shift.current = false;
      ctrl.current = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useFrame((_, delta) => {
    if (!controls || pressed.current.size === 0) return;

    // delta clamp pra evitar saltos enormes em frames lentos
    const dt = Math.min(delta, 0.1);

    let dTheta = 0;
    let dPhi = 0;
    let dx = 0;
    let dy = 0;
    let zoomFactor = 1;

    const orbitStep = THREE.MathUtils.degToRad(ORBIT_RATE_DEG_PER_S) * dt;
    const distance = controls.target.distanceTo(controls.object.position);
    const panStep = distance * PAN_RATIO_PER_S * dt;
    const zoomStep = Math.pow(ZOOM_RATE_PER_S, dt);

    for (const key of pressed.current) {
      if (ctrl.current) {
        if (key === 'ArrowUp' || key === 'ArrowRight') zoomFactor /= zoomStep;
        if (key === 'ArrowDown' || key === 'ArrowLeft') zoomFactor *= zoomStep;
      } else if (shift.current) {
        if (key === 'ArrowLeft') dx -= panStep;
        if (key === 'ArrowRight') dx += panStep;
        if (key === 'ArrowUp') dy += panStep;
        if (key === 'ArrowDown') dy -= panStep;
      } else {
        if (key === 'ArrowLeft') dTheta += orbitStep;
        if (key === 'ArrowRight') dTheta -= orbitStep;
        if (key === 'ArrowUp') dPhi -= orbitStep;
        if (key === 'ArrowDown') dPhi += orbitStep;
      }
    }

    if (dTheta !== 0 || dPhi !== 0) orbit(controls, dTheta, dPhi);
    if (dx !== 0 || dy !== 0) pan(controls, dx, dy);
    if (zoomFactor !== 1) zoom(controls, zoomFactor);
  });

  return null;
}

/* ============== helpers reutilizáveis ============== */

const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _spherical = new THREE.Spherical();

function pan(controls: ControlsLike, dx: number, dy: number): void {
  const cam = controls.object;
  cam.matrix.extractBasis(_right, _up, _tmp);
  const delta = new THREE.Vector3()
    .addScaledVector(_right, dx)
    .addScaledVector(_up, dy);
  controls.target.add(delta);
  cam.position.add(delta);
  controls.update();
}

function orbit(controls: ControlsLike, dTheta: number, dPhi: number): void {
  const cam = controls.object;
  _offset.copy(cam.position).sub(controls.target);
  _spherical.setFromVector3(_offset);
  _spherical.theta += dTheta;
  _spherical.phi += dPhi;
  // clamp phi: 0 (zênite) até quase equador — mesmo limite do OrbitControls
  _spherical.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, _spherical.phi));
  _offset.setFromSpherical(_spherical);
  cam.position.copy(controls.target).add(_offset);
  cam.lookAt(controls.target);
  controls.update();
}

function zoom(controls: ControlsLike, factor: number): void {
  const cam = controls.object;
  _offset.copy(cam.position).sub(controls.target);
  const newDist = THREE.MathUtils.clamp(
    _offset.length() * factor,
    controls.minDistance ?? 1,
    controls.maxDistance ?? 10000,
  );
  _offset.setLength(newDist);
  cam.position.copy(controls.target).add(_offset);
  controls.update();
}
