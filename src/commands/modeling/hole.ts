/**
 * src/commands/modeling/hole.ts
 * Comando HOLE — entra em MODO PICKING:
 *   1. Mostra prompt "Clique numa face para o furo"
 *   2. Cursor vira crosshair na hover da peça
 *   3. Click → captura posição + normal da face
 *   4. Deriva o eixo do furo (oposto à normal)
 *   5. Cria a feature com defaults + posição/eixo derivados
 *   6. Sai do picking
 *
 * ESC cancela a qualquer momento.
 */
import * as THREE from 'three';
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultHoleParams, deriveHoleAxisFromNormal } from '@/domain/features/Hole';
import type { Feature, HoleParams } from '@/domain/types';

export function holeCommand() {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  const hasBody = doc.features.some(
    (f) =>
      (f.type === 'extrude' || f.type === 'revolve' || f.type === 'hole') &&
      !f.suppressed,
  );
  if (!hasBody) {
    cs.log({
      text: 'HOLE precisa de um corpo existente. Crie uma extrusão ou revolução primeiro.',
      kind: 'error',
    });
    return;
  }

  cs.setActiveCommand('HOLE');
  cs.setPrompt('Clique numa face para o furo (ESC cancela):');
  cs.log({
    text: 'Modo Furo: clique numa face da peça pra posicionar.',
    kind: 'info',
  });

  cs.setOnPick((hit) => {
    const normal = new THREE.Vector3(hit.normal[0], hit.normal[1], hit.normal[2]);
    const axis = deriveHoleAxisFromNormal(normal);

    const count =
      useDocumentStore.getState().doc.features.filter((f) => f.type === 'hole').length + 1;

    const params: HoleParams = {
      ...defaultHoleParams(),
      position: hit.point,
      axis,
    };

    const feature: Feature = {
      id: newId(),
      type: 'hole',
      name: `Furo${count}`,
      parameters: params as unknown as Record<string, unknown>,
      inputs: [],
      suppressed: false,
      errored: false,
      visible: true,
    };

    useDocumentStore.getState().addFeature(feature);
    useSelectionStore.getState().select([feature.id]);
    useUIStore.getState().setRibbonTab('modeling');

    cs.log({
      text: `${feature.name} criado em (${hit.point[0].toFixed(1)}, ${hit.point[1].toFixed(
        1,
      )}, ${hit.point[2].toFixed(1)}) · eixo ${axis}. Ajuste detalhes no painel.`,
      kind: 'info',
    });

    // sai do picking
    cs.setOnPick(null);
    cs.setActiveCommand(null);
    cs.setPrompt('Comando:');
  });
}
