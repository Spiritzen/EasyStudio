import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { saveProject, newProject } from '../utils/projectUtils';
import { deleteSelected, groupSelected, duplicateSelected, getObjectType } from '../utils/fabricHelpers';

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
        deleteSelected(canvasInstance);
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
