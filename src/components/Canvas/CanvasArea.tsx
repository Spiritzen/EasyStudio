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
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem('easystudio-canvas-used')
  );

  const dismissWelcome = useCallback(() => {
    localStorage.setItem('easystudio-canvas-used', 'true');
    setShowWelcome(false);
  }, []);

  // Sync canvas size when it changes
  useEffect(() => {
    if (!canvasInstance) return;
    const update = () => setCanvasSize({ w: canvasInstance.getWidth(), h: canvasInstance.getHeight() });
    update();
    (canvasInstance as any).on('after:render', update);
    return () => { (canvasInstance as any).off('after:render', update); };
  }, [canvasInstance]);

  // Dismiss welcome on first object added
  useEffect(() => {
    if (!canvasInstance) return;
    (canvasInstance as any).on('object:added', dismissWelcome);
    return () => { (canvasInstance as any).off('object:added', dismissWelcome); };
  }, [canvasInstance, dismissWelcome]);

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
    dismissWelcome();
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleWelcomeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFiles([file]);
    e.target.value = '';
  };

  const showWelcomeVisible = showWelcome && !isDragOver;

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

      {/* Welcome overlay — shown on first visit only */}
      <div className={`canvas-welcome-overlay${showWelcomeVisible ? ' canvas-welcome-overlay--visible' : ''}`}>
        <div className="welcome-title">EasyStudio</div>
        <div className="welcome-subtitle">Créez logos, vignettes et animations exportables</div>
        <div className="welcome-cards">
          <div className="welcome-card" onClick={() => { dismissWelcome(); canvasInstance && addRect(canvasInstance); }}>
            <span className="wc-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            </span>
            <span className="wc-label">Ajouter une forme</span>
            <span className="wc-hint">Rectangle, cercle, texte...</span>
          </div>
          <div className="welcome-card" onClick={() => { dismissWelcome(); fileWelcomeRef.current?.click(); }}>
            <span className="wc-icon">
              <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </span>
            <span className="wc-label">Importer un logo</span>
            <span className="wc-hint">PNG · JPG · SVG · WebP</span>
          </div>
          <div className="welcome-card" onClick={() => { dismissWelcome(); onOpenAI?.(); }}>
            <span className="wc-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </span>
            <span className="wc-label">Générer avec l'IA</span>
            <span className="wc-hint">Décrivez votre logo</span>
          </div>
        </div>
        <div className="welcome-tip">
          Glissez une image ici pour commencer
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
            <div className={`canvas-grid-overlay${showGrid ? ' visible' : ''}`} />
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
