/**
 * @file aiStore.ts
 * @description Store Zustand gérant la configuration et l'état du module IA :
 * clé API Anthropic, historique des prompts et état de génération en cours.
 * @module store/aiStore
 */

import { create } from 'zustand';
import type { AIPromptHistory } from '../types';

/**
 * @interface AIStore
 * @description État et actions du store IA : clé API, historique des prompts,
 * indicateur de génération en cours et message d'erreur éventuel.
 */
interface AIStore {
  apiKey: string;
  promptHistory: AIPromptHistory[];
  isGenerating: boolean;
  error: string | null;

  setApiKey: (key: string) => void;
  addPromptHistory: (prompt: string) => void;
  clearHistory: () => void;
  setGenerating: (v: boolean) => void;
  setError: (msg: string | null) => void;
}

const STORAGE_KEY = 'easystudio_anthropic_key';

/**
 * Hook Zustand exposant l'état du module IA.
 * La clé API est persistée dans le localStorage sous la clé STORAGE_KEY.
 * @returns L'état du store IA (apiKey, promptHistory, isGenerating, error).
 */
export const useAIStore = create<AIStore>((set) => ({
  apiKey: localStorage.getItem(STORAGE_KEY) || '',
  promptHistory: [],
  isGenerating: false,
  error: null,

  setApiKey: (key) => {
    localStorage.setItem(STORAGE_KEY, key);
    set({ apiKey: key });
  },

  addPromptHistory: (prompt) =>
    set((state) => ({
      promptHistory: [
        { id: Date.now().toString(), prompt, timestamp: Date.now() },
        ...state.promptHistory.slice(0, 19),
      ],
    })),

  clearHistory: () => set({ promptHistory: [] }),
  setGenerating: (v) => set({ isGenerating: v }),
  setError: (msg) => set({ error: msg }),
}));
