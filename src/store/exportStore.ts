/**
 * @file exportStore.ts
 * @description Store Zustand gérant les paramètres d'export (format, qualité, échelle)
 * et l'état de la modale d'affichage du code HTML/CSS généré.
 * @module store/exportStore
 */

import { create } from 'zustand';
import type { ExportFormat } from '../types';

/**
 * @interface ExportStore
 * @description État et actions du store export : format sélectionné,
 * qualité/échelle bitmap et gestion de la modale de code généré.
 */
interface ExportStore {
  format: ExportFormat;
  quality: number;
  scale: number;
  isCodeModalOpen: boolean;
  generatedCode: string;

  setFormat: (format: ExportFormat) => void;
  setQuality: (quality: number) => void;
  setScale: (scale: number) => void;
  openCodeModal: (code: string) => void;
  closeCodeModal: () => void;
}

/**
 * Hook Zustand exposant les paramètres d'export et la modale de code.
 * @returns L'état du store export (format, quality, scale, isCodeModalOpen).
 */
export const useExportStore = create<ExportStore>((set) => ({
  format: 'png',
  quality: 0.92,
  scale: 2,
  isCodeModalOpen: false,
  generatedCode: '',

  setFormat: (format) => set({ format }),
  setQuality: (quality) => set({ quality }),
  setScale: (scale) => set({ scale }),
  openCodeModal: (code) => set({ isCodeModalOpen: true, generatedCode: code }),
  closeCodeModal: () => set({ isCodeModalOpen: false }),
}));
