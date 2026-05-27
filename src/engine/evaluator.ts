/**
 * src/engine/evaluator.ts
 * Avalia o documento em modo SolidWorks:
 *   - Existe UM "corpo atual" (currentBody) que vai sendo modificado em ordem.
 *   - EXTRUDE: une seu sólido com o corpo atual (ou inicia o corpo se for o 1º).
 *   - CUT-EXTRUDE: subtrai seu sólido do corpo atual.
 *   - Cada feature registra (no eval result) o estado do corpo APÓS sua execução
 *     — útil para futuras features de "rollback" e diagnóstico.
 *
 * O ModelScene renderiza apenas o último corpo (final).
 *
 * Cache: hash leva em conta TODAS as features anteriores (corpo atual depende
 * delas). Por isso o cache aqui é por (featureId + chainHash).
 */
import * as THREE from 'three';
import type {
  CADDocument,
  Feature,
  ExtrudeParams,
  MirrorParams,
  PatternLinearParams,
  PatternCircularParams,
  HoleParams,
  PrimitiveParams,
} from '@/domain/types';
import { evaluateExtrude } from '@/domain/features/Extrude';
import { evaluateRevolve, type RevolveParams } from '@/domain/features/Revolve';
import { evaluateMirror } from '@/domain/features/Mirror';
import { evaluatePatternLinear } from '@/domain/features/PatternLinear';
import { evaluatePatternCircular } from '@/domain/features/PatternCircular';
import { evaluateHole } from '@/domain/features/Hole';
import { evaluatePrimitive } from '@/domain/features/Primitive';
import { booleanGeometries } from './booleanOps';
import { safeMerge, hasGeometry } from './meshOps';

export interface EvalEntry {
  geometry: THREE.BufferGeometry; // estado do corpo APÓS esta feature
  error: string | null;
  loopsFound?: number;
  holesFound?: number;
  droppedCount?: number;
  droppedReasons?: string[];
  isFinal?: boolean; // marca a última feature da chain
}

export type EvalResult = Map<string, EvalEntry>;

interface CacheEntry {
  hash: string;
  entry: EvalEntry;
}

const cache = new Map<string, CacheEntry>();

function hashSketch(doc: CADDocument, sketchId: string): string {
  const s = doc.sketches[sketchId];
  if (!s) return 'none';
  return JSON.stringify(s.entities);
}

function hashFeature(f: Feature, sketchHash: string, prevHash: string): string {
  // prevHash garante invalidação em cascata: se F1 mudar, F2 (que depende de F1) também
  return `${f.type}|${sketchHash}|${JSON.stringify(f.parameters)}|${f.suppressed}|${prevHash}`;
}

export function evaluate(doc: CADDocument): EvalResult {
  const result: EvalResult = new Map();

  let currentBody: THREE.BufferGeometry | null = null;
  let prevHash = 'root';
  let lastBodyFeatureId: string | null = null;

  for (const f of doc.features) {
    if (f.suppressed) continue;
    if (!f.visible) continue;

    const { entry, newBody, newHash } = stepFeature(doc, f, currentBody, prevHash);
    if (entry) {
      // CRÍTICO: reseta isFinal antes de registrar. Como o cache compartilha
      // o mesmo objeto entre runs, um isFinal=true antigo poderia "vazar" e
      // fazer features intermediárias serem renderizadas em vez da última.
      entry.isFinal = false;
      result.set(f.id, entry);
      if (newBody) lastBodyFeatureId = f.id;
    }
    if (newBody) currentBody = newBody;
    prevHash = newHash;
  }

  // marca o último corpo da chain como "isFinal" — o ModelScene usa esse marker
  if (lastBodyFeatureId) {
    const last = result.get(lastBodyFeatureId);
    if (last) last.isFinal = true;
  }

  return result;
}

interface StepResult {
  entry: EvalEntry | null;
  newBody: THREE.BufferGeometry | null;
  newHash: string;
}

