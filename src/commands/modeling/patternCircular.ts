/**
 * src/commands/modeling/patternCircular.ts
 * Comando PATTERN-CIRCULAR — replica o corpo atual em torno de um eixo X/Y/Z
 * do mundo. Default: 6 cópias em 360° no eixo Y (vertical).
 */
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultPatternCircularParams } from '@/domain/features/PatternCircular';
import type { Feature } from '@/domain/types';

export function patternCircularCommand() {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  const hasBody = doc.features.some(
    (f) => (f.type === 'extrude' || f.type === 'revolve') && !f.suppressed,
  );
  if (!hasBody) {
    cs.log({
      text: 'Padrão circular precisa de um corpo existente. Crie uma extrusão ou revolução primeiro.',
      kind: 'error',
    });
    return;
  }

  const count = doc.features.filter((f) => f.type === 'pattern-circular').length + 1;
  const feature: Feature = {
    id: newId(),
    type: 'pattern-circular',
    name: `Padrão Circular${count}`,
    parameters: defaultPatternCircularParams() as unknown as Record<string, unknown>,
    inputs: [],
    suppressed: false,
    errored: false,
    visible: true,
  };

  useDocumentStore.getState().addFeature(feature);
  useSelectionStore.getState().select([feature.id]);
  useUIStore.getState().setRibbonTab('modeling');
  cs.log({
    text: `${feature.name} criado. Ajuste eixo, quantidade e ângulo no painel.`,
    kind: 'info',
  });
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
}
