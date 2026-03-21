import { create } from 'zustand';
import type { LayerItem, HistoryState } from '../types';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

export type BrushType = 'pencil' | 'brush' | 'marker' | 'eraser';

interface CanvasStore {
  layers: LayerItem[];
  selectedId: string | null;
  history: HistoryState[];
  historyIndex: number;
  canvasInstance: FabricCanvas | null;

  // Drawing mode (kept for v2 — not exposed in UI yet)
  isDrawingMode: boolean;
  activeBrush: BrushType;
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  brushSmoothing: number;
  drawingPathCount: number;

  // Layer containers
  activeLayerId: string | null;   // layer container currently selected as active target
  emptyLayerCount: number;        // counter for auto-naming "Calque N"

  setCanvas: (canvas: FabricCanvas) => void;
  setLayers: (layers: LayerItem[]) => void;
  setSelectedId: (id: string | null) => void;
  addLayer: (layer: LayerItem) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<LayerItem>) => void;
  reorderLayers: (from: number, to: number) => void;
  pushHistory: (json: string) => void;
  undo: () => string | null;
  redo: () => string | null;

  // Drawing setters (v2)
  setDrawingMode: (v: boolean) => void;
  setActiveBrush: (b: BrushType) => void;
  setBrushSize: (s: number) => void;
  setBrushColor: (c: string) => void;
  setBrushOpacity: (o: number) => void;
  setBrushSmoothing: (s: number) => void;
  incrementPathCount: () => void;

  // Layer container actions
  addEmptyLayer: (name?: string) => string;
  assignObjectToLayer: (objectId: string, layerId: string) => void;
  removeObjectFromLayer: (objectId: string) => void;
  toggleLayerExpanded: (layerId: string) => void;
  setActiveLayerId: (id: string | null) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  layers: [],
  selectedId: null,
  history: [],
  historyIndex: -1,
  canvasInstance: null,

  // Drawing mode defaults (v2)
  isDrawingMode: false,
  activeBrush: 'pencil',
  brushSize: 3,
  brushColor: '#7c3aed',
  brushOpacity: 1,
  brushSmoothing: 5,
  drawingPathCount: 0,

  // Layer containers
  activeLayerId: null,
  emptyLayerCount: 0,

  setCanvas: (canvas: FabricCanvas) => set({ canvasInstance: canvas }),

  setLayers: (layers) => set({ layers }),

  setSelectedId: (id) => set({ selectedId: id }),

  addLayer: (layer) =>
    set((state) => ({ layers: [layer, ...state.layers] })),

  removeLayer: (id) =>
    set((state) => ({ layers: state.layers.filter((l) => l.id !== id) })),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  reorderLayers: (from, to) =>
    set((state) => {
      const arr = [...state.layers];
      const [removed] = arr.splice(from, 1);
      arr.splice(to, 0, removed);
      return { layers: arr };
    }),

  pushHistory: (json) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ json, timestamp: Date.now() });
      if (newHistory.length > 50) newHistory.shift();
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return history[newIndex].json;
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return history[newIndex].json;
  },

  // Drawing setters (v2)
  setDrawingMode: (v) => set({ isDrawingMode: v }),
  setActiveBrush: (b) => set({ activeBrush: b }),
  setBrushSize: (s) => set({ brushSize: s }),
  setBrushColor: (c) => set({ brushColor: c }),
  setBrushOpacity: (o) => set({ brushOpacity: o }),
  setBrushSmoothing: (s) => set({ brushSmoothing: s }),
  incrementPathCount: () => set((state) => ({ drawingPathCount: state.drawingPathCount + 1 })),

  // ─── Layer container actions ────────────────────────────────────────────

  addEmptyLayer: (name) => {
    const count = get().emptyLayerCount + 1;
    const id = `layer_${count}_${Date.now()}`;
    const newLayer: LayerItem = {
      id,
      name: name ?? `Calque ${count}`,
      type: 'layer',
      visible: true,
      locked: false,
      isLayer: true,
      isExpanded: true,
      parentLayerId: undefined,
    };
    set((state) => ({
      layers: [newLayer, ...state.layers],
      emptyLayerCount: count,
      activeLayerId: id,
      selectedId: id,
    }));
    return id;
  },

  assignObjectToLayer: (objectId, layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === objectId ? { ...l, parentLayerId: layerId } : l
      ),
    })),

  removeObjectFromLayer: (objectId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === objectId ? { ...l, parentLayerId: undefined } : l
      ),
    })),

  toggleLayerExpanded: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, isExpanded: !l.isExpanded } : l
      ),
    })),

  setActiveLayerId: (id) => set({ activeLayerId: id }),
}));
