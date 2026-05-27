/**
 * src/commands/modeling/extrude.ts
 * Comando EXTRUDE:
 *  1. Encontra um sketch para usar:
 *     - Se a seleção atual aponta para uma feature 'sketch' → usa ela
 *     - Senão, usa o sketch mais recente do documento
 *     - Se não há nenhum → erro
 *  2. Cria uma Feature 'extrude' com parâmetros default (10mm normal)
 *  3. Seleciona a nova feature → PropertiesPanel mostra editor para refinar
 */
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultExtrudeParams } from '@/domain/features/Extrude';
import type { Feature } from '@/domain/types';

export function extrudeCommand() {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  // 1. encontra sketch
  const selectedIds = useSelectionStore.getState().selectedIds;
  const selectedSketchFeature = doc.features.find(
    (f) => f.type === 'sketch' && selectedIds.includes(f.id),
  );

  const sketchFeature =
    selectedSketchFeature ??
    [...doc.features].reverse().find((f) => f.type === 'sketch');

  if (!sketchFeature) {
    cs.log({
      text: 'EXTRUDE requer um esboço. Clique num plano, desenhe um perfil fechado e conclua o esboço primeiro.',
      kind: 'error',
    });
    return;
  }

  const sketchId = (sketchFeature.parameters as { sketchId: string }).sketchId;
  const params = defaultExtrudeParams(sketchId);

  const extrudeCount =
    doc.features.filter((f) => f.type === 'extrude').length + 1;

  const feature: Feature = {
    id: newId(),
    type: 'extrude',
    name: `Extrusão${extrudeCount}`,
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
    text: `${feature.name} criada a partir de ${sketchFeature.name} (distância ${params.distance}mm). Edite os parâmetros no painel à direita.`,
    kind: 'info',
  });
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
}
