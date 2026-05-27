/**
 * src/commands/coords.ts
 * Parser de coordenadas digitadas (estilo AutoCAD):
 *   "100,50"      → absoluto (no plano local)
 *   "@100,50"     → relativo ao último ponto (delta x, delta y)
 *   "@100<45"     → relativo polar (distância 100, ângulo 45° em graus)
 *
 * Retorna null se a string não casar com nenhum dos formatos.
 * A função usa o último ponto pendente do sketchStore como "âncora" para
 * coordenadas relativas/polares.
 */
import type { Vec2 } from '@/domain/types';
import { useSketchStore } from '@/state/sketchStore';

const REL_RECT = /^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;
const REL_POLAR = /^@(-?\d+(?:\.\d+)?)<(-?\d+(?:\.\d+)?)$/;
const ABS = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;

export function parseCoord(input: string): Vec2 | null {
  const s = input.trim();
  if (!s) return null;

  // absoluto
  const absMatch = ABS.exec(s);
  if (absMatch) {
    return [parseFloat(absMatch[1]), parseFloat(absMatch[2])];
  }

  // âncora para relativos = último pendingPoint
  const pending = useSketchStore.getState().pendingPoints;
  const anchor: Vec2 = pending.length > 0 ? pending[pending.length - 1] : [0, 0];

  // relativo retangular
  const relMatch = REL_RECT.exec(s);
  if (relMatch) {
    return [anchor[0] + parseFloat(relMatch[1]), anchor[1] + parseFloat(relMatch[2])];
  }

  // relativo polar
  const polMatch = REL_POLAR.exec(s);
  if (polMatch) {
    const r = parseFloat(polMatch[1]);
    const angDeg = parseFloat(polMatch[2]);
    const rad = (angDeg * Math.PI) / 180;
    return [anchor[0] + Math.cos(rad) * r, anchor[1] + Math.sin(rad) * r];
  }

  return null;
}