function stepFeature(
  doc: CADDocument,
  f: Feature,
  currentBody: THREE.BufferGeometry | null,
  prevHash: string,
): StepResult {
  switch (f.type) {
    case 'sketch':
      // sketches não modificam corpo nem têm representação 3D
      return { entry: null, newBody: currentBody, newHash: prevHash };

    case 'primitive': {
      // Primitivas são STANDALONE — não entram no chain de corpo. Cada uma
      // existe como entidade independente, com geometria + cor próprias.
      // ModelScene renderiza cada uma separadamente.
      //
      // Preço: cuts/patterns/mirrors que operam sobre currentBody não afetam
      // primitivas. Benefício: cor própria, clicável, não some por bug de
      // union, UX "plug-and-play" tipo Tinkercad.
      const params = f.parameters as unknown as PrimitiveParams;
      const h = hashFeature(f, '', prevHash);
      const cached = cache.get(f.id);
      if (cached && cached.hash === h) {
        // newBody preserva currentBody — não propaga primitiva pro chain
        return { entry: cached.entry, newBody: currentBody, newHash: h };
      }

      const { geometry, error } = evaluatePrimitive(params);
      const entry: EvalEntry = {
        geometry: geometry ?? new THREE.BufferGeometry(),
        error,
      };
      cache.set(f.id, { hash: h, entry });
      return { entry, newBody: currentBody, newHash: h };
    }

    case 'revolve':
    case 'cut-revolve': {
      const params = f.parameters as unknown as RevolveParams;
      const sketch = doc.sketches[params.sketchId];
      if (!sketch) {
        return {
          entry: makeErrorEntry(`Sketch ${params.sketchId} não encontrado.`),
          newBody: currentBody,
          newHash: prevHash + '|err',
        };
      }
      const sketchHash = hashSketch(doc, params.sketchId);
      const h = hashFeature(f, sketchHash, prevHash);
      const cached = cache.get(f.id);
      if (cached && cached.hash === h) {
        return { entry: cached.entry, newBody: cached.entry.geometry, newHash: h };
      }

      const { geometry, error, warning } = evaluateRevolve(sketch, params);
      if (!geometry) {
        const entry = { geometry: new THREE.BufferGeometry(), error };
        cache.set(f.id, { hash: h, entry });
        return { entry, newBody: currentBody, newHash: h };
      }

      // Safety: revolve com eixo horizontal pode produzir corpo que desce
      // abaixo da grid (parte do raio fica em y<0). Levantamos a geometria
      // pra encostar em y=0 ANTES do boolean — assim o resultado fica acima
      // do grid mesmo em casos complexos.
      liftAboveGrid(geometry);

      let combined: THREE.BufferGeometry;
      let comboError: string | null = warning ?? null;
      if (f.type === 'cut-revolve') {
        if (!currentBody) {
          const entry: EvalEntry = {
            geometry: new THREE.BufferGeometry(),
            error: 'CUT-REVOLVE precisa de um corpo existente para subtrair.',
          };
          cache.set(f.id, { hash: h, entry });
          return { entry, newBody: currentBody, newHash: h };
        }
        try {
          combined = booleanGeometries(currentBody, geometry, 'subtract');
          if (!hasGeometry(combined)) {
            comboError = 'CUT-REVOLVE retornou geometria vazia (perfil não tocou o corpo?).';
            combined = currentBody;
          }
        } catch (err) {
          comboError = `Boolean subtract falhou: ${err instanceof Error ? err.message : String(err)}`;
          combined = currentBody;
        }
      } else {
        // revolve normal: união com fallback
        if (!currentBody) {
          combined = geometry;
        } else {
          combined = combineOrMerge(currentBody, geometry, (w) => {
            comboError = w;
          });
        }
      }

      combined.computeVertexNormals();
      combined.computeBoundingSphere();

      const entry: EvalEntry = { geometry: combined, error: comboError };
      cache.set(f.id, { hash: h, entry });
      return { entry, newBody: combined, newHash: h };
    }

    case 'extrude':
    case 'cut-extrude': {
      const params = f.parameters as unknown as ExtrudeParams;
      const sketch = doc.sketches[params.sketchId];
      if (!sketch) {
        return {
          entry: makeErrorEntry(`Sketch ${params.sketchId} não encontrado.`),
          newBody: currentBody,
          newHash: prevHash + '|err',
        };
      }

      const sketchHash = hashSketch(doc, params.sketchId);
      const h = hashFeature(f, sketchHash, prevHash);

      const cached = cache.get(f.id);
      if (cached && cached.hash === h) {
        return { entry: cached.entry, newBody: cached.entry.geometry, newHash: h };
      }

      const { geometry, error, loopsFound, holesFound, droppedCount, droppedReasons } =
        evaluateExtrude(sketch, params);
      if (!geometry) {
        const entry = {
          geometry: new THREE.BufferGeometry(),
          error,
          loopsFound,
          holesFound,
          droppedCount,
          droppedReasons,
        };
        cache.set(f.id, { hash: h, entry });
        return { entry, newBody: currentBody, newHash: h };
      }

      // Safety: se a extrusão (mesmo "reverso" em algum plano) caiu abaixo
      // da grid, levantamos pra encostar em y=0. Cut-extrude também ganha
      // o tratamento — corte que sai pelo chão fica encostado nele.
      liftAboveGrid(geometry);

      // combina com o corpo atual via boolean (com fallback safe-merge p/ union)
      let combined: THREE.BufferGeometry;
      let comboError: string | null = null;
      if (f.type === 'extrude') {
        if (!currentBody) {
          combined = geometry;
        } else {
          combined = combineOrMerge(currentBody, geometry, (w) => {
            comboError = w;
          });
        }
      } else {
        // cut-extrude
        if (!currentBody) {
          comboError = 'CUT-EXTRUDE precisa de um corpo existente para subtrair.';
          const entry: EvalEntry = {
            geometry: new THREE.BufferGeometry(),
            error: comboError,
            loopsFound,
            holesFound,
            droppedCount,
            droppedReasons,
          };
          cache.set(f.id, { hash: h, entry });
          return { entry, newBody: currentBody, newHash: h };
        }
        try {
          combined = booleanGeometries(currentBody, geometry, 'subtract');
          if (!hasGeometry(combined)) {
            comboError = 'CUT-EXTRUDE retornou geometria vazia (corte fora do corpo?).';
            combined = currentBody;
          }
        } catch (err) {
          comboError = `Boolean subtract falhou: ${err instanceof Error ? err.message : String(err)}`;
          combined = currentBody;
        }
      }

      combined.computeVertexNormals();
      combined.computeBoundingSphere();

      const entry: EvalEntry = {
        geometry: combined,
        error: comboError ?? error,
        loopsFound,
        holesFound,
        droppedCount,
        droppedReasons,
      };
      cache.set(f.id, { hash: h, entry });
      return { entry, newBody: combined, newHash: h };
    }

    case 'mirror': {
      const params = f.parameters as unknown as MirrorParams;
      const h = hashFeature(f, '', prevHash);
      const cached = cache.get(f.id);
      if (cached && cached.hash === h) {
        return { entry: cached.entry, newBody: cached.entry.geometry, newHash: h };
      }

      if (!currentBody) {
        const entry: EvalEntry = {
          geometry: new THREE.BufferGeometry(),
          error: 'Mirror precisa de um corpo existente. Crie uma extrusão ou revolve primeiro.',
        };
        cache.set(f.id, { hash: h, entry });
        return { entry, newBody: currentBody, newHash: h };
      }

      const { geometry: mirrored, error: mirrorError } = evaluateMirror(currentBody, params);
      if (!mirrored) {
        const entry: EvalEntry = { geometry: currentBody, error: mirrorError };
        cache.set(f.id, { hash: h, entry });
        return { entry, newBody: currentBody, newHash: h };
      }

      let combined: THREE.BufferGeometry;
      let comboError: string | null = null;
      try {
        combined = params.keepOriginal !== false
          ? booleanGeometries(currentBody, mirrored, 'union')
          : mirrored;
      } catch (err) {
        comboError = `Mirror union falhou: ${err instanceof Error ? err.message : String(err)}`;
        combined = currentBody;
      }
      combined.computeVertexNormals();
      combined.computeBoundingSphere();

      const entry: EvalEntry = { geometry: combined, error: comboError };
      cache.set(f.id, { hash: h, entry });
      return { entry, newBody: combined, newHash: h };
    }

    case 'hole': {
      const params = f.parameters as unknown as HoleParams;
      const h = hashFeature(f, '', prevHash);
      const cached = cache.get(f.id);
      if (cached && cached.hash === h) {
        return { entry: cached.entry, newBody: cached.entry.geometry, newHash: h };
      }

      if (!currentBody) {
        const entry: EvalEntry = {
          geometry: new THREE.BufferGeometry(),
          error: 'Furo precisa de um corpo existente para perfurar.',
        };
        cache.set(f.id, { hash: h, entry });
        return { entry, newBody: currentBody, newHash: h };
      }

      const { geometry: tool, error: toolError } = evaluateHole(params);
      if (!tool) {
        const entry: EvalEntry = { geometry: currentBody, error: toolError };
        cache.set(f.id, { hash: h, entry });
        return { entry, newBody: currentBody, newHash: h };
      }

      let combined: THREE.BufferGeometry;
      let comboError: string | null = null;
      try {
        combined = booleanGeometries(currentBody, tool, 'subtract');
      } catch (err) {
        comboError = `Furo (boolean) falhou: ${err instanceof Error ? err.message : String(err)}`;
        combined = currentBody;
      }
      combined.computeVertexNormals();
      combined.computeBoundingSphere();

      const entry: EvalEntry = { geometry: combined, error: comboError };
      cache.set(f.id, { hash: h, entry });
      return { entry, newBody: combined, newHash: h };
    }

    case 'pattern-linear':
    case 'pattern-circular': {
      const h = hashFeature(f, '', prevHash);
      const cached = cache.get(f.id);
      if (cached && cached.hash === h) {
        return { entry: cached.entry, newBody: cached.entry.geometry, newHash: h };
      }

      if (!currentBody) {
        const entry: EvalEntry = {
          geometry: new THREE.BufferGeometry(),
          error: 'Padrão precisa de um corpo existente.',
        };
        cache.set(f.id, { hash: h, entry });
        return { entry, newBody: currentBody, newHash: h };
      }

      const { copies, error: patternError } =
        f.type === 'pattern-linear'
          ? evaluatePatternLinear(currentBody, f.parameters as unknown as PatternLinearParams)
          : evaluatePatternCircular(
              currentBody,
              f.parameters as unknown as PatternCircularParams,
            );

      let combined: THREE.BufferGeometry = currentBody;
      let comboError: string | null = patternError;
      try {
        for (const copy of copies) {
          combined = booleanGeometries(combined, copy, 'union');
        }
      } catch (err) {
        comboError = `Padrão union falhou: ${err instanceof Error ? err.message : String(err)}`;
        combined = currentBody;
      }
      combined.computeVertexNormals();
      combined.computeBoundingSphere();

      const entry: EvalEntry = { geometry: combined, error: comboError };
      cache.set(f.id, { hash: h, entry });
      return { entry, newBody: combined, newHash: h };
    }

    default:
      return { entry: null, newBody: currentBody, newHash: prevHash };
  }
}

