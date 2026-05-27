/**
 * src/commands/modeling/revolve.ts
 * Comando REVOLVE — pega sketch selecionado (ou mais recente) que tenha uma
 * linha de construção, e cria uma feature 'revolve' com defaults (360° normal).
 */
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultRevolveParams } from '@/domain/features/Revolve';
import type { Feature } from '@/domain/types';

export function revolveCommand() {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  const selectedIds = useSelectionStore.getState().selectedIds;
  const selectedSketch = doc.features.find(
    (f) => f.type === 'sketch' && selectedIds.includes(f.id),
  );
  const sketchFeature =
    selectedSketch ?? [...doc.features].reverse().find((f) => f.type === 'sketch');

  if (!sketchFeature) {
    cs.log({
      text: 'REVOLVE requer um esboço com perfil + linha de eixo (CL). Crie o esboço primeiro.',
      kind: 'error',
    });
    return;
  }

  const sketchId = (sketchFeature.parameters as { sketchId: string }).sketchId;
  const sketch = doc.sketches[sketchId];
  const hasAxis = sketch?.entities.some((e) => e.type === 'line' && e.construction);
  if (!hasAxis) {
    cs.log({
      text: `${sketchFeature.name} não tem linha de eixo. Edite o esboço e adicione uma linha de construção (atalho CL).`,
      kind: 'error',
    });
    return;
  }

  const params = defaultRevolveParams(sketchId);
  const count = doc.features.filter((f) => f.type === 'revolve').length + 1;

  const feature: Feature = {
    id: newId(),
    type: 'revolve',
    name: `Revolução${count}`,
    parameters: params as unknown as Record<string, unknown>,
    inputs: [sketchFeature.id],
    suppressed: false,
    errored: false,
    visible: true,
  };

  useDocumentStore.getState().addFeature(feature);
  useSelectionStore.getState().select([feature.id]);
  useUIStore.getState().setRibbonTab('modeling');

  cs.log({
    text: `${feature.name} criada a partir de ${sketchFeature.name}. Ajuste ângulo/direção no painel.`,
    kind: 'info',
  });
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
}
