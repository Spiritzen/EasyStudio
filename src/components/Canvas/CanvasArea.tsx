import { useRef, useState, useCallback, useEffect } from 'react';
import { useCanvas } from './useCanvas';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useBackgroundStore } from '../../store/backgroundStore';
import { addImageFromBlob, addSVGFromFile, addRect } from '../../utils/fabricHelpers';
import { toast } from '../../store/toastStore';
import Ruler from './Ruler';
import './CanvasArea.css';

interface Props {
  onOpenAI?: () => void;
}

export default function CanvasArea({ onOpenAI }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileWelcomeRef = useRef<HTMLInputElement>(null);
  const { canvasRef } = useCanvas(containerRef);
  const { canvasInstance } = useCanvasStore();
  const { showGrid, showRulers } = useUIStore();
  const { bgColor, bgOpacity, bgTransparent } = useBackgroundStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [objectCount, setObjectCount] = useState(0);

  // Sync canvas size when it changes
  useEffect(() => {
    if (!canvasInstance) return;
    const update = () => setCanvasSize({ w: canvasInstance.getWidth(), h: canvasInstance.getHeight() });
    update();
    (canvasInstance as any).on('after:render', update);
    return () => { (canvasInstance as any).off('after:render', update); };
  }, [canvasInstance]);

  // Track object count for welcome overlay
  useEffect(() => {
    if (!canvasInstance) return;
    const update = () => setObjectCount(canvasInstance.getObjects().length);
    update();
    (canvasInstance as any).on('object:added', update);
    (canvasInstance as any).on('object:removed', update);
    return () => {
      (canvasInstance as any).off('object:added', update);
      (canvasInstance as any).off('object:removed', update);
    };
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

  const handleWelcomeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFiles([file]);
    e.target.value = '';
  };

  const showWelcome = objectCount === 0 && !isDragOver;

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

      {/* Welcome overlay — shown when canvas is empty */}
      <div className={`canvas-welcome-overlay${showWelcome ? ' canvas-welcome-overlay--visible' : ''}`}>
        <div className="welcome-title">⚡ EasyStudio</div>
        <div className="welcome-subtitle">Créez logos, vignettes et animations exportables</div>
        <div className="welcome-cards">
          <div className="welcome-card" onClick={() => canvasInstance && addRect(canvasInstance)}>
            <span className="wc-icon">□</span>
            <span className="wc-label">Ajouter une forme</span>
            <span className="wc-hint">Rectangle, cercle, texte...</span>
          </div>
          <div className="welcome-card" onClick={() => fileWelcomeRef.current?.click()}>
            <span className="wc-icon">🖼️</span>
            <span className="wc-label">Importer un logo</span>
            <span className="wc-hint">PNG · JPG · SVG · WebP</span>
          </div>
          <div className="welcome-card" onClick={onOpenAI}>
            <span className="wc-icon">✨</span>
            <span className="wc-label">Générer avec l'IA</span>
            <span className="wc-hint">Décrivez votre logo</span>
          </div>
        </div>
        <div className="welcome-tip">
          💡 Glissez une image directement ici pour commencer
        </div>
      </div>

      {/* Hidden file input for welcome card */}
      <input
        ref={fileWelcomeRef}
        type="file"
        accept="image/*,.svg"
        style={{ display: 'none' }}
        onChange={handleWelcomeFileChange}
      />

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
