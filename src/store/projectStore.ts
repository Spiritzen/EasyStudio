import { create } from 'zustand';

interface ProjectStore {
  title: string;
  isDirty: boolean;
  createdAt: number;
  updatedAt: number;

  setTitle: (title: string) => void;
  setDirty: (v: boolean) => void;
  setCreatedAt: (ts: number) => void;
  touch: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  title: 'Sans titre',
  isDirty: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),

  setTitle: (title) => set({ title }),
  setDirty: (v) => set({ isDirty: v }),
  setCreatedAt: (ts) => set({ createdAt: ts }),
  touch: () => set({ updatedAt: Date.now() }),
  reset: () => set({ title: 'Sans titre', isDirty: false, createdAt: Date.now(), updatedAt: Date.now() }),
}));
