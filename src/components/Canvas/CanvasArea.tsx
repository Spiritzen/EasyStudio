import { useRef, useState, useCallback, useEffect } from 'react';
import { useCanvas } from './useCanvas';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useBackgroundStore } from '../../store/backgroundStore';
import { addImageFromBlob, addSVGFromFile } from '../../utils/fabricHelpers';
import { toast } from '../../store/toastStore';
import Ruler from './Ruler';
import './CanvasArea.css';

export default function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasRef } = useCanvas(containerRef);
  const { canvasInstance } = useCanvasStore();
  const { showGrid, showRulers } = useUIStore();
  const { bgColor, bgOpacity, bgTransparent } = useBackgroundStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  // Sync canvas size when it changes
  useEffect(() => {
    if (!canvasInstance) return;
    const update = () => setCanvasSize({ w: canvasInstance.getWidth(), h: canvasInstance.getHeight() });
    update();
    (canvasInstance as any).on('after:render', update);
    return () => { (canvasInstance as any).off('after:render', update); };
  }, [canvasInstance]);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!canvasInstance) return;
      for (const file of files) {
        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
          await addSVGFromFile(canvasInstance, file);
        } else if (file.type.startsWith('image/')) {
          await addImageFromBlob(canvasInstance, file);
        }
        toast.success('Image importée ✓');
      }
    },
    [canvasInstance]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      className={`canvas-wrapper ${isDragOver ? 'drag-over' : ''}`}
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="canvas-drop-overlay">
          <div className="canvas-drop-hint">
            <span>↓</span>
            <span>Déposer l'image ici</span>
          </div>
        </div>
      )}

      {/* Canvas + rulers */}
      <div className="canvas-main">
        {showRulers && (
          <div className="canvas-rulers-row">
            <div className="ruler-corner" />
            <Ruler orientation="horizontal" length={canvasSize.w} />
          </div>
        )}
        <div className="canvas-content-row">
          {showRulers && <Ruler orientation="vertical" length={canvasSize.h} />}
          <div className="canvas-checkerboard" style={{ position: 'relative' }}>
            {/* Background layer — positioned behind the canvas, not exported */}
            <div
              className={`canvas-bg-layer${bgTransparent ? ' canvas-bg-layer--transparent' : ''}`}
              style={bgTransparent ? {
                width: canvasSize.w,
                height: canvasSize.h,
              } : {
                backgroundColor: bgColor,
                opacity: bgOpacity / 100,
                width: canvasSize.w,
                height: canvasSize.h,
              }}
            />
            {showGrid && (
              <div
                className="canvas-grid-overlay"
                style={{ width: canvasSize.w, height: canvasSize.h }}
              />
            )}
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
