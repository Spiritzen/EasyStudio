/**
 * @file uiStore.ts
 * @description Store Zustand gérant les préférences d'interface utilisateur :
 * visibilité de la grille, des règles et de la modale des raccourcis clavier.
 * @module store/uiStore
 */

import { create } from 'zustand';

/**
 * @interface UIStore
 * @description État et actions du store UI : grille, règles et modale des raccourcis.
 */
interface UIStore {
  showGrid: boolean;
  showRulers: boolean;
  showShortcutsModal: boolean;
  toggleGrid: () => void;
  toggleRulers: () => void;
  setShortcutsModal: (v: boolean) => void;
}

/**
 * Hook Zustand exposant les préférences d'interface utilisateur.
 * @returns L'état du store UI (showGrid, showRulers, showShortcutsModal).
 */
export const useUIStore = create<UIStore>((set) => ({
  showGrid: false,
  showRulers: false,
  showShortcutsModal: false,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  setShortcutsModal: (v) => set({ showShortcutsModal: v }),
}));