function makeErrorEntry(msg: string): EvalEntry {
  return { geometry: new THREE.BufferGeometry(), error: msg };
}

/**
 * Combina A e B inteligentemente:
 *  1. Se as bboxes são DISJUNTAS → safeMerge direto (rápido, bulletproof)
 *  2. Se SE SOBREPÕEM → tenta boolean union
 *  3. Se boolean falhar ou suspeita-se que B foi "engolido" → safeMerge
 */
function combineOrMerge(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
  onWarn: (msg: string) => void,
): THREE.BufferGeometry {
  if (!bboxesOverlap(a, b)) {
    return safeMerge(a, b);
  }
  try {
    const result = booleanGeometries(a, b, 'union');
    if (!hasGeometry(result)) {
      onWarn('Boolean union retornou geometria vazia; usando merge simples.');
      return safeMerge(a, b);
    }
    if (looksTooSmall(result, a, b)) {
      onWarn('Boolean union parece ter perdido geometria; usando merge simples.');
      return safeMerge(a, b);
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      const merged = safeMerge(a, b);
      onWarn(`Boolean union falhou (${msg}); usando merge simples.`);
      return merged;
    } catch {
      onWarn(`Boolean union e merge falharam: ${msg}`);
      return a;
    }
  }
}

function bboxesOverlap(a: THREE.BufferGeometry, b: THREE.BufferGeometry): boolean {
  a.computeBoundingBox();
  b.computeBoundingBox();
  const ba = a.boundingBox;
  const bb = b.boundingBox;
  if (!ba || !bb) return true; // sem bbox, assume overlap (boolean é mais seguro)
  return (
    ba.max.x >= bb.min.x &&
    ba.min.x <= bb.max.x &&
    ba.max.y >= bb.min.y &&
    ba.min.y <= bb.max.y &&
    ba.max.z >= bb.min.z &&
    ba.min.z <= bb.max.z
  );
}

