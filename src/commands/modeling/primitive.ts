/**
 * src/commands/modeling/primitive.ts
 * Comandos pra adicionar primitivas prontas ao documento. Cada shape tem seu
 * próprio comando (BOX, CYLINDER, SPHERE, CONE, TORUS) com defaults sensatos.
 *
 * Diferente das outras features 3D, primitivas NÃO precisam de esboço nem
 * corpo existente — elas próprias podem ser o corpo base.
 */
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useCommandStore } from '@/state/commandStore';
import { useUIStore } from '@/state/uiStore';
import { newId } from '@/utils/ids';
import { defaultPrimitiveParams } from '@/domain/features/Primitive';
import type { Feature, PrimitiveShape, Vec3 } from '@/domain/types';

/** Espaçamento em X entre primitivas auto-posicionadas (mm). */
const AUTO_OFFSET_SPACING = 50;

const SHAPE_LABELS: Record<PrimitiveShape, string> = {
  box: 'Cubo',
  cylinder: 'Cilindro',
  sphere: 'Esfera',
  cone: 'Cone',
  torus: 'Toro',
};

function createPrimitive(shape: PrimitiveShape) {
  const cs = useCommandStore.getState();
  const doc = useDocumentStore.getState().doc;

  const params = defaultPrimitiveParams(shape);

  // Auto-offset: posiciona a nova primitiva à direita do corpo atual pra não
  // sobrepor (default todos iriam pra origem). Usa o bbox do resultado do
  // evaluator. Se não houver corpo ainda, fica na origem.
  params.position = computeAutoPosition();

  const count =
    doc.features.filter(
      (f) =>
        f.type === 'primitive' &&
        (f.parameters as unknown as { shape: PrimitiveShape }).shape === shape,
    ).length + 1;

  const feature: Feature = {
    id: newId(),
    type: 'primitive',
    name: `${SHAPE_LABELS[shape]}${count}`,
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
    text: `${feature.name} adicionado. Ajuste dimensões e posição no painel.`,
    kind: 'info',
  });
  cs.setActiveCommand(null);
  cs.setPrompt('Comando:');
}

/**
 * Calcula a posição padrão para uma nova primitiva.
 *
 * Estratégia: count-based — conta quantas features de corpo já existem e
 * desloca a nova em N * SPACING ao longo do eixo X. Predictable e robusto
 * (não depende do evaluator funcionar bem). Usuário ajusta XYZ depois se
 * quiser sobrepor / agrupar.
 */
function computeAutoPosition(): Vec3 {
  const doc = useDocumentStore.getState().doc;
  // conta features que produzem um corpo (não conta sketches/patterns/mirrors)
  const bodyCount = doc.features.filter(
    (f) =>
      (f.type === 'primitive' ||
        f.type === 'extrude' ||
        f.type === 'revolve') &&
      !f.suppressed,
  ).length;
  return [bodyCount * AUTO_OFFSET_SPACING, 0, 0];
}

export const boxCommand = () => createPrimitive('box');
export const cylinderCommand = () => createPrimitive('cylinder');
export const sphereCommand = () => createPrimitive('sphere');
export const coneCommand = () => createPrimitive('cone');
export const torusCommand = () => createPrimitive('torus');
