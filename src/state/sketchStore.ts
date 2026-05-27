/**
 * src/state/sketchStore.ts
 * Estado do modo Esboço. Suporta dois fluxos:
 *   - beginSketch(plane)        → criar novo esboço (cliente: PlanePicker)
 *   - beginEditSketch(sk, fid)  → editar esboço existente (cliente: TreeNode)
 *
 * Em modo edição, isEditing=true e editingFeatureId aponta para a feature de
 * tipo 'sketch' que está sendo editada. O finishSketchCommand usa isso para
 * decidir entre criar nova feature ou atualizar a existente.
 */
import { create } from 'zustand';
import type { ID, RefPlane, Sketch, SketchEntity, Constraint, Vec2 } from '@/domain/types';
import { newId } from '@/utils/ids';

export type PreviewKind = 'line' | 'circle' | 'rect' | null;

interface SketchState {
  activeSketchId: ID | null;
  plane: RefPlane | null;
  isEditing: boolean;
  editingFeatureId: ID | null;

  entities: SketchEntity[];
  constraints: Constraint[];

  cursor: Vec2 | null;
  pendingPoints: Vec2[];
  previewKind: PreviewKind;

  beginSketch: (plane: RefPlane) => void;
  beginEditSketch: (sketch: Sketch, featureId: ID) => void;
  exit: () => void;

  setCursor: (p: Vec2 | null) => void;
  pushPendingPoint: (p: Vec2) => void;
  clearPending: () => void;
  setPreviewKind: (k: PreviewKind) => void;

  addEntity: (entity: SketchEntity) => void;
  removeEntity: (id: ID) => void;
  clearEntities: () => void;

  addConstraint: (constraint: Constraint) => void;
  removeConstraint: (id: ID) => void;
}

export const useSketchStore = create<SketchState>((set) => ({
  activeSketchId: null,
  plane: null,
  isEditing: false,
  editingFeatureId: null,
  entities: [],
  constraints: [],
  cursor: null,
  pendingPoints: [],
  previewKind: null,

  beginSketch: (plane) =>
    set({
      activeSketchId: newId(),
      plane,
      isEditing: false,
      editingFeatureId: null,
      entities: [],
      constraints: [],
      cursor: null,
      pendingPoints: [],
      previewKind: null,
    }),

  beginEditSketch: (sketch, featureId) =>
    set({
      activeSketchId: sketch.id,
      plane: sketch.plane,
      isEditing: true,
      editingFeatureId: featureId,
      entities: [...sketch.entities],
      constraints: [...sketch.constraints],
      cursor: null,
      pendingPoints: [],
      previewKind: null,
    }),

  exit: () =>
    set({
      activeSketchId: null,
      plane: null,
      isEditing: false,
      editingFeatureId: null,
      entities: [],
      constraints: [],
      cursor: null,
      pendingPoints: [],
      previewKind: null,
    }),

  setCursor: (p) => set({ cursor: p }),
  pushPendingPoint: (p) => set((s) => ({ pendingPoints: [...s.pendingPoints, p] })),
  clearPending: () => set({ pendingPoints: [] }),
  setPreviewKind: (k) => set({ previewKind: k }),

  addEntity: (entity) => set((s) => ({ entities: [...s.entities, entity] })),
  removeEntity: (id) =>
    set((s) => ({ entities: s.entities.filter((e) => e.id !== id) })),
  clearEntities: () => set({ entities: [] }),

  addConstraint: (constraint) =>
    set((s) => ({ constraints: [...s.constraints, constraint] })),
  removeConstraint: (id) =>
    set((s) => ({ constraints: s.constraints.filter((c) => c.id !== id) })),
}));

export const isSketching = () => useSketchStore.getState().activeSketchId !== null;
