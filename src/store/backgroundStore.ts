import { create } from 'zustand';

const STORAGE_KEY = 'easystudio-background';

interface BackgroundState {
  bgColor: string;
  bgOpacity: number;       // 0–100
  bgTransparent: boolean;

  setBgColor: (color: string) => void;
  setBgOpacity: (opacity: number) => void;
  setBgTransparent: (transparent: boolean) => void;
  resetBackground: () => void;
}

const DEFAULT_COLOR = '#ffffff';
const DEFAULT_OPACITY = 100;

function load(): Partial<BackgroundState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<BackgroundState>;
  } catch {
    return {};
  }
}

function save(state: Partial<BackgroundState>) {
  try {
    const { bgColor, bgOpacity, bgTransparent } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bgColor, bgOpacity, bgTransparent }));
  } catch { /* ignore */ }
}

const persisted = load();

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
