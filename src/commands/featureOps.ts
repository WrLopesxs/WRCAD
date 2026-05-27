/**
 * src/commands/featureOps.ts
 * Operações de alto nível sobre features: editar (re-entrar em modo esboço),
 * excluir com cascata (sketch também remove de doc.sketches), etc.
 */
import type { Feature } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';

/** Re-entra em modo Esboço para editar a sketch da feature dada. */
export function editSketchFeature(feature: Feature): void {
  if (feature.type !== 'sketch') return;

  const params = feature.parameters as { sketchId?: string };
  const sketchId = params.sketchId;
  if (!sketchId) return;

  const sketch = useDocumentStore.getState().doc.sketches[sketchId];
  if (!sketch) {
    useCommandStore.getState().log({
      text: `Esboço ${sketchId} não encontrado.`,
      kind: 'error',
    });
    return;
  }

  useSketchStore.getState().beginEditSketch(sketch, feature.id);
  useUIStore.getState().setRibbonTab('sketch');
  useCommandStore.getState().log({
    text: `Editando ${feature.name}. Concluir para salvar; descartar mantém versão anterior.`,
    kind: 'info',
  });
}

/**
 * Exclui uma feature. Se for 'sketch', também remove o Sketch correspondente
 * de doc.sketches — extrudes dependentes vão para estado de erro (sem crash).
 */
export function deleteFeature(feature: Feature): void {
  const doc = useDocumentStore.getState();

  if (feature.type === 'sketch') {
    const sketchId = (feature.parameters as { sketchId?: string }).sketchId;
    if (sketchId) doc.removeSketch(sketchId);
  }

  doc.removeFeature(feature.id);

  // limpa seleção se ela apontava para a feature deletada
  const sel = useSelectionStore.getState();
  if (sel.selectedIds.includes(feature.id)) sel.clear();

  useCommandStore.getState().log({
    text: `${feature.name} excluída.`,
    kind: 'info',
  });
}
