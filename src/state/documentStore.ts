/**
 * src/state/documentStore.ts
 * Estado do documento ativo: features, sketches, layers, montagem.
 * Equivalente ao .sldprt / .CATPart — é o coração do app.
 * Undo/redo automático via zundo (temporal middleware).
 */
import { create } from 'zustand';
import { temporal } from 'zundo';
import type {
  CADDocument,
  Feature,
  Sketch,
  Layer,
  ID,
  DocumentKind,
} from '@/domain/types';
import { newId } from '@/utils/ids';

const DEFAULT_LAYER_ID = 'layer-default';

function createDefaultLayer(): Layer {
  return {
    id: DEFAULT_LAYER_ID,
    name: '0',
    color: '#ffffff',
    lineType: 'continuous',
    lineWeight: 0.25,
    visible: true,
    locked: false,
    plot: true,
  };
}

export function createEmptyDocument(kind: DocumentKind = 'part'): CADDocument {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: kind === 'part' ? 'Nova Peça' : kind === 'assembly' ? 'Nova Montagem' : 'Novo Desenho',
    kind,
    units: 'mm',
    features: [],
    sketches: {},
    layers: [createDefaultLayer()],
    metadata: {
      author: 'WR Solution',
      createdAt: now,
      updatedAt: now,
      revision: 'A',
    },
  };
}

interface DocumentState {
  doc: CADDocument;
  activeLayerId: ID;

  // features
  addFeature: (feature: Feature) => void;
  updateFeature: (id: ID, patch: Partial<Feature>) => void;
  removeFeature: (id: ID) => void;
  reorderFeature: (id: ID, newIndex: number) => void;
  suppressFeature: (id: ID, suppress: boolean) => void;
  renameFeature: (id: ID, name: string) => void;

  // sketches
  addSketch: (sketch: Sketch) => void;
  updateSketch: (id: ID, patch: Partial<Sketch>) => void;
  removeSketch: (id: ID) => void;

  // layers
  addLayer: (layer: Layer) => void;
  updateLayer: (id: ID, patch: Partial<Layer>) => void;
  removeLayer: (id: ID) => void;
  setActiveLayer: (id: ID) => void;

  // ciclo de vida
  newDocument: (kind: DocumentKind) => void;
  loadDocument: (doc: CADDocument) => void;
  saveAsJSON: () => string;
}

const touch = (doc: CADDocument): CADDocument => ({
  ...doc,
  metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
});

export const useDocumentStore = create<DocumentState>()(
  temporal(
    (set, get) => ({
      doc: createEmptyDocument('part'),
      activeLayerId: DEFAULT_LAYER_ID,

      addFeature: (feature) =>
        set((s) => ({ doc: touch({ ...s.doc, features: [...s.doc.features, feature] }) })),

      updateFeature: (id, patch) =>
        set((s) => ({
          doc: touch({
            ...s.doc,
            features: s.doc.features.map((f) => (f.id === id ? { ...f, ...patch } : f)),
          }),
        })),

      removeFeature: (id) =>
        set((s) => ({
          doc: touch({ ...s.doc, features: s.doc.features.filter((f) => f.id !== id) }),
        })),

      reorderFeature: (id, newIndex) =>
        set((s) => {
          const list = [...s.doc.features];
          const idx = list.findIndex((f) => f.id === id);
          if (idx < 0) return s;
          const [item] = list.splice(idx, 1);
          list.splice(newIndex, 0, item);
          return { doc: touch({ ...s.doc, features: list }) };
        }),

      suppressFeature: (id, suppress) =>
        set((s) => ({
          doc: touch({
            ...s.doc,
            features: s.doc.features.map((f) =>
              f.id === id ? { ...f, suppressed: suppress } : f,
            ),
          }),
        })),

      renameFeature: (id, name) =>
        set((s) => ({
          doc: touch({
            ...s.doc,
            features: s.doc.features.map((f) => (f.id === id ? { ...f, name } : f)),
          }),
        })),

      addSketch: (sketch) =>
        set((s) => ({
          doc: touch({ ...s.doc, sketches: { ...s.doc.sketches, [sketch.id]: sketch } }),
        })),

      updateSketch: (id, patch) =>
        set((s) => {
          const existing = s.doc.sketches[id];
          if (!existing) return s;
          return {
            doc: touch({
              ...s.doc,
              sketches: { ...s.doc.sketches, [id]: { ...existing, ...patch } },
            }),
          };
        }),

      removeSketch: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.doc.sketches;
          return { doc: touch({ ...s.doc, sketches: rest }) };
        }),

      addLayer: (layer) =>
        set((s) => ({ doc: touch({ ...s.doc, layers: [...s.doc.layers, layer] }) })),

      updateLayer: (id, patch) =>
        set((s) => ({
          doc: touch({
            ...s.doc,
            layers: s.doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          }),
        })),

      removeLayer: (id) =>
        set((s) => {
          if (id === DEFAULT_LAYER_ID) return s; // não permite remover a camada 0
          return {
            doc: touch({ ...s.doc, layers: s.doc.layers.filter((l) => l.id !== id) }),
            activeLayerId: s.activeLayerId === id ? DEFAULT_LAYER_ID : s.activeLayerId,
          };
        }),

      setActiveLayer: (id) => set({ activeLayerId: id }),

      newDocument: (kind) =>
        set({ doc: createEmptyDocument(kind), activeLayerId: DEFAULT_LAYER_ID }),

      loadDocument: (doc) =>
        set({ doc, activeLayerId: doc.layers[0]?.id ?? DEFAULT_LAYER_ID }),

      saveAsJSON: () => JSON.stringify(get().doc, null, 2),
    }),
    { limit: 100 },
  ),
);

export const useDocumentHistory = () => useDocumentStore.temporal.getState();
