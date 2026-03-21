import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';
import type { LayerItem } from '../../types';
import { getObjectType, addImageFromBlob } from '../../utils/fabricHelpers';

const SNAP_GRID = 8;

// Builds the layers list from the canvas, while preserving:
// - empty layer containers (isLayer: true) from the current store
// - parentLayerId on existing canvas objects
// - auto-assigns new objects to activeLayerId if set
function buildMergedLayers(canvas: fabric.Canvas, currentLayers: LayerItem[]): LayerItem[] {
  const existingById = new Map(currentLayers.map((l) => [l.id, l]));
  const { activeLayerId } = useCanvasStore.getState();

  // Rebuild canvas-backed items
  const canvasItems: LayerItem[] = [...canvas.getObjects()]
    .reverse()
    .map((obj: any) => {
      const existing = existingById.get(obj.id || '');
      return {
        id: obj.id || (obj as any).__uid?.toString() || '',
        name: (obj as any).layerName || obj.type || 'Objet',
        type: getObjectType(obj) as LayerItem['type'],
        visible: obj.visible !== false,
        locked: !obj.selectable,
        fabricObject: obj,
        parentLayerId: existing?.parentLayerId,
      };
    });

  const canvasIds = new Set(canvasItems.map((i) => i.id));
  const currentIds = new Set(currentLayers.map((l) => l.id));

  // Walk previous list in order, keeping containers and updating canvas items
  const merged: LayerItem[] = [];
  for (const prev of currentLayers) {
    if (prev.isLayer) {
      merged.push(prev); // preserve container unchanged
    } else if (canvasIds.has(prev.id)) {
      const updated = canvasItems.find((c) => c.id === prev.id);
      if (updated) merged.push(updated);
      // if not found = object deleted, skip it
    }
  }

  // Append truly new canvas items (not previously in store)
  for (const item of canvasItems) {
    if (!currentIds.has(item.id)) {
      merged.push({
        ...item,
        parentLayerId: activeLayerId ?? undefined,
      });
    }
  }

  return merged;
}

export function useCanvas(containerRef: React.RefObject<HTMLDivElement>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const pathBeingCreated = useRef(false);
  const { setCanvas, setLayers, setSelectedId, pushHistory } = useCanvasStore();

  const syncLayers = useCallback(() => {
    if (!fabricRef.current) return;
    const currentLayers = useCanvasStore.getState().layers;
    setLayers(buildMergedLayers(fabricRef.current, currentLayers));
  }, [setLayers]);

  const saveHistory = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON(['id', 'layerName']));
    pushHistory(json);
    syncLayers();
  }, [pushHistory, syncLayers]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fc = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '',   // transparent — background managed by CSS div
      preserveObjectStacking: true,
    });

    fabricRef.current = fc;
    setCanvas(fc);

    // Snap to grid
    fc.on('object:moving', (e) => {
      if (fc.isDrawingMode) return;
      if (!e.target) return;
      const obj = e.target;
      obj.set({
        left: Math.round((obj.left || 0) / SNAP_GRID) * SNAP_GRID,
        top: Math.round((obj.top || 0) / SNAP_GRID) * SNAP_GRID,
      });
    });

    fc.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj) setSelectedId((obj as any).id);
    });
    fc.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (obj) setSelectedId((obj as any).id);
    });
    fc.on('selection:cleared', () => setSelectedId(null));

    fc.on('object:added', () => {
      if (pathBeingCreated.current) return;
      saveHistory();
    });
    fc.on('object:modified', saveHistory);
    fc.on('object:removed', saveHistory);

    // ── Path created (free drawing) ─────────────────────────────────
    fc.on('before:path:created', () => {
      pathBeingCreated.current = true;
    });

    fc.on('path:created', (e: any) => {
      pathBeingCreated.current = false;
      const path = e.path;
      if (!path) return;

      const store = useCanvasStore.getState();
      const count = store.drawingPathCount + 1;
      path.id = `path_${count}_${Date.now()}`;
      path.layerName = `Tracé ${count}`;

      if (store.activeBrush === 'eraser') {
        path.set({ globalCompositeOperation: 'destination-out' });
      }

      store.incrementPathCount();
      fc.setActiveObject(path);
      setSelectedId(path.id);

      const json = JSON.stringify(fc.toJSON(['id', 'layerName']));
      store.pushHistory(json);
      syncLayers();
    });

    // ── Paste from clipboard ──────────────────────────────────────────
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob && fabricRef.current) {
            await addImageFromBlob(fabricRef.current, blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    pushHistory(JSON.stringify(fc.toJSON(['id', 'layerName'])));

    return () => {
      window.removeEventListener('paste', handlePaste);
      fc.dispose();
    };
  }, []);

  return { canvasRef, fabricRef, syncLayers };
}
