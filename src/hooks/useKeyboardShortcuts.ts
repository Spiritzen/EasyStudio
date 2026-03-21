import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { saveProject, newProject } from '../utils/projectUtils';
import { deleteSelected, groupSelected, duplicateSelected, getObjectType } from '../utils/fabricHelpers';
import { applyZoom, fitToView } from '../utils/zoomUtils';

interface Options {
  onOpenProject: () => void;
  onOpenNewConfirm: () => void;
}

export function useKeyboardShortcuts({ onOpenProject, onOpenNewConfirm }: Options) {
  const { canvasInstance } = useCanvasStore();
  const { setShortcutsModal } = useUIStore();

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // ── Projet ──
      if (ctrl && e.key === 'n') { e.preventDefault(); onOpenNewConfirm(); return; }
      if (ctrl && e.key === 'o') { e.preventDefault(); onOpenProject(); return; }
      if (ctrl && e.key === 's') { e.preventDefault(); saveProject(); return; }

      if (!canvasInstance) return;

      // ── Zoom ──
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        applyZoom(canvasInstance, canvasInstance.getZoom() + 0.1);
        return;
      }
      if (ctrl && e.key === '-') {
        e.preventDefault();
        applyZoom(canvasInstance, canvasInstance.getZoom() - 0.1);
        return;
      }
      if (ctrl && e.key === '0') {
        e.preventDefault();
        const container = canvasInstance.getElement().closest('.canvas-wrapper') as HTMLElement | null;
        if (container) fitToView(canvasInstance, container);
        return;
      }
      if (ctrl && e.key === '1') {
        e.preventDefault();
        applyZoom(canvasInstance, 1);
        return;
      }

      // ── Historique ──
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        const json = useCanvasStore.getState().undo();
        if (json) canvasInstance.loadFromJSON(JSON.parse(json), () => {
          canvasInstance.renderAll();
          const layers = [...canvasInstance.getObjects()].reverse().map((obj: any) => ({
            id: obj.id || '',
            name: obj.layerName || obj.type || 'Objet',
            type: getObjectType(obj) as any,
            visible: obj.visible !== false,
            locked: !obj.selectable,
          }));
          useCanvasStore.getState().setLayers(layers);
        });
        return;
      }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        const json = useCanvasStore.getState().redo();
        if (json) canvasInstance.loadFromJSON(JSON.parse(json), () => {
          canvasInstance.renderAll();
        });
        return;
      }

      // ── Édition ──
      if (ctrl && e.key === 'd') { e.preventDefault(); duplicateSelected(canvasInstance); return; }
      if (ctrl && e.key === 'g') { e.preventDefault(); groupSelected(canvasInstance); return; }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvasInstance.getActiveObjects();
        if (activeObjects.length > 0) {
          deleteSelected(canvasInstance);
        } else {
          // No canvas selection — delete selected layer if any
          const state = useCanvasStore.getState();
          const { selectedId, layers } = state;
          if (selectedId) {
            const layer = layers.find((l) => l.id === selectedId);
            if (layer?.isLayer) {
              const children = layers.filter((l) => l.parentLayerId === layer.id);
              children.forEach((child) => {
                const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
                if (obj) canvasInstance.remove(obj);
              });
              if (children.length > 0) canvasInstance.requestRenderAll();
              state.removeLayer(selectedId);
              state.setActiveLayerId(null);
            }
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        // Exit drawing mode if active
        const store = useCanvasStore.getState();
        if (store.isDrawingMode) {
          canvasInstance.isDrawingMode = false;
          canvasInstance.requestRenderAll();
          const el = canvasInstance.getElement() as HTMLElement;
          if (el) el.style.cursor = 'default';
          store.setDrawingMode(false);
          return;
        }
        canvasInstance.discardActiveObject();
        canvasInstance.renderAll();
        return;
      }

      // ── Aide ──
      if (e.key === 'F1') { e.preventDefault(); setShortcutsModal(true); return; }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [canvasInstance, onOpenProject, onOpenNewConfirm, setShortcutsModal]);
}
