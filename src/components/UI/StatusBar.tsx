import { useEffect, useState, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { applyZoom, fitToView, getLogicalSize } from '../../utils/zoomUtils';
import './StatusBar.css';

export default function StatusBar() {
  const { layers, canvasInstance } = useCanvasStore();
  const [zoom, setZoom] = useState(100);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [selectionCount, setSelectionCount] = useState(0);
  const [selectionName, setSelectionName] = useState('');
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState('');
  const zoomInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canvasInstance) return;

    const updateCanvasInfo = () => {
      const z = canvasInstance.getZoom();
      setZoom(Math.round(z * 100));
      const { w, h } = getLogicalSize(canvasInstance);
      setCanvasSize({ w: Math.round(w), h: Math.round(h) });
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
    statusLeft = 'Cliquez sur une forme · Ctrl+Z pour annuler · Ctrl+S pour sauvegarder';
  } else if (selectionCount === 1) {
    statusLeft = `${selectionName} sélectionné — Suppr pour effacer · Ctrl+D pour dupliquer · Double-clic sur le nom pour renommer`;
  } else {
    statusLeft = `${selectionCount} objets sélectionnés — Ctrl+G pour grouper`;
  }

  const handleZoomIn = () => { if (canvasInstance) applyZoom(canvasInstance, canvasInstance.getZoom() + 0.1); };
  const handleZoomOut = () => { if (canvasInstance) applyZoom(canvasInstance, canvasInstance.getZoom() - 0.1); };

  const handleFit = () => {
    if (!canvasInstance) return;
    const container = canvasInstance.getElement().closest('.canvas-wrapper') as HTMLElement | null;
    if (container) fitToView(canvasInstance, container);
  };

  const startEditZoom = () => {
    setZoomInput(String(zoom));
    setEditingZoom(true);
    setTimeout(() => zoomInputRef.current?.select(), 0);
  };

  const commitZoom = () => {
    const val = parseInt(zoomInput, 10);
    if (!isNaN(val) && canvasInstance) {
      applyZoom(canvasInstance, val / 100);
    }
    setEditingZoom(false);
  };

  const handleZoomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitZoom();
    if (e.key === 'Escape') setEditingZoom(false);
  };

  return (
    <div className="status-bar">
      <span className="status-left">{statusLeft}</span>
      <div className="status-right">
        <span>{canvasSize.w} × {canvasSize.h} px</span>
        <span className="status-sep">·</span>

        {/* Zoom controls */}
        <div className="status-zoom-controls">
          <button className="status-zoom-btn status-zoom-step" onClick={handleZoomOut} title="Zoom arrière (Ctrl+−)">−</button>
          {editingZoom ? (
            <input
              ref={zoomInputRef}
              className="status-zoom-input"
              value={zoomInput}
              onChange={(e) => setZoomInput(e.target.value)}
              onBlur={commitZoom}
              onKeyDown={handleZoomKeyDown}
              autoFocus
            />
          ) : (
            <button className="status-zoom-btn status-zoom-pct" onClick={startEditZoom} title="Cliquer pour modifier le zoom">{zoom}%</button>
          )}
          <button className="status-zoom-btn status-zoom-step" onClick={handleZoomIn} title="Zoom avant (Ctrl++)">+</button>
        </div>

        <span className="status-sep">·</span>
        <button className="status-zoom-btn status-fit-btn" onClick={handleFit} title="Ajuster à la fenêtre (Ctrl+0)">⊡</button>
        <span className="status-sep">·</span>
        <span>{objectCount} objet{objectCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
