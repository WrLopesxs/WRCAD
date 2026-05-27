/**
 * src/domain/types.ts
 * Tipos centrais do WRCAD — a "constituição" do projeto.
 * Todo código novo deve referenciar tipos daqui, nunca redefinir.
 * Inspirado: AutoCAD (Layer, Block), SolidWorks (Feature, Sketch, Mate), CATIA (Specification Tree).
 */

// ===== Identificadores =====
export type ID = string; // gerado via nanoid()

// ===== Vetores e matrizes =====
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
// prettier-ignore
export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

// ===== Planos de referência (SolidWorks/CATIA-like) =====
export type RefPlane = 'XY' | 'YZ' | 'XZ' | ID; // string literal ou plano customizado por ID

// ===== Unidades =====
export type Unit = 'mm' | 'cm' | 'm' | 'in';

// ===== Camadas (AutoCAD-like) =====
export type LineType = 'continuous' | 'dashed' | 'hidden' | 'center' | 'phantom';

export interface Layer {
  id: ID;
  name: string;
  color: string; // "#RRGGBB"
  lineType: LineType;
  lineWeight: number; // mm
  visible: boolean;
  locked: boolean;
  plot: boolean;
}

// ===== Esboço 2D (SolidWorks-like) =====
export type SketchEntityType = 'line' | 'circle' | 'arc' | 'rect' | 'spline' | 'point';

export interface SketchEntity {
  id: ID;
  type: SketchEntityType;
  points: Vec2[]; // pontos definidores no espaço local do plano de esboço
  construction: boolean;
  layerId: ID;
}

export type ConstraintType =
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'concentric'
  | 'equal'
  | 'fix'
  | 'midpoint'
  | 'symmetric'
  | 'distance'
  | 'angle'
  | 'radius';

export interface Constraint {
  id: ID;
  type: ConstraintType;
  entities: ID[];
  value?: number; // para distance/angle/radius
}

export interface Sketch {
  id: ID;
  name: string;
  plane: RefPlane;
  entities: SketchEntity[];
  constraints: Constraint[];
  fullyConstrained: boolean; // calculado pelo solver
}

// ===== Features (operações na árvore — SolidWorks/CATIA) =====
export type FeatureType =
  | 'sketch'
  | 'extrude'
  | 'revolve'
  | 'sweep'
  | 'loft'
  | 'cut-extrude'
  | 'cut-revolve'
  | 'cut-sweep'
  | 'cut-loft'
  | 'fillet'
  | 'chamfer'
  | 'shell'
  | 'draft'
  | 'rib'
  | 'hole'
  | 'thread'
  | 'pattern-linear'
  | 'pattern-circular'
  | 'mirror'
  | 'boolean-union'
  | 'boolean-subtract'
  | 'boolean-intersect'
  | 'primitive'
  | 'imported';

export interface Feature {
  id: ID;
  type: FeatureType;
  name: string; // editável pelo usuário
  parameters: Record<string, unknown>;
  inputs: ID[]; // sketches ou outras features que alimentam
  suppressed: boolean;
  errored: boolean;
  layerId?: ID;
  visible: boolean;
}

// Parâmetros tipados por feature (referência, não exaustivo)
export type ExtrudeRimStyle = 'sharp' | 'chamfer' | 'fillet';

export interface ExtrudeParams {
  sketchId: ID;
  distance: number;
  direction: 'normal' | 'reverse' | 'both' | 'midplane';
  draftAngle?: number;
  endCondition: 'blind' | 'through-all' | 'up-to-vertex' | 'up-to-surface' | 'offset-from-surface';
  /** Estilo das arestas do topo/base: sharp (canto vivo), chamfer (chanfro reto) ou fillet (arredondado). Default 'sharp'. */
  rimStyle?: ExtrudeRimStyle;
  /** Tamanho do chanfro/filete em mm. Só relevante se rimStyle != 'sharp'. */
  rimSize?: number;
}

export interface RevolveParams {
  sketchId: ID;
  axisId: ID;
  angle: number; // 0..360
  direction: 'normal' | 'reverse' | 'both';
}

export interface FilletParams {
  edges: ID[];
  radius: number;
  variableRadius?: Array<{ edgeId: ID; radius: number }>;
}

export interface PatternLinearParams {
  /** Eixo da direção do padrão (X, Y ou Z do mundo). */
  axis: 'X' | 'Y' | 'Z';
  /** Sinal: +1 (positivo) ou -1 (negativo). */
  sign: 1 | -1;
  /** Total de instâncias incluindo a original. >= 2. */
  count: number;
  /** Distância entre instâncias consecutivas (mm). */
  spacing: number;
}

export interface MirrorParams {
  /** Plano de espelhamento. */
  plane: 'XY' | 'YZ' | 'XZ';
  /** Se verdadeiro, mantém o original e adiciona o espelho (union).
   *  Se falso, substitui pelo espelho. Default true. */
  keepOriginal?: boolean;
}

export interface PatternCircularParams {
  /** Eixo de rotação (X/Y/Z do mundo, passando pela origem). */
  axis: 'X' | 'Y' | 'Z';
  /** Total de instâncias (incluindo a original). >= 2. */
  count: number;
  /** Ângulo total varrido pelas instâncias (graus). 360 = distribuição uniforme em circunferência. */
  totalAngle: number;
}

export type PrimitiveShape = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';

