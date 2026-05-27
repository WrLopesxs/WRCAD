/**
 * src/commands/parser.ts
 * Recebe uma string (do CommandLine ou de um botão do Ribbon):
 *  1. Se há comando ativo esperando ponto e a string casa com formato de
 *     coordenada (100,50 / @100,50 / @100<45) → alimenta o onPoint (com
 *     clamp do grid aplicado).
 *  2. Caso contrário, resolve alias e dispara o comando registrado.
 */
import { ALIASES } from './aliases';
import { COMMANDS } from './registry';
import { parseCoord } from './coords';
import { useCommandStore } from '@/state/commandStore';
import { useSketchStore } from '@/state/sketchStore';
import { clampPointToGrid } from '@/engine/sketchPlane';

export function executeCommand(input: string): void {
  const trimmed = input.trim();
  if (!trimmed) return;

  const cs = useCommandStore.getState();
  cs.log({ text: `> ${trimmed}`, kind: 'input' });
  cs.setCurrent('');

  // se há comando esperando ponto e a entrada parece coordenada → trata como ponto
  if (cs.onPoint) {
    const coord = parseCoord(trimmed);
    if (coord) {
      const plane = useSketchStore.getState().plane;
      const clamped = plane ? clampPointToGrid(plane, coord) : coord;
      cs.onPoint(clamped);
      return;
    }
  }

  // senão, trata como comando
  const upper = trimmed.toUpperCase();
  const canonical = ALIASES[upper] ?? upper;
  const fn = COMMANDS[canonical];

  if (!fn) {
    cs.log({ text: `Comando desconhecido: ${trimmed}`, kind: 'error' });
    return;
  }

  cs.setActiveCommand(canonical);
  fn();
}
