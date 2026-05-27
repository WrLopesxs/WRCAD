/**
 * src/state/selectionStore.ts
 * O que está selecionado/hover no viewport ou na árvore.
 */
import { create } from 'zustand';
import type { ID, SelectionMode } from '@/domain/types';

interface SelectionState {
  selectedIds: ID[];
  hovered: ID | null;
  selectionMode: SelectionMode;

  select: (ids: ID[]) => void;
  toggleSelect: (id: ID) => void;
  setHovered: (id: ID | null) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: [],
  hovered: null,
  selectionMode: 'feature',

  select: (ids) => set({ selectedIds: ids }),
  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  setHovered: (id) => set({ hovered: id }),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  clear: () => set({ selectedIds: [], hovered: null }),
}));
