import { create } from 'zustand';

export interface CanvasState {
  id: string;
  name: string;
  thumbnail: string;   // dataURL PNG basse résolution
  fabricJSON: object;  // résultat de canvas.toJSON()
  timestamp: number;
}

export type TransitionType =
  | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'
  | 'zoomIn' | 'zoomOut' | 'rotate' | 'flip' | 'morph';

export type EasingType =
  | 'linear' | 'power1.out' | 'power2.out' | 'power3.out'
  | 'back.out' | 'elastic.out' | 'bounce.out' | 'circ.out';

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

interface TransitionStore {
  states: CanvasState[];
  transitions: TransitionConfig[];
  activeStateId: string | null;
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
  setStates: (states: CanvasState[]) => void;
  setTransitions: (transitions: TransitionConfig[]) => void;
}

let stateCounter = 0;

export const useTransitionStore = create<TransitionStore>((set, get) => ({
  states: [],
  transitions: [],
  activeStateId: null,
  isPlaying: false,
  previewStateId: null,

  captureState: (canvas, name) => {
    stateCounter++;
    const id = `state_${stateCounter}_${Date.now()}`;
    const stateName = name ?? `État ${stateCounter}`;
    const thumbnail = canvas.toDataURL({ format: 'png', multiplier: 0.15 });
    const fabricJSON = canvas.toJSON(['id', 'layerName', 'visible', 'locked']);

    const newState: CanvasState = { id, name: stateName, thumbnail, fabricJSON, timestamp: Date.now() };
    set((s) => ({ states: [...s.states, newState], activeStateId: id }));
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

  setStates: (states) => set({ states }),
  setTransitions: (transitions) => set({ transitions }),
}));
