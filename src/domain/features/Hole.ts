/**
 * src/domain/features/Hole.ts
 * Gera geometria de furo padronizado (cilindro, escareado, rebaixado) pronta
 * pra subtração boolean. Caller (evaluator) é quem chama booleanGeometries
 * com 'subtract'.
 *
 * Convenção: o furo é construído em local com eixo ao longo de -Y (entra de
 * cima pra baixo). Depois rotaciona pra alinhar com p.axis e translada pra
 * p.position no mundo.
 *
 * Tipos:
 *   through       → cilindro longo (atravessa qualquer corpo de tamanho razoável)
 *   blind         → cilindro de profundidade definida
 *   counterbore   → cilindro menor (depth) + cilindro maior (headDepth) no topo
 *   countersink   → cilindro menor (depth) + cone no topo (headDepth = profundidade)
 */
import * as THREE from 'three';
import type { HoleParams } from '@/domain/types';
import { booleanGeometries } from '@/engine/booleanOps';

export interface HoleResult {
  geometry: THREE.BufferGeometry | null;
  error: string | null;
}

/** Profundidade automática para 'through' — grande o bastante pra atravessar qualquer corpo razoável. */
const THROUGH_DEPTH = 5000;
/** Margem extra acima do topo da peça pra garantir subtração limpa. */
const TOP_MARGIN = 0.5;

export function evaluateHole(p: HoleParams): HoleResult {
  try {
    const diameter = Math.max(0.001, p.diameter);
    const depth = p.type === 'through' ? THROUGH_DEPTH : Math.max(0.001, p.depth);
    const radius = diameter / 2;

    // Constrói a "ferramenta de corte" em local com eixo ao longo de -Y.
    // A geometria começa em y=+TOP_MARGIN (acima do topo) e desce.
    let toolGeom = makeCylinder(radius, depth + TOP_MARGIN, 32);
    // Translada pra que y=0 fique no TOPO do furo (apex do corte)
    toolGeom.translate(0, -(depth + TOP_MARGIN) / 2 + TOP_MARGIN, 0);

    // Adiciona escareado/rebaixo se aplicável
    if (p.type === 'counterbore' && p.headDiameter && p.headDepth) {
      const headRadius = Math.max(radius, p.headDiameter / 2);
      const headH = Math.max(0.01, p.headDepth);
      const head = makeCylinder(headRadius, headH + TOP_MARGIN, 32);
      head.translate(0, -(headH + TOP_MARGIN) / 2 + TOP_MARGIN, 0);
      toolGeom = booleanGeometries(toolGeom, head, 'union');
      head.dispose();
    } else if (p.type === 'countersink' && p.headDiameter && p.headDepth) {
      const headRadius = Math.max(radius, p.headDiameter / 2);
      const headH = Math.max(0.01, p.headDepth);
      // Cone: invertido (base larga em cima, ponta estreita embaixo no diâmetro do furo)
      const cone = makeCone(headRadius, radius, headH + TOP_MARGIN, 32);
      cone.translate(0, -(headH + TOP_MARGIN) / 2 + TOP_MARGIN, 0);
      toolGeom = booleanGeometries(toolGeom, cone, 'union');
      cone.dispose();
    }

    // Orienta a ferramenta conforme p.axis
    const matrix = axisMatrix(p.axis);
    toolGeom.applyMatrix4(matrix);

    // Translada para p.position
    toolGeom.translate(p.position[0], p.position[1], p.position[2]);

    toolGeom.computeVertexNormals();
    toolGeom.computeBoundingSphere();

    return { geometry: toolGeom, error: null };
  } catch (err) {
    return {
      geometry: null,
      error: `Hole falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Cilindro centrado na origem, altura ao longo de Y. */
function makeCylinder(radius: number, height: number, radialSegs = 32): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius, radius, height, radialSegs);
}

/** Cone-tronco centrado na origem, eixo Y. radiusTop em +y/2, radiusBottom em -y/2. */
function makeCone(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegs = 32,
): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegs);
}

/**
 * Constrói matriz que orienta a "ferramenta" (furo) ao longo do eixo informado.
 *
 * Convenção:
 *   - axis NOME = direção em que o FURO BORA (penetra)
 *   - A boca do furo (a abertura) fica no sentido OPOSTO ao bore
 *
 * Tool em local:
 *   - boca em +Y (acima da origem)
 *   - corpo descendo em -Y
 *
 * Então precisamos rotacionar +Y local para a direção OPOSTA ao bore.
 *
 * Exemplo: axis='-Y' (furo desce, boca em cima):
 *   bore = -Y, mouth = +Y, rotação = identidade.
 */
function axisMatrix(axis: HoleParams['axis']): THREE.Matrix4 {
  const bore = boreDirection(axis);
  const mouth = bore.clone().negate();
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    mouth,
  );
  return new THREE.Matrix4().makeRotationFromQuaternion(q);
}

function boreDirection(axis: HoleParams['axis']): THREE.Vector3 {
  switch (axis) {
    case 'X':
      return new THREE.Vector3(1, 0, 0);
    case '-X':
      return new THREE.Vector3(-1, 0, 0);
    case 'Y':
      return new THREE.Vector3(0, 1, 0);
    case '-Y':
      return new THREE.Vector3(0, -1, 0);
    case 'Z':
      return new THREE.Vector3(0, 0, 1);
    case '-Z':
      return new THREE.Vector3(0, 0, -1);
  }
}

/**
 * Dado um vetor normal de uma face (em mundo), retorna o eixo cardinal mais
 * próximo da direção OPOSTA (o furo bora contra a normal — entra para dentro
 * do corpo).
 */
export function deriveHoleAxisFromNormal(normal: THREE.Vector3): HoleParams['axis'] {
  // Normal aponta pra fora do corpo; bore aponta pra dentro
  const bore = normal.clone().negate().normalize();
  const candidates: [HoleParams['axis'], THREE.Vector3][] = [
    ['X', new THREE.Vector3(1, 0, 0)],
    ['-X', new THREE.Vector3(-1, 0, 0)],
    ['Y', new THREE.Vector3(0, 1, 0)],
    ['-Y', new THREE.Vector3(0, -1, 0)],
    ['Z', new THREE.Vector3(0, 0, 1)],
    ['-Z', new THREE.Vector3(0, 0, -1)],
  ];
  let best: HoleParams['axis'] = '-Y';
  let bestDot = -Infinity;
  for (const [name, vec] of candidates) {
    const d = bore.dot(vec);
    if (d > bestDot) {
      bestDot = d;
      best = name;
    }
  }
  return best;
}

export function defaultHoleParams(): HoleParams {
  return {
    type: 'blind',
    position: [0, 20, 0],
    axis: '-Y',
    diameter: 8,
    depth: 15,
    headDiameter: 14,
    headDepth: 4,
  };
}
