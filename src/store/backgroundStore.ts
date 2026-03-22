/**
 * @file backgroundStore.ts
 * @description Store Zustand gérant la couleur et l'opacité de l'arrière-plan de travail.
 * Cet arrière-plan est uniquement visuel (non exporté) et persiste dans le localStorage.
 * @module store/backgroundStore
 */

import { create } from 'zustand';

const STORAGE_KEY = 'easystudio-background';

/**
 * @interface BackgroundState
 * @description État et actions du store arrière-plan :
 * couleur, opacité et mode transparent, avec persistance automatique.
 */
interface BackgroundState {
  bgColor: string;
  bgOpacity: number;       // 0–100
  bgTransparent: boolean;

  setBgColor: (color: string) => void;
  setBgOpacity: (opacity: number) => void;
  setBgTransparent: (transparent: boolean) => void;
  resetBackground: () => void;
}

const DEFAULT_COLOR = '#2a2a3a';
const DEFAULT_OPACITY = 100;

/**
 * Charge les préférences d'arrière-plan depuis le localStorage.
 * @returns Les valeurs persistées ou un objet vide si aucune donnée.
 */
function load(): Partial<BackgroundState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<BackgroundState>;
  } catch {
    return {};
  }
}

/**
 * Sauvegarde les préférences d'arrière-plan dans le localStorage.
 * @param state - Sous-ensemble de BackgroundState à persister.
 */
function save(state: Partial<BackgroundState>) {
  try {
    const { bgColor, bgOpacity, bgTransparent } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bgColor, bgOpacity, bgTransparent }));
  } catch { /* ignore */ }
}

const persisted = load();

/**
 * Hook Zustand exposant l'arrière-plan de travail du canvas.
 * Les modifications sont automatiquement persistées dans le localStorage.
 * @returns L'état du store arrière-plan (couleur, opacité, transparent).
 */
export const useBackgroundStore = create<BackgroundState>((set) => ({
  bgColor: persisted.bgColor ?? DEFAULT_COLOR,
  bgOpacity: persisted.bgOpacity ?? DEFAULT_OPACITY,
  bgTransparent: persisted.bgTransparent ?? false,

  setBgColor: (color) =>
    set((s) => {
      const next = { ...s, bgColor: color, bgTransparent: false };
      save(next);
      return { bgColor: color, bgTransparent: false };
    }),

  setBgOpacity: (opacity) =>
    set((s) => {
      const next = { ...s, bgOpacity: opacity };
      save(next);
      return { bgOpacity: opacity };
    }),

  setBgTransparent: (transparent) =>
    set((s) => {
      const next = { ...s, bgTransparent: transparent };
      save(next);
      return { bgTransparent: transparent };
    }),

  resetBackground: () => {
    save({ bgColor: DEFAULT_COLOR, bgOpacity: DEFAULT_OPACITY, bgTransparent: false });
    set({ bgColor: DEFAULT_COLOR, bgOpacity: DEFAULT_OPACITY, bgTransparent: false });
  },
}));
