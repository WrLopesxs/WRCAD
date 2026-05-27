/**
 * src/commands/modeling/mirror.ts
 * Comando MIRROR — espelha o corpo atual em torno do plano YZ (default).
 * Usuário ajusta o plano de espelhamento no PropertyManager.
 */
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultMirrorParams } from '@/domain/features/Mirror';
import type { Feature } from '@/domain/types';

export function mirrorCommand() {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  const hasBody = doc.features.some(
    (f) => (f.type === 'extrude' || f.type === 'revolve') && !f.suppressed,
  );
  if (!hasBody) {
    cs.log({
      text: 'MIRROR precisa de um corpo existente. Crie uma extrusão ou revolução primeiro.',
      kind: 'error',
    });
    return;
  }

  const count = doc.features.filter((f) => f.type === 'mirror').length + 1;
  const feature: Feature = {
    id: newId(),
    type: 'mirror',
    name: `Espelhar${count}`,
    parameters: defaultMirrorParams() as unknown as Record<string, unknown>,
    inputs: [],
    suppressed: false,
    errored: false,
    visible: true,
  };

  useDocumentStore.getState().addFeature(feature);
  useSelectionStore.getState().select([feature.id]);
  useUIStore.getState().setRibbonTab('modeling');
  cs.log({
    text: `${feature.name} criado. Escolha o plano de espelhamento no painel.`,
    kind: 'info',
  });
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
}
