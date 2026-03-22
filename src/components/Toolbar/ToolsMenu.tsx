/**
 * @file ToolsMenu.tsx
 * @description Menu déroulant "Outils" offrant l'ajout de formes et textes prédéfinis,
 * des outils avancés (pipette, duplication, alignement), la grille, les règles
 * et la capture d'état pour les transitions.
 * @module components/Toolbar/ToolsMenu
 */

import { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useTransitionStore } from '../../store/transitionStore';
import { toast } from '../../store/toastStore';
import {
  addRect, addCircle, addTriangle, addText,
  addLine, addArrow, addStar,
  addTextPreset, addTextArc,
  alignObjects, duplicateSelected,
} from '../../utils/fabricHelpers';
import type { AlignDirection } from '../../utils/fabricHelpers';

/**
 * @interface Props
 * @description Props du composant ToolsMenu.
 */
interface Props { onClose: () => void }

const ALIGN_BTNS: { dir: AlignDirection; icon: string; label: string }[] = [
  { dir: 'left',   icon: '⬛◻◻', label: 'Gauche' },
  { dir: 'center', icon: '◻⬛◻', label: 'Centre' },
  { dir: 'right',  icon: '◻◻⬛', label: 'Droite' },
  { dir: 'top',    icon: '▲',    label: 'Haut' },
  { dir: 'middle', icon: '━',    label: 'Milieu' },
  { dir: 'bottom', icon: '▼',    label: 'Bas' },
];

/**
 * @component ToolsMenu
 * @description Menu contextuel "Outils" avec sections formes, texte, outils avancés et alignement.
 * Se ferme automatiquement au clic extérieur ou à l'appui sur Échap.
 * @returns JSX du composant ToolsMenu.
 */
export default function ToolsMenu({ onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { canvasInstance } = useCanvasStore();
  const { showGrid, showRulers, toggleGrid, toggleRulers } = useUIStore();
  const { captureState } = useTransitionStore();
  const [showAlign, setShowAlign] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const run = (fn: () => void) => { fn(); onClose(); };
  const withCanvas = (fn: (c: any) => void) => { if (canvasInstance) fn(canvasInstance); onClose(); };

  const handleEyeDropper = async () => {
    onClose();
    if (!('EyeDropper' in window)) {
      toast.error('Pipette non supportée par ce navigateur');
      return;
    }
    try {
      const dropper = new (window as any).EyeDropper();
      const { sRGBHex } = await dropper.open();
      if (canvasInstance) {
        const obj = canvasInstance.getActiveObject();
        if (obj) { obj.set('fill', sRGBHex); canvasInstance.renderAll(); }
      }
      toast.success(`Couleur capturée : ${sRGBHex}`);
    } catch { /* user cancelled */ }
  };

  const handleDuplicate = () => {
    onClose();
    if (canvasInstance) duplicateSelected(canvasInstance);
  };

  return (
    <div className="tools-menu" ref={menuRef}>

      {/* ─── Formes ─── */}
      <div className="tools-section-title">Formes</div>
      <div className="tools-shapes-grid">
        {[
          { icon: '▭', label: 'Rectangle', fn: () => withCanvas(addRect) },
          { icon: '○', label: 'Ellipse',   fn: () => withCanvas(addCircle) },
          { icon: '△', label: 'Triangle',  fn: () => withCanvas(addTriangle) },
          { icon: '★', label: 'Étoile',    fn: () => withCanvas(addStar) },
          { icon: '╱', label: 'Ligne',     fn: () => withCanvas(addLine) },
          { icon: '➜', label: 'Flèche',   fn: () => withCanvas(addArrow) },
        ].map((s) => (
          <button key={s.label} className="tools-shape-btn" onClick={s.fn} title={s.label}>
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="tools-sep" />

      {/* ─── Texte ─── */}
      <div className="tools-section-title">Texte</div>
      {[
        { icon: 'T', label: 'Titre (48px)',    fn: () => withCanvas((c) => addTextPreset(c, 'title')) },
        { icon: 't', label: 'Sous-titre (28px)',fn: () => withCanvas((c) => addTextPreset(c, 'subtitle')) },
        { icon: '¶', label: 'Corps (16px)',    fn: () => withCanvas((c) => addTextPreset(c, 'body')) },
        { icon: '⌒', label: 'Texte en arc',   fn: () => withCanvas(addTextArc) },
      ].map((item) => (
        <button key={item.label} className="tools-menu-item" onClick={item.fn}>
          <span className="tools-menu-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}

      <div className="tools-sep" />

      {/* ─── Outils avancés ─── */}
      <div className="tools-section-title">Outils avancés</div>

      <button className="tools-menu-item" onClick={handleEyeDropper}>
        <span className="tools-menu-icon">🎨</span>
        <span>Pipette couleur</span>
      </button>

      <button className="tools-menu-item" onClick={() => withCanvas(handleDuplicate)}>
        <span className="tools-menu-icon">⊕</span>
        <span>Dupliquer</span>
        <span className="tools-menu-shortcut">Ctrl+D</span>
      </button>

      <button
        className={`tools-menu-item ${showRulers ? 'active' : ''}`}
        onClick={() => { toggleRulers(); onClose(); }}
      >
        <span className="tools-menu-icon">📐</span>
        <span>Règles</span>
        {showRulers && <span className="tools-active-dot" />}
      </button>

      <button
        className={`tools-menu-item ${showGrid ? 'active' : ''}`}
        onClick={() => { toggleGrid(); onClose(); }}
      >
        <span className="tools-menu-icon">🔲</span>
        <span>Grille</span>
        {showGrid && <span className="tools-active-dot" />}
      </button>

      <button
        className="tools-menu-item"
        onClick={() => {
          onClose();
          if (!canvasInstance) return;
          captureState(canvasInstance);
          toast.success('État capturé ✓');
        }}
      >
        <span className="tools-menu-icon">📸</span>
        <span>Capturer l'état</span>
      </button>

      {/* ─── Aligner ─── */}
      <div className="tools-sep" />
      <button
        className="tools-menu-item tools-align-toggle"
        onClick={() => setShowAlign((v) => !v)}
      >
        <span className="tools-menu-icon">⊞</span>
        <span>Aligner</span>
        <span style={{ marginLeft: 'auto', color: '#6b6b8a' }}>{showAlign ? '▲' : '▼'}</span>
      </button>

      {showAlign && (
        <div className="tools-align-grid">
          {ALIGN_BTNS.map((a) => (
            <button
              key={a.dir}
              className="tools-align-btn"
              title={a.label}
              onClick={() => { if (canvasInstance) alignObjects(canvasInstance, a.dir); onClose(); }}
            >
              {a.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
