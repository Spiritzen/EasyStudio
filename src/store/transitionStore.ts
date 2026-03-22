/**
 * @file transitionStore.ts
 * @description Store Zustand gérant les états capturés du canvas et les transitions animées
 * entre ces états. Permet la prévisualisation et l'export d'animations CSS/HTML.
 * @module store/transitionStore
 */

import { create } from 'zustand';

/**
 * @interface CanvasState
 * @description Snapshot d'un état du canvas capturé pour les transitions.
 * Contient une miniature PNG basse résolution et le JSON Fabric complet.
 */
export interface CanvasState {
  id: string;
  name: string;
  thumbnail: string;   // dataURL PNG basse résolution
  fabricJSON: object;  // résultat de canvas.toJSON()
  timestamp: number;
}

/**
 * @typedef TransitionType
 * @description Types d'animation disponibles entre deux états du canvas.
 */
export type TransitionType =
  | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'
  | 'zoomIn' | 'zoomOut' | 'rotate' | 'flip' | 'morph';

/**
 * @typedef EasingType
 * @description Fonctions d'interpolation (easing) disponibles pour les transitions.
 */
export type EasingType =
  | 'linear' | 'power1.out' | 'power2.out' | 'power3.out'
  | 'back.out' | 'elastic.out' | 'bounce.out' | 'circ.out';

/**
 * @interface TransitionConfig
 * @description Configuration complète d'une transition entre deux états canvas.
 */
export interface TransitionConfig {
  id: string;
  fromStateId: string;
  toStateId: string;
  type: TransitionType;
  duration: number;   // 0.1 – 3.0
  easing: EasingType;
  delay: number;      // 0 – 2.0
  stagger: number;    // 0 – 0.5
}

/**
 * @interface TransitionStore
 * @description Contrat du store transitions : liste des états, configurations
 * de transitions et actions pour capturer, lire et supprimer des états.
 */
interface TransitionStore {
  states: CanvasState[];
  transitions: TransitionConfig[];
  activeStateId: string | null;
  fromStateId: string | null;
  toStateId: string | null;
  isPlaying: boolean;
  previewStateId: string | null;

  captureState: (canvas: any, name?: string) => void;
  deleteState: (id: string) => void;
  renameState: (id: string, name: string) => void;
  loadState: (id: string, canvas: any) => void;
  addTransition: (config: Omit<TransitionConfig, 'id'>) => void;
  updateTransition: (id: string, patch: Partial<TransitionConfig>) => void;
  deleteTransition: (id: string) => void;
  setPlaying: (v: boolean) => void;
  setFromStateId: (id: string | null) => void;
  setToStateId: (id: string | null) => void;
  setStates: (states: CanvasState[]) => void;
  setTransitions: (transitions: TransitionConfig[]) => void;
}

let stateCounter = 0;

/**
 * Hook Zustand exposant les états capturés et les transitions du canvas.
 * @returns L'état complet du store transitions (states, transitions, isPlaying).
 */
export const useTransitionStore = create<TransitionStore>((set, get) => ({
  states: [],
  transitions: [],
  activeStateId: null,
  fromStateId: null,
  toStateId: null,
  isPlaying: false,
  previewStateId: null,

  captureState: (canvas, name) => {
    stateCounter++;
    const id = `state_${stateCounter}_${Date.now()}`;
    const stateName = name ?? `État ${stateCounter}`;
    const thumbnail = canvas.toDataURL({ format: 'png', multiplier: 0.15 });
    const fabricJSON = canvas.toJSON(['id', 'layerName', 'visible', 'locked']);

    const newState: CanvasState = { id, name: stateName, thumbnail, fabricJSON, timestamp: Date.now() };
    set((s) => {
      const newStates = [...s.states, newState];
      return {
        states: newStates,
        activeStateId: id,
        fromStateId: newStates.length >= 2 ? newStates[0].id : s.fromStateId,
        toStateId: newStates.length >= 2 ? newStates[newStates.length - 1].id : s.toStateId,
      };
    });
  },

  deleteState: (id) =>
    set((s) => ({
      states: s.states.filter((st) => st.id !== id),
      transitions: s.transitions.filter((t) => t.fromStateId !== id && t.toStateId !== id),
      activeStateId: s.activeStateId === id ? null : s.activeStateId,
    })),

  renameState: (id, name) =>
    set((s) => ({ states: s.states.map((st) => (st.id === id ? { ...st, name } : st)) })),

  loadState: (id, canvas) => {
    const state = get().states.find((s) => s.id === id);
    if (!state || !canvas) return;

    // Fade out, load, fade in
    const el = canvas.wrapperEl as HTMLElement | null;
    if (el) { el.style.transition = 'opacity 0.2s'; el.style.opacity = '0'; }

    setTimeout(() => {
      canvas.loadFromJSON(state.fabricJSON, () => {
        canvas.renderAll();
        if (el) { el.style.opacity = '1'; }
      });
    }, 200);

    set({ activeStateId: id });
  },

  addTransition: (config) => {
    const id = `tr_${Date.now()}`;
    set((s) => ({ transitions: [...s.transitions, { id, ...config }] }));
  },

  updateTransition: (id, patch) =>
    set((s) => ({
      transitions: s.transitions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  deleteTransition: (id) =>
    set((s) => ({ transitions: s.transitions.filter((t) => t.id !== id) })),

  setPlaying: (v) => set({ isPlaying: v }),
  setFromStateId: (id) => set({ fromStateId: id }),
  setToStateId: (id) => set({ toStateId: id }),

  setStates: (states) => { stateCounter = 0; set({ states }); },
  setTransitions: (transitions) => set({ transitions }),
}));
