/**
 * @file FillStroke.tsx
 * @description Sous-section de l'inspecteur permettant de modifier la couleur de remplissage,
 * la couleur de contour et l'épaisseur du contour de l'objet sélectionné.
 * @module components/Inspector/FillStroke
 */

import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';

/**
 * @component FillStroke
 * @description Section de l'inspecteur pour les couleurs de remplissage et de contour
 * de l'objet Fabric.js sélectionné. Propose un bouton "transparent" pour chaque couleur.
 * @returns JSX du composant FillStroke.
 */
export default function FillStroke() {
  const { selectedId, canvasInstance } = useCanvasStore();
  const [fill, setFill] = useState('#6c63ff');
  const [stroke, setStroke] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(0);

  useEffect(() => {
    if (!canvasInstance || !selectedId) return;
    const obj = canvasInstance.getObjects().find((o) => (o as any).id === selectedId);
    if (!obj) return;
    setFill(typeof obj.fill === 'string' ? obj.fill : '#000000');
    setStroke(typeof obj.stroke === 'string' ? obj.stroke : 'transparent');
    setStrokeWidth(obj.strokeWidth ?? 0);
  }, [selectedId, canvasInstance]);

  const apply = (key: string, value: string | number) => {
    if (!canvasInstance || !selectedId) return;
    const obj = canvasInstance.getObjects().find((o) => (o as any).id === selectedId);
    if (!obj) return;
    obj.set(key as any, value);
    canvasInstance.renderAll();
  };

  return (
    <section className="inspector-section">
      <div className="section-title">Couleurs</div>
      <div className="fill-row">
        <span>Fond</span>
        <input
          type="color"
          value={fill === 'transparent' ? '#000000' : fill}
          onChange={(e) => { setFill(e.target.value); apply('fill', e.target.value); }}
        />
        <button
          className={`transparent-btn ${fill === 'transparent' ? 'active' : ''}`}
          onClick={() => { setFill('transparent'); apply('fill', 'transparent'); }}
          title="Transparent"
        >∅</button>
      </div>
      <div className="fill-row">
        <span>Contour</span>
        <input
          type="color"
          value={stroke === 'transparent' ? '#000000' : stroke}
          onChange={(e) => { setStroke(e.target.value); apply('stroke', e.target.value); }}
        />
        <button
          className={`transparent-btn ${stroke === 'transparent' ? 'active' : ''}`}
          onClick={() => { setStroke('transparent'); apply('stroke', 'transparent'); }}
          title="Pas de contour"
        >∅</button>
      </div>
      <div className="fill-row">
        <span>Épaisseur</span>
        <input
          type="number"
          min={0}
          max={50}
          value={strokeWidth}
          onChange={(e) => { setStrokeWidth(+e.target.value); apply('strokeWidth', +e.target.value); }}
          style={{ width: 60 }}
        />
      </div>
    </section>
  );
}
