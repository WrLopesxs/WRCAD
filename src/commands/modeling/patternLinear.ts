/**
 * src/commands/modeling/patternLinear.ts
 * Comando PATTERN-LINEAR — replica o corpo atual N vezes ao longo de um eixo.
 * Default: 3 cópias no eixo X+, espaçamento 30mm.
 */
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultPatternLinearParams } from '@/domain/features/PatternLinear';
import type { Feature } from '@/domain/types';

export function patternLinearCommand() {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  const hasBody = doc.features.some(
    (f) => (f.type === 'extrude' || f.type === 'revolve') && !f.suppressed,
  );
  if (!hasBody) {
    cs.log({
      text: 'Padrão precisa de um corpo existente. Crie uma extrusão ou revolução primeiro.',
      kind: 'error',
    });
    return;
  }

  const count = doc.features.filter((f) => f.type === 'pattern-linear').length + 1;
  const feature: Feature = {
    id: newId(),
    type: 'pattern-linear',
    name: `Padrão Linear${count}`,
    parameters: defaultPatternLinearParams() as unknown as Record<string, unknown>,
    inputs: [],
    suppressed: false,
    errored: false,
    visible: true,
  };

  useDocumentStore.getState().addFeature(feature);
  useSelectionStore.getState().select([feature.id]);
  useUIStore.getState().setRibbonTab('modeling');
  cs.log({
    text: `${feature.name} criado. Ajuste eixo, quantidade e espaçamento no painel.`,
    kind: 'info',
  });
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
}
