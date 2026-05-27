/**
 * src/commands/registry.ts
 * Mapeia nome canônico → função executora. Comandos de fases ≥ 3 continuam stubs.
 */
import { useCommandStore } from '@/state/commandStore';
import { useSketchStore } from '@/state/sketchStore';
import {
  lineCommand,
  circleCommand,
  rectangCommand,
  clineCommand,
  finishSketchCommand,
} from './sketch';
import {
  extrudeCommand,
  cutExtrudeCommand,
  revolveCommand,
  cutRevolveCommand,
  mirrorCommand,
  patternLinearCommand,
  patternCircularCommand,
  holeCommand,
  boxCommand,
  cylinderCommand,
  sphereCommand,
  coneCommand,
  torusCommand,
} from './modeling';

export type CommandFn = () => void;

const stub = (name: string): CommandFn => () => {
  const cs = useCommandStore.getState();
  cs.log({ text: `[stub] ${name} ainda não implementado (Fase ≥ 3).`, kind: 'info' });
  cs.setPrompt('Comando:');
  cs.setActiveCommand(null);
};

export const COMMANDS: Record<string, CommandFn> = {
  // ----- 2D / esboço (Fase 2) -----
  LINE: lineCommand,
  CIRCLE: circleCommand,
  RECTANG: rectangCommand,
  CLINE: clineCommand,
  'FINISH-SKETCH': finishSketchCommand,

  // stubs (Fase 2+)
  PLINE: stub('PLINE'),
  ARC: stub('ARC'),
  POLYGON: stub('POLYGON'),
  ELLIPSE: stub('ELLIPSE'),
  SPLINE: stub('SPLINE'),
  POINT: stub('POINT'),
  OFFSET: stub('OFFSET'),
  TRIM: stub('TRIM'),
  EXTEND: stub('EXTEND'),
  FILLET: stub('FILLET'),
  CHAMFER: stub('CHAMFER'),
  MOVE: stub('MOVE'),
  COPY: stub('COPY'),
  // MIRROR (3D) é registrado abaixo na seção de modelagem
  ROTATE: stub('ROTATE'),
  SCALE: stub('SCALE'),
  ARRAY: stub('ARRAY'),
  HATCH: stub('HATCH'),
  TEXT: stub('TEXT'),

  // ----- 3D / modelagem (Fase 3+) -----
  EXTRUDE: extrudeCommand,
  'CUT-EXTRUDE': cutExtrudeCommand,
  CUT: cutExtrudeCommand,
  REVOLVE: revolveCommand,
  'CUT-REVOLVE': cutRevolveCommand,
  MIRROR: mirrorCommand,
  'PATTERN-LINEAR': patternLinearCommand,
  'PATTERN-CIRCULAR': patternCircularCommand,
  HOLE: holeCommand,
  // ----- Primitivas (plug-and-play) -----
  BOX: boxCommand,
  CYLINDER: cylinderCommand,
  SPHERE: sphereCommand,
  CONE: coneCommand,
  TORUS: torusCommand,
  SWEEP: stub('SWEEP'),
  LOFT: stub('LOFT'),
  SHELL: stub('SHELL'),
  BOOLEAN: stub('BOOLEAN'),

  // ----- Anotação (Fase 8) -----
  DIMENSION: stub('DIMENSION'),
  DIMLINEAR: stub('DIMLINEAR'),
  DIMRADIUS: stub('DIMRADIUS'),
  DIMDIAMETER: stub('DIMDIAMETER'),

  // ----- Organização / vista -----
  LAYER: stub('LAYER'),
  BLOCK: stub('BLOCK'),
  ZOOM: stub('ZOOM'),
  PAN: stub('PAN'),
  VIEW: stub('VIEW'),

  // ----- Controle -----
  CANCEL: () => {
    const cs = useCommandStore.getState();
    const sk = useSketchStore.getState();
    cs.setOnPoint(null);
    cs.setOnPick(null);
    cs.setActiveCommand(null);
    cs.setPrompt(sk.activeSketchId ? 'Comando (em esboço):' : 'Comando:');
    sk.clearPending();
    sk.setPreviewKind(null);
    cs.log({ text: '*Cancelado*', kind: 'info' });
  },
};
