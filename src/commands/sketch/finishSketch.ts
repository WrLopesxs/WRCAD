/**
 * src/commands/sketch/finishSketch.ts
 * Conclui o esboço ativo:
 *   - Modo NOVO: cria Sketch + Feature 'sketch' no documentStore
 *   - Modo EDIÇÃO: atualiza o Sketch existente e o entityCount da Feature
 *     (mantém o id da feature → extrudes dependentes regeneram via cache).
 */
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { useDocumentStore } from '@/state/documentStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import type { Feature, Sketch } from '@/domain/types';

export function finishSketchCommand() {
  const sk = useSketchStore.getState();
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState();

  if (sk.activeSketchId === null || sk.plane === null) {
    cs.log({ text: 'Nenhum esboço ativo.', kind: 'error' });
    return;
  }

  if (sk.isEditing && sk.editingFeatureId) {
    // ----- modo edição: atualiza sketch + feature existentes -----
    const existingFeature = doc.doc.features.find((f) => f.id === sk.editingFeatureId);
    doc.updateSketch(sk.activeSketchId, {
      entities: sk.entities,
      constraints: sk.constraints,
    });
    if (existingFeature) {
      doc.updateFeature(existingFeature.id, {
        parameters: {
          ...existingFeature.parameters,
          entityCount: sk.entities.length,
        },
      });
    }
    cs.log({
      text: `Esboço atualizado (${sk.entities.length} entidades). Features dependentes foram regeneradas.`,
      kind: 'info',
    });
  } else {
    // ----- modo novo: cria sketch + feature -----
    const sketch: Sketch = {
      id: sk.activeSketchId,
      name: `Esboço${
        doc.doc.features.filter((f) => f.type === 'sketch').length + 1
      }`,
      plane: sk.plane,
      entities: sk.entities,
      constraints: sk.constraints,
      fullyConstrained: false,
    };

    const feature: Feature = {
      id: newId(),
      type: 'sketch',
      name: sketch.name,
      parameters: {
        sketchId: sketch.id,
        plane: sk.plane,
        entityCount: sk.entities.length,
      },
      inputs: [],
      suppressed: false,
      errored: false,
      visible: true,
    };

    doc.addSketch(sketch);
    doc.addFeature(feature);
    cs.log({
      text: `${sketch.name} concluído (${sk.entities.length} entidades).`,
      kind: 'info',
    });
  }

  sk.exit();
  cs.setOnPoint(null);
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
  useUIStore.getState().setRibbonTab('modeling');
}
