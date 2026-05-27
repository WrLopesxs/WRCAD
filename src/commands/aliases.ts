/**
 * src/commands/aliases.ts
 * Atalhos curtos para comandos (inspirado no acad.pgp do AutoCAD).
 * Mantenha em ordem alfabética DENTRO de cada bloco para facilitar diff.
 */

export const ALIASES: Record<string, string> = {
  // ----- 2D / esboço -----
  L: 'LINE',
  CL: 'CLINE',
  XL: 'CLINE',
  PL: 'PLINE',
  C: 'CIRCLE',
  A: 'ARC',
  REC: 'RECTANG',
  POL: 'POLYGON',
  EL: 'ELLIPSE',
  SPL: 'SPLINE',
  PO: 'POINT',
  O: 'OFFSET',
  TR: 'TRIM',
  EX: 'EXTEND',
  F: 'FILLET',
  CHA: 'CHAMFER',
  M: 'MOVE',
  CO: 'COPY',
  MI: 'MIRROR',
  RO: 'ROTATE',
  SC: 'SCALE',
  AR: 'ARRAY',
  H: 'HATCH',
  T: 'TEXT',

  // ----- 3D / modelagem -----
  EXT: 'EXTRUDE',
  CE: 'CUT-EXTRUDE',
  HOL: 'HOLE',
  // Primitivas
  BX: 'BOX',
  CYL: 'CYLINDER',
  SPH: 'SPHERE',
  CN: 'CONE',
  TOR: 'TORUS',
  REV: 'REVOLVE',
  CR: 'CUT-REVOLVE',
  MIR: 'MIRROR',
  PL3D: 'PATTERN-LINEAR',
  PC3D: 'PATTERN-CIRCULAR',
  SW: 'SWEEP',
  LO: 'LOFT',
  SH: 'SHELL',
  BO: 'BOOLEAN',

  // ----- Anotação -----
  DI: 'DIMENSION',
  DLI: 'DIMLINEAR',
  DRA: 'DIMRADIUS',
  DDI: 'DIMDIAMETER',

  // ----- Organização / vista -----
  LA: 'LAYER',
  B: 'BLOCK',
  Z: 'ZOOM',
  P: 'PAN',
  V: 'VIEW',
};
