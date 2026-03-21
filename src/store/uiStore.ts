import { create } from 'zustand';

interface UIStore {
  showGrid: boolean;
  showRulers: boolean;
  showShortcutsModal: boolean;
  toggleGrid: () => void;
  toggleRulers: () => void;
  setShortcutsModal: (v: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showGrid: false,
  showRulers: false,
  showShortcutsModal: false,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  setShortcutsModal: (v) => set({ showShortcutsModal: v }),
}));
