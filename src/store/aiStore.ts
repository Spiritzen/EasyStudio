import { create } from 'zustand';
import type { AIPromptHistory } from '../types';

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
