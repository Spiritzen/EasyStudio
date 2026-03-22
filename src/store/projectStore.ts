/**
 * @file projectStore.ts
 * @description Store Zustand gérant les métadonnées du projet en cours :
 * titre, état de modification (dirty) et horodatages de création/mise à jour.
 * @module store/projectStore
 */

import { create } from 'zustand';

/**
 * @interface ProjectStore
 * @description Contrat du store projet : titre, indicateur de modifications non sauvegardées
 * et méthodes pour mettre à jour ces informations.
 */
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

/**
 * Hook Zustand exposant les métadonnées du projet actif.
 * @returns L'état du store projet (titre, isDirty, timestamps).
 */
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
