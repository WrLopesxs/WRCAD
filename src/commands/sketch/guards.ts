/**
 * src/commands/sketch/guards.ts
 * Pré-condições compartilhadas pelos comandos de esboço.
 */
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';

export function requireSketch(commandName: string): boolean {
  if (useSketchStore.getState().activeSketchId === null) {
    useCommandStore.getState().log({
      text: `${commandName} requer um esboço ativo. Clique num plano (XY/YZ/XZ) para começar.`,
      kind: 'error',
    });
    return false;
  }
  return true;
}
