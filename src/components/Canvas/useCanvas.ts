/**
 * @file useCanvas.ts
 * @description Hook React initialisant et gérant l'instance Fabric.js du canvas.
 * Gère le cycle de vie (init, événements, cleanup), la synchro des calques,
 * l'historique undo/redo, le snap à la grille et le collage depuis le presse-papiers.
 * @module components/Canvas/useCanvas
 */

import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';
import type { LayerItem } from '../../types';
import { getObjectType, addImageFromBlob } from '../../utils/fabricHelpers';
import { fitToView } from '../../utils/zoomUtils';

const SNAP_GRID = 8;

/**
 * Reconstruit la liste des calques en fusionnant les conteneurs logiques existants
 * avec les objets Fabric actuellement sur le canvas.
 * Préserve les conteneurs vides (isLayer), les parentLayerId, et assigne les nouveaux
 * objets à l'activeLayerId courant si défini.
 * @param canvas - L'instance Fabric.js active.
 * @param currentLayers - La liste actuelle des calques dans le store.
 * @returns La liste fusionnée et ordonnée de LayerItem.
 */
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

/**
 * Hook initialisant l'instance Fabric.js, enregistrant tous les événements canvas
 * et synchronisant l'état avec le store Zustand.
 * @param containerRef - Référence vers l'élément HTML conteneur du canvas (pour fitToView).
 * @returns Un objet contenant canvasRef, fabricRef et la fonction syncLayers.
 */
export function useCanvas(containerRef: React.RefObject<HTMLDivElement>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const pathBeingCreated = useRef(false);
  const { setCanvas, setLayers, setSelectedId, setSelectedObject, pushHistory } = useCanvasStore();

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

    // ── Paste from clipboard (registered before rAF) ──
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

    // ── Re-fit on window resize ──
    const handleResize = () => {
      if (!fabricRef.current || !(fabricRef.current as any).lowerCanvasEl) return;
      if (containerRef.current) fitToView(fabricRef.current, containerRef.current);
    };
    window.addEventListener('resize', handleResize);

    // ── Init Fabric inside rAF so the DOM is fully mounted ──
    const frameId = requestAnimationFrame(() => {
      if (!canvasRef.current) return;

      const fc = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '',   // transparent — background managed by CSS div
        preserveObjectStacking: true,
      });

      fabricRef.current = fc;
      setCanvas(fc);

      // Snap to grid + live Inspector update
      fc.on('object:moving', (e) => {
        if (fc.isDrawingMode) return;
        if (!e.target) return;
        const obj = e.target;
        obj.set({
          left: Math.round((obj.left || 0) / SNAP_GRID) * SNAP_GRID,
          top:  Math.round((obj.top  || 0) / SNAP_GRID) * SNAP_GRID,
        });
        setSelectedObject(fc.getActiveObject());
      });

      const updateSelectedObject = () => setSelectedObject(fc.getActiveObject());
      fc.on('object:scaling',  updateSelectedObject);
      fc.on('object:rotating', updateSelectedObject);
      fc.on('object:modified', updateSelectedObject);

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

      // ── Path created (free drawing) ──
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

      pushHistory(JSON.stringify(fc.toJSON(['id', 'layerName'])));

      // Auto-fit once canvas is ready
      if (containerRef.current && (fc as any).lowerCanvasEl) {
        fitToView(fc, containerRef.current);
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('resize', handleResize);
      if (fabricRef.current) {
        // Retire explicitement tous les listeners Fabric avant dispose()
        fabricRef.current.off('object:moving');
        fabricRef.current.off('object:scaling');
        fabricRef.current.off('object:rotating');
        fabricRef.current.off('object:modified');
        fabricRef.current.off('object:added');
        fabricRef.current.off('object:removed');
        fabricRef.current.off('selection:created');
        fabricRef.current.off('selection:updated');
        fabricRef.current.off('selection:cleared');
        fabricRef.current.off('before:path:created');
        fabricRef.current.off('path:created');
        fabricRef.current.dispose();
      }
      fabricRef.current = null;
    };
  }, []);

  return { canvasRef, fabricRef, syncLayers };
}
