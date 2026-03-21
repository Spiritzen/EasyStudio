import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import './StatusBar.css';

export default function StatusBar() {
  const { layers, canvasInstance } = useCanvasStore();
  const [zoom, setZoom] = useState(100);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [selectionCount, setSelectionCount] = useState(0);
  const [selectionName, setSelectionName] = useState('');

  useEffect(() => {
    if (!canvasInstance) return;

    const updateCanvasInfo = () => {
      setZoom(Math.round(canvasInstance.getZoom() * 100));
      setCanvasSize({ w: canvasInstance.getWidth(), h: canvasInstance.getHeight() });
    };

    const updateSelection = () => {
      const active = canvasInstance.getActiveObjects() as any[];
      setSelectionCount(active.length);
      if (active.length === 1) {
        const obj = active[0];
        const layer = useCanvasStore.getState().layers.find((l) => l.id === obj.id);
        setSelectionName(layer?.name ?? obj.type ?? 'Objet');
      }
    };

    const clearSelection = () => setSelectionCount(0);

    updateCanvasInfo();

    canvasInstance.on('after:render', updateCanvasInfo);
    canvasInstance.on('selection:created', updateSelection);
    canvasInstance.on('selection:updated', updateSelection);
    canvasInstance.on('selection:cleared', clearSelection);

    return () => {
      canvasInstance.off('after:render', updateCanvasInfo);
      canvasInstance.off('selection:created', updateSelection);
      canvasInstance.off('selection:updated', updateSelection);
      canvasInstance.off('selection:cleared', clearSelection);
    };
  }, [canvasInstance]);

  const objectCount = layers.filter((l) => !l.isLayer).length;

  let statusLeft: string;
  if (selectionCount === 0) {
    statusLeft = '💡 Cliquez sur une forme · Ctrl+Z pour annuler · Ctrl+S pour sauvegarder';
  } else if (selectionCount === 1) {
    statusLeft = `✓ ${selectionName} sélectionné — Suppr pour effacer · Ctrl+D pour dupliquer · Double-clic sur le nom pour renommer`;
  } else {
    statusLeft = `✓ ${selectionCount} objets sélectionnés — Ctrl+G pour grouper`;
  }

  return (
    <div className="status-bar">
      <span className="status-left">{statusLeft}</span>
      <div className="status-right">
        <span>{canvasSize.w} × {canvasSize.h} px</span>
        <span className="status-sep">·</span>
        <span>{zoom}%</span>
        <span className="status-sep">·</span>
        <span>{objectCount} objet{objectCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
