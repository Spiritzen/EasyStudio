import { create } from 'zustand';
import type { ExportFormat } from '../types';

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
