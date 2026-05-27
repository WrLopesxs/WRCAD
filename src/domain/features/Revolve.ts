/**
 * src/domain/features/Revolve.ts
 * Avalia uma revolução: pega o sketch, encontra UMA linha de construção como
 * eixo, projeta o perfil (resto das entidades) em coordenadas (raio, altura)
 * relativas ao eixo, gera LatheGeometry, e transforma para coordenadas mundiais.
 *
 * Detalhe da matemática:
 *  - Em 2D do plano: axisDir = normalize(axisB - axisA), axisPerp = (axisDir.y, -axisDir.x)
 *    (perpendicular escolhida para que axisPerp × axisDir = +normalDoPlano, regra da mão direita).
 *  - Para cada ponto P do perfil:
 *      relP = P - axisA
 *      height = relP · axisDir   (posição ao longo do eixo)
 *      signedRadius = relP · axisPerp
 *      latheRadius = |signedRadius|  (LatheGeometry exige raio >= 0)
 *  - Se o perfil cruzar o eixo (mistura de sinais em signedRadius), reportamos warning.
 *  - LatheGeometry revolve no eixo Y local. Aplicamos Matrix4.makeBasis para
 *    mapear (X, Y, Z) local → (axisPerpWorld, axisDirWorld, normalDoPlano).
 *  - Trasladamos para a origem do eixo no mundo.
 */
import * as THREE from 'three';
import type { Sketch, SketchEntity, Vec2 } from '@/domain/types';
import { getPlaneBasis } from '@/engine/sketchPlane';
import { sketchToShape } from '@/engine/sketchToShape';

export interface RevolveParams {
  sketchId: string;
  angle: number; // 0..360, em graus
  direction: 'normal' | 'reverse' | 'midplane' | 'both';
}

export interface RevolveResult {
  geometry: THREE.BufferGeometry | null;
  error: string | null;
  warning?: string;
}

export function evaluateRevolve(sketch: Sketch, p: RevolveParams): RevolveResult {
  try {
    // 1. axis = primeira linha de construção
    const axisEntity = sketch.entities.find(
      (e) => e.type === 'line' && e.construction && e.points.length === 2,
    );
    if (!axisEntity) {
      return {
        geometry: null,
        error:
          'Revolução requer uma linha de construção (atalho CL) como eixo no esboço.',
      };
    }

    // 2. perfil = entidades não-construction; usamos sketchToShape para obter
    //    o contorno externo já triangulado/ordenado.
    const profileSketch: Sketch = {
      ...sketch,
      entities: sketch.entities.filter((e) => !e.construction) as SketchEntity[],
    };
    const { shape, error: shapeError } = sketchToShape(profileSketch.entities);
    if (!shape) {
      return { geometry: null, error: shapeError ?? 'Perfil inválido.' };
    }

    // 3. samplear o contorno externo da shape como Vec2[]
    const profilePoints2D = shape.getPoints(64).map((v): Vec2 => [v.x, v.y]);
    if (profilePoints2D.length < 3) {
      return { geometry: null, error: 'Perfil muito pequeno.' };
    }

    // 4. base do eixo em 2D do plano
    const [axisA, axisB] = axisEntity.points;
    const axisVec: Vec2 = [axisB[0] - axisA[0], axisB[1] - axisA[1]];
    const axisLen = Math.hypot(axisVec[0], axisVec[1]);
    if (axisLen < 1e-6) {
      return { geometry: null, error: 'Linha de eixo tem comprimento zero.' };
    }
    const axisDir2D: Vec2 = [axisVec[0] / axisLen, axisVec[1] / axisLen];
    const axisPerp2D: Vec2 = [axisDir2D[1], -axisDir2D[0]];

    // 5. transformar perfil para (raio, altura)
    let hasPositive = false;
    let hasNegative = false;
    const latheProfile: THREE.Vector2[] = profilePoints2D.map((pt) => {
      const rx = pt[0] - axisA[0];
      const ry = pt[1] - axisA[1];
      const height = rx * axisDir2D[0] + ry * axisDir2D[1];
      const signedRadius = rx * axisPerp2D[0] + ry * axisPerp2D[1];
      if (signedRadius > 1e-6) hasPositive = true;
      if (signedRadius < -1e-6) hasNegative = true;
      return new THREE.Vector2(Math.abs(signedRadius), height);
    });

    const warning = hasPositive && hasNegative
      ? 'Perfil cruza o eixo de revolução — o resultado pode ficar irregular. Mantenha o perfil em um único lado.'
      : undefined;

    // 6. LatheGeometry — segments proporcionais ao ângulo. 48 segments em 360°
    //    dá um círculo bem suave; mais que isso só pesa o navegador sem ganho
    //    visual perceptível na maioria das peças CAD.
    const angleDeg = Math.max(1, Math.min(360, p.angle));
    const segments = Math.max(8, Math.ceil((angleDeg / 360) * 48));
    const phiLength = THREE.MathUtils.degToRad(angleDeg);

    const phiStart = computePhiStart(p.direction, phiLength);
    const geom = new THREE.LatheGeometry(latheProfile, segments, phiStart, phiLength);

    // 7. transformar para o mundo
    const basis = getPlaneBasis(sketch.plane);
    const axisDirWorld = new THREE.Vector3()
      .addScaledVector(basis.u, axisDir2D[0])
      .addScaledVector(basis.v, axisDir2D[1])
      .normalize();
    const axisPerpWorld = new THREE.Vector3()
      .addScaledVector(basis.u, axisPerp2D[0])
      .addScaledVector(basis.v, axisPerp2D[1])
      .normalize();
    const zAxisWorld = new THREE.Vector3()
      .crossVectors(axisPerpWorld, axisDirWorld)
      .normalize();

    const matrix = new THREE.Matrix4();
    matrix.makeBasis(axisPerpWorld, axisDirWorld, zAxisWorld);

    const axisOriginWorld = new THREE.Vector3()
      .addScaledVector(basis.u, axisA[0])
      .addScaledVector(basis.v, axisA[1])
      .add(basis.origin);
    matrix.setPosition(axisOriginWorld);

    geom.applyMatrix4(matrix);
    geom.computeVertexNormals();
    geom.computeBoundingSphere();

    return { geometry: geom, error: null, warning };
  } catch (err) {
    return {
      geometry: null,
      error: `Revolução falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function computePhiStart(direction: RevolveParams['direction'], phiLength: number): number {
  switch (direction) {
    case 'normal':
      return 0;
    case 'reverse':
      return -phiLength;
    case 'midplane':
      return -phiLength / 2;
    case 'both':
      // both = duas vezes em ambas as direções; LatheGeometry não combina sentidos,
      // tratamos como midplane com ângulo dobrado (clampado em 360)
      return -phiLength / 2;
  }
}

export function defaultRevolveParams(sketchId: string): RevolveParams {
  return {
    sketchId,
    angle: 360,
    direction: 'normal',
  };
}
