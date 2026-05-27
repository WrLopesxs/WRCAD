/**
 * src/commands/modeling/cutExtrude.ts
 * Comando CUT-EXTRUDE — extruda um perfil e SUBTRAI o resultado do corpo
 * atual (modelo encadeado). Mesma UX do EXTRUDE; só muda o tipo da feature.
 * Útil para abrir furos, sulcos, cavidades.
 */
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultExtrudeParams } from '@/domain/features/Extrude';
import type { Feature } from '@/domain/types';

export function cutExtrudeCommand() {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  // precisa de um corpo existente (alguma extrude prévia)
  const hasBody = doc.features.some((f) => f.type === 'extrude' && !f.suppressed);
  if (!hasBody) {
    cs.log({
      text: 'CUT-EXTRUDE precisa de um corpo existente. Crie uma extrusão primeiro.',
      kind: 'error',
    });
    return;
  }

  // sketch: selecionado ou mais recente
  const selectedIds = useSelectionStore.getState().selectedIds;
  const selectedSketch = doc.features.find(
    (f) => f.type === 'sketch' && selectedIds.includes(f.id),
  );
  const sketchFeature =
    selectedSketch ?? [...doc.features].reverse().find((f) => f.type === 'sketch');

  if (!sketchFeature) {
    cs.log({
      text: 'CUT-EXTRUDE requer um esboço. Clique num plano, desenhe o perfil do furo e conclua.',
      kind: 'error',
    });
    return;
  }

  const sketchId = (sketchFeature.parameters as { sketchId: string }).sketchId;
  const params = defaultExtrudeParams(sketchId);
  // furos cegos default um pouco maiores pra garantir corte
  params.distance = 20;

  const count = doc.features.filter((f) => f.type === 'cut-extrude').length + 1;

  const feature: Feature = {
    id: newId(),
    type: 'cut-extrude',
    name: `Corte${count}`,
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
    text: `${feature.name} criado a partir de ${sketchFeature.name}. Ajuste profundidade no painel.`,
    kind: 'info',
  });
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
}