/**
 * Heurística: se o bbox do resultado é muito menor que o bbox combinado
 * de A+B, provável que o boolean perdeu uma das peças.
 */
function looksTooSmall(
  result: THREE.BufferGeometry,
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
): boolean {
  result.computeBoundingBox();
  a.computeBoundingBox();
  b.computeBoundingBox();
  const br = result.boundingBox;
  const ba = a.boundingBox;
  const bb = b.boundingBox;
  if (!br || !ba || !bb) return false;

  // diagonal do bbox do resultado vs união A+B
  const combinedMin = new THREE.Vector3(
    Math.min(ba.min.x, bb.min.x),
    Math.min(ba.min.y, bb.min.y),
    Math.min(ba.min.z, bb.min.z),
  );
  const combinedMax = new THREE.Vector3(
    Math.max(ba.max.x, bb.max.x),
    Math.max(ba.max.y, bb.max.y),
    Math.max(ba.max.z, bb.max.z),
  );
  const expectedDiag = combinedMax.distanceTo(combinedMin);
  const actualDiag = br.max.distanceTo(br.min);
  // se o resultado tem menos de 80% da diagonal esperada, suspeito
  return actualDiag < expectedDiag * 0.8;
}

/**
 * Se a geometria tem bbox.min.y < 0, translada pra cima de modo que minY=0.
 * Usado como safety net pra não deixar peças cruzarem a grid em casos onde
 * o esboço/feature gera Y negativo (ex: revolve com eixo horizontal).
 */
function liftAboveGrid(geom: THREE.BufferGeometry): void {
  geom.computeBoundingBox();
  const bbox = geom.boundingBox;
  if (bbox && bbox.min.y < -0.001) {
    geom.translate(0, -bbox.min.y, 0);
    geom.computeBoundingBox();
  }
}

export function clearEvaluatorCache(): void {
  cache.clear();
}

export function getEvalDiagnostic(featureId: string): EvalEntry | undefined {
  return cache.get(featureId)?.entry;
}
