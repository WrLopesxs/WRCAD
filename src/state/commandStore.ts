/**
 * src/state/commandStore.ts
 * Estado do sistema de comandos:
 *   - prompt, current, history (linha de comando)
 *   - activeCommand
 *   - onPoint: handler para PONTOS 2D (esboço — clica num plano)
 *   - onPick:  handler para HITS 3D na superfície de um corpo (ex: posição de furo)
 *
 * onPoint e onPick são mutuamente exclusivos: setar um limpa o outro. Isso
 * evita estados confusos (você não pode "esperar ponto E pick" ao mesmo tempo).
 */
import { create } from 'zustand';
import type { Vec2, Vec3 } from '@/domain/types';

export interface CommandHistoryEntry {
  text: string;
  kind: 'input' | 'prompt' | 'info' | 'error';
}

export type PointHandler = (p: Vec2) => void;

export interface PickHit {
  /** Posição mundial do ponto clicado na superfície. */
  point: Vec3;
  /** Normal da face naquele ponto (já em coordenadas mundo, normalizada). */
  normal: Vec3;
}
export type PickHandler = (hit: PickHit) => void;

interface CommandState {
  current: string;
  prompt: string;
  activeCommand: string | null;
  onPoint: PointHandler | null;
  onPick: PickHandler | null;
  history: CommandHistoryEntry[];

  setCurrent: (v: string) => void;
  setPrompt: (p: string) => void;
  setActiveCommand: (cmd: string | null) => void;
  setOnPoint: (h: PointHandler | null) => void;
  setOnPick: (h: PickHandler | null) => void;
  log: (entry: CommandHistoryEntry) => void;
  clearHistory: () => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  current: '',
  prompt: 'Comando:',
  activeCommand: null,
  onPoint: null,
  onPick: null,
  history: [
    { text: 'WRCAD 0.1 — pronto.', kind: 'info' },
    { text: 'Clique num plano (XY/YZ/XZ) para começar um esboço.', kind: 'info' },
  ],

  setCurrent: (v) => set({ current: v }),
  setPrompt: (p) => set({ prompt: p }),
  setActiveCommand: (cmd) => set({ activeCommand: cmd }),
  // setar onPoint limpa onPick (mutuamente exclusivos)
  setOnPoint: (h) => set({ onPoint: h, onPick: h ? null : undefined }),
  setOnPick: (h) => set({ onPick: h, onPoint: h ? null : undefined }),
  log: (entry) => set((s) => ({ history: [...s.history.slice(-200), entry] })),
  clearHistory: () => set({ history: [] }),
}));