export interface PrimitiveParams {
  /** Forma da primitiva. */
  shape: PrimitiveShape;
  /** Posição da BASE da primitiva no mundo (Y=0 = sobre a grid). */
  position: Vec3;
  /** Rotação em graus em torno de Y (giro horizontal). Útil pra orientar caixas. */
  rotationY?: number;

  // ----- Dimensões (uso depende do shape) -----
  /** box: largura X. */
  width?: number;
  /** box: profundidade Z. */
  depth?: number;
  /** box, cylinder, cone: altura Y. */
  height?: number;
  /** cylinder (raio), sphere (raio), cone (raio da base), torus (raio principal). */
  radius?: number;
  /** cone: raio do topo (0 = ponta perfeita; >0 = tronco de cone). */
  radiusTop?: number;
  /** torus: raio do tubo (espessura do anel). */
  tubeRadius?: number;
  /** Segmentos radiais — qualidade da curva (default por shape). */
  segments?: number;
  /** Cor da primitiva em hex (#RRGGBB). Default cinza neutro. */
  color?: string;
}

export type HoleType = 'through' | 'blind' | 'counterbore' | 'countersink';

export interface HoleParams {
  /** Tipo do furo. */
  type: HoleType;
  /** Posição XYZ no mundo (centro do TOPO do furo — onde ele "entra" na peça). */
  position: Vec3;
  /** Eixo do furo (direção que ele desce). Padrão -Y (entra pelo topo). */
  axis: 'X' | '-X' | 'Y' | '-Y' | 'Z' | '-Z';
  /** Diâmetro principal (mm). */
  diameter: number;
  /** Profundidade do furo principal (mm). Para 'through', valor é ignorado. */
  depth: number;
  /** Diâmetro do escareado/rebaixo (mm). Só usado em counterbore/countersink. */
  headDiameter?: number;
  /** Profundidade do rebaixo (counterbore) ou ângulo (countersink) (mm/graus). */
  headDepth?: number;
}

// ===== Blocos (AutoCAD-like) =====
export interface BlockAttribute {
  tag: string; // ex: "REF", "QTY"
  defaultValue: string;
  promptText: string;
}

export interface Block {
  id: ID;
  name: string;
  entities: SketchEntity[];
  attributes: BlockAttribute[];
  insertionPoint: Vec3;
}

export interface BlockInstance {
  id: ID;
  blockId: ID;
  position: Vec3;
  rotation: number;
  scale: Vec3;
  attributeValues: Record<string, string>;
  layerId: ID;
}

// ===== Montagem (SolidWorks/CATIA-like) =====
export interface AssemblyComponent {
  id: ID;
  documentRef: ID; // qual documento (.part) representa
  position: Vec3;
  rotation: Vec3; // Euler XYZ
  fixed: boolean;
  visible: boolean;
}

export type MateType =
  | 'coincident'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'concentric'
  | 'lock'
  | 'distance'
  | 'angle'
  // mecânicos:
  | 'gear'
  | 'rack-pinion'
  | 'screw'
  | 'cam'
  | 'hinge'
  | 'slot';

export interface Mate {
  id: ID;
  type: MateType;
  components: [ID, ID];
  entities: [string, string];
  parameters?: Record<string, unknown>;
}

// ===== Anotação (cotagem) =====
export type DimensionType = 'linear' | 'aligned' | 'angular' | 'radius' | 'diameter' | 'arclength';

export interface Dimension {
  id: ID;
  type: DimensionType;
  entities: ID[];
  value: number; // calculado
  override?: string; // texto custom
  position: Vec3;
  layerId: ID;
}

// ===== Documento (peça/montagem/desenho) =====
export type DocumentKind = 'part' | 'assembly' | 'drawing';

export interface DocumentMetadata {
  author: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  revision: string;
}

export interface CADDocument {
  id: ID;
  name: string;
  kind: DocumentKind;
  units: Unit;
  features: Feature[]; // ordem importa (cronológica)
  sketches: Record<ID, Sketch>;
  layers: Layer[];
  components?: AssemblyComponent[];
  mates?: Mate[];
  blocks?: Block[];
  dimensions?: Dimension[];
  metadata: DocumentMetadata;
}

// ===== Snap (engine) =====
export type SnapType =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'intersection'
  | 'perpendicular'
  | 'tangent'
  | 'grid'
  | 'nearest';

export interface SnapHit {
  point: Vec2; // coordenadas no plano local do esboço
  type: SnapType;
  distance: number;
  source?: ID;
}

// ===== Seleção =====
export type SelectionMode = 'face' | 'edge' | 'vertex' | 'body' | 'feature';

// ===== UI =====
export type RibbonTab = 'home' | 'sketch' | 'modeling' | 'assembly' | 'annotate' | 'view';

export type ViewStyle = 'wireframe' | 'shaded' | 'shaded-edges' | 'hidden' | 'realistic';

export type Theme = 'dark' | 'light';

export interface SnapToggles {
  endpoint: boolean;
  midpoint: boolean;
  center: boolean;
  intersection: boolean;
  perpendicular: boolean;
  tangent: boolean;
  nearest: boolean;
  grid: boolean;
  ortho: boolean;
  polar: boolean;
}

export interface PanelVisibility {
  featureTree: boolean;
  properties: boolean;
  commandLine: boolean;
  layers: boolean;
}
