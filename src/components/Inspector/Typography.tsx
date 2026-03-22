/**
 * @file Typography.tsx
 * @description Sous-section de l'inspecteur pour les propriétés typographiques
 * d'un objet texte sélectionné : police, taille, gras, italique et alignement.
 * @module components/Inspector/Typography
 */

import { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';

const FONTS = ['Inter', 'Arial', 'Georgia', 'Courier New', 'Verdana', 'Trebuchet MS', 'Times New Roman'];
const ALIGNS = ['left', 'center', 'right'] as const;

/**
 * @component Typography
 * @description Section de l'inspecteur dédiée aux propriétés typographiques.
 * Affiché uniquement quand l'objet sélectionné est un texte (i-text ou text).
 * @returns JSX du composant Typography.
 */
export default function Typography() {
  const { selectedId, canvasInstance } = useCanvasStore();
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(36);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');

  useEffect(() => {
    if (!canvasInstance || !selectedId) return;
    const obj = canvasInstance.getObjects().find((o) => (o as any).id === selectedId);
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'text')) return;
    const txt = obj as fabric.IText;
    setFontFamily(txt.fontFamily || 'Inter');
    setFontSize(txt.fontSize || 36);
    setBold(txt.fontWeight === 'bold');
    setItalic(txt.fontStyle === 'italic');
    setAlign((txt.textAlign as any) || 'left');
  }, [selectedId, canvasInstance]);

  const apply = (updates: Partial<fabric.IText>) => {
    if (!canvasInstance || !selectedId) return;
    const obj = canvasInstance.getObjects().find((o) => (o as any).id === selectedId);
    if (!obj) return;
    obj.set(updates as any);
    canvasInstance.renderAll();
  };

  return (
    <section className="inspector-section">
      <div className="section-title">Typographie</div>
      <div className="fill-row">
        <span>Police</span>
        <select
          value={fontFamily}
          onChange={(e) => { setFontFamily(e.target.value); apply({ fontFamily: e.target.value }); }}
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="fill-row">
        <span>Taille</span>
        <input
          type="number"
          min={8}
          max={300}
          value={fontSize}
          onChange={(e) => { setFontSize(+e.target.value); apply({ fontSize: +e.target.value }); }}
          style={{ width: 60 }}
        />
        <div className="typo-buttons">
          <button
            className={`typo-btn ${bold ? 'active' : ''}`}
            onClick={() => { const nb = !bold; setBold(nb); apply({ fontWeight: nb ? 'bold' : 'normal' }); }}
          ><b>B</b></button>
          <button
            className={`typo-btn ${italic ? 'active' : ''}`}
            onClick={() => { const ni = !italic; setItalic(ni); apply({ fontStyle: ni ? 'italic' : 'normal' }); }}
          ><i>I</i></button>
        </div>
      </div>
      <div className="fill-row">
        <span>Alignement</span>
        <div className="typo-buttons">
          {ALIGNS.map((a) => (
            <button
              key={a}
              className={`typo-btn ${align === a ? 'active' : ''}`}
              onClick={() => { setAlign(a); apply({ textAlign: a }); }}
            >
              {a === 'left' ? '⬛◻◻' : a === 'center' ? '◻⬛◻' : '◻◻⬛'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
