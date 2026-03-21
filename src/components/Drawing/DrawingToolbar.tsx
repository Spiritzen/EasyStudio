import { useEffect } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';
import type { BrushType } from '../../store/canvasStore';
import './DrawingToolbar.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// Rebuild and assign the brush directly on the canvas (synchronous, no async)
function applyBrushToCanvas(
  canvas: any,
  type: BrushType,
  size: number,
  color: string,
  opacity: number,
  smoothing: number
) {
  if (!canvas) return;
  const brush = new fabric.PencilBrush(canvas);
  brush.decimate = Math.max(0.1, 10 - smoothing);

  switch (type) {
    case 'brush':
      brush.width = size * 2.5;
      brush.color = hexToRgba(color, opacity);
      break;
    case 'marker':
      brush.width = size * 3;
      brush.color = hexToRgba(color, Math.min(opacity, 0.6));
      break;
    case 'eraser':
      brush.width = size * 4;
      // Use canvas background color so the stroke visually erases
      brush.color = (typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : null) || '#ffffff';
      break;
    case 'pencil':
    default:
      brush.width = size;
      brush.color = hexToRgba(color, opacity);
      break;
  }

  canvas.freeDrawingBrush = brush;
}

// ─── Brush type config ───────────────────────────────────────────────────────

const BRUSHES: { type: BrushType; icon: string; label: string }[] = [
  { type: 'pencil', icon: '✏️', label: 'Crayon' },
  { type: 'brush',  icon: '🖌️', label: 'Pinceau' },
  { type: 'marker', icon: '🖊️', label: 'Marqueur' },
  { type: 'eraser', icon: '◻',  label: 'Gomme' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function DrawingToolbar() {
  const {
    canvasInstance,
    activeBrush, setActiveBrush,
    brushSize, setBrushSize,
    brushColor, setBrushColor,
    brushOpacity, setBrushOpacity,
    brushSmoothing, setBrushSmoothing,
    setDrawingMode,
  } = useCanvasStore();

  // Rebuild brush whenever any setting changes.
  // canvas.isDrawingMode is already true (set synchronously in Toolbar's handleDrawingToggle).
  useEffect(() => {
    applyBrushToCanvas(canvasInstance, activeBrush, brushSize, brushColor, brushOpacity, brushSmoothing);
  }, [canvasInstance, activeBrush, brushSize, brushColor, brushOpacity, brushSmoothing]);

  // ─── Handlers — update store AND canvas simultaneously ───────────────────

  const handleBrushType = (type: BrushType) => {
    setActiveBrush(type);
    applyBrushToCanvas(canvasInstance, type, brushSize, brushColor, brushOpacity, brushSmoothing);
  };

  const handleSize = (val: number) => {
    setBrushSize(val);
    applyBrushToCanvas(canvasInstance, activeBrush, val, brushColor, brushOpacity, brushSmoothing);
  };

  const handleColor = (val: string) => {
    setBrushColor(val);
    applyBrushToCanvas(canvasInstance, activeBrush, brushSize, val, brushOpacity, brushSmoothing);
  };

  const handleOpacity = (val: number) => {
    setBrushOpacity(val);
    applyBrushToCanvas(canvasInstance, activeBrush, brushSize, brushColor, val, brushSmoothing);
  };

  const handleSmoothing = (val: number) => {
    setBrushSmoothing(val);
    applyBrushToCanvas(canvasInstance, activeBrush, brushSize, brushColor, brushOpacity, val);
  };

  const handleExit = () => {
    if (canvasInstance) {
      canvasInstance.isDrawingMode = false;
      canvasInstance.requestRenderAll();
      const el = canvasInstance.getElement() as HTMLElement;
      if (el) el.style.cursor = 'default';
    }
    setDrawingMode(false);
  };

  return (
    <div className="drawing-toolbar">
      {/* ── Brush type buttons ── */}
      <div className="dt-group">
        {BRUSHES.map((b) => (
          <button
            key={b.type}
            className={`dt-brush-btn ${activeBrush === b.type ? 'active' : ''}`}
            title={b.label}
            onClick={() => handleBrushType(b.type)}
          >
            {b.icon}
          </button>
        ))}
      </div>

      <div className="dt-sep" />

      {/* ── Color ── */}
      {activeBrush !== 'eraser' && (
        <>
          <label className="dt-label">Couleur</label>
          <input
            type="color"
            className="dt-color"
            value={brushColor}
            onChange={(e) => handleColor(e.target.value)}
            title="Couleur du pinceau"
          />
          <div className="dt-sep" />
        </>
      )}

      {/* ── Size ── */}
      <label className="dt-label">Épaisseur</label>
      <input
        type="range"
        className="dt-slider"
        min={1}
        max={50}
        value={brushSize}
        onChange={(e) => handleSize(+e.target.value)}
      />
      <span className="dt-val">{brushSize}px</span>

      {/* Brush preview circle — live update */}
      {activeBrush !== 'eraser' && (
        <div
          className="dt-preview"
          style={{
            width: Math.min(brushSize, 32),
            height: Math.min(brushSize, 32),
            background: hexToRgba(brushColor, brushOpacity),
            borderRadius: '50%',
            flexShrink: 0,
          }}
        />
      )}

      <div className="dt-sep" />

      {/* ── Opacity ── */}
      {activeBrush !== 'eraser' && (
        <>
          <label className="dt-label">Opacité</label>
          <input
            type="range"
            className="dt-slider"
            min={0.05}
            max={1}
            step={0.05}
            value={brushOpacity}
            onChange={(e) => handleOpacity(+e.target.value)}
          />
          <span className="dt-val">{Math.round(brushOpacity * 100)}%</span>
          <div className="dt-sep" />
        </>
      )}

      {/* ── Smoothing ── */}
      <label className="dt-label">Lissage</label>
      <input
        type="range"
        className="dt-slider"
        min={0}
        max={9}
        step={1}
        value={brushSmoothing}
        onChange={(e) => handleSmoothing(+e.target.value)}
      />
      <span className="dt-val">{brushSmoothing}</span>

      {/* ── Exit ── */}
      <div className="dt-spacer" />
      <button className="dt-exit-btn" onClick={handleExit}>
        ✕ Quitter dessin
      </button>
    </div>
  );
}
