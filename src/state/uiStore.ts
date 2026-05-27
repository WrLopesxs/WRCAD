/**
 * src/state/uiStore.ts
 * Estado de UI: aba do ribbon ativa, painéis abertos, snaps, tema, estilo de visualização.
 * Pequeno e específico — não enfia state de domínio aqui.
 */
import { create } from 'zustand';
import type { RibbonTab, PanelVisibility, SnapToggles, Theme, ViewStyle } from '@/domain/types';

interface UIState {
  ribbonTab: RibbonTab;
  panels: PanelVisibility;
  snaps: SnapToggles;
  theme: Theme;
  viewStyle: ViewStyle;

  setRibbonTab: (tab: RibbonTab) => void;
  togglePanel: (key: keyof PanelVisibility) => void;
  toggleSnap: (key: keyof SnapToggles) => void;
  setTheme: (theme: Theme) => void;
  setViewStyle: (style: ViewStyle) => void;
}

export const useUIStore = create<UIState>((set) => ({
  ribbonTab: 'home',
  panels: {
    featureTree: true,
    properties: true,
    commandLine: true,
    layers: true,
  },
  snaps: {
    endpoint: true,
    midpoint: true,
    center: true,
    intersection: true,
    perpendicular: false,
    tangent: false,
    nearest: false,
    grid: true,
    ortho: false,
    polar: false,
  },
  theme: 'dark',
  viewStyle: 'shaded-edges',

  setRibbonTab: (tab) => set({ ribbonTab: tab }),
  togglePanel: (key) =>
    set((s) => ({ panels: { ...s.panels, [key]: !s.panels[key] } })),
  toggleSnap: (key) =>
    set((s) => ({ snaps: { ...s.snaps, [key]: !s.snaps[key] } })),
  setTheme: (theme) => set({ theme }),
  setViewStyle: (style) => set({ viewStyle: style }),
}));
