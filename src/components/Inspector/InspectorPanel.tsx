import { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';
import { ungroupSelected } from '../../utils/fabricHelpers';
import FillStroke from './FillStroke';
import Typography from './Typography';
import './Inspector.css';

interface ObjProps {
  x: number; y: number;
  w: number; h: number;
  angle: number; opacity: number;
}

const DEFAULT: ObjProps = { x: 0, y: 0, w: 0, h: 0, angle: 0, opacity: 100 };

export default function InspectorPanel() {
  const { selectedId, canvasInstance } = useCanvasStore();
  const [props, setProps] = useState<ObjProps>(DEFAULT);
  const [objType, setObjType] = useState<string>('');

  const getSelectedObject = (): fabric.Object | null => {
    if (!canvasInstance || !selectedId) return null;
    return canvasInstance.getObjects().find((o) => (o as any).id === selectedId) ?? null;
  };

  useEffect(() => {
    const obj = getSelectedObject();
    if (!obj) { setProps(DEFAULT); setObjType(''); return; }
    setObjType(obj.type || '');
    setProps({
      x: Math.round(obj.left || 0),
      y: Math.round(obj.top || 0),
      w: Math.round(obj.getScaledWidth?.() ?? obj.width ?? 0),
      h: Math.round(obj.getScaledHeight?.() ?? obj.height ?? 0),
      angle: Math.round(obj.angle || 0),
      opacity: Math.round((obj.opacity ?? 1) * 100),
    });
  }, [selectedId, canvasInstance]);

  const applyChange = (key: string, value: number) => {
    const obj = getSelectedObject();
    if (!obj || !canvasInstance) return;
    setProps((prev) => ({ ...prev, [key]: value }));
    if (key === 'x') obj.set('left', value);
    else if (key === 'y') obj.set('top', value);
    else if (key === 'w') obj.set('scaleX', value / (obj.width || 1));
    else if (key === 'h') obj.set('scaleY', value / (obj.height || 1));
    else if (key === 'angle') obj.set('angle', value);
    else if (key === 'opacity') obj.set('opacity', value / 100);
    obj.setCoords();
    canvasInstance.renderAll();
  };

  const handleUngroup = () => {
    if (!canvasInstance) return;
    ungroupSelected(canvasInstance);
  };

  const isGroup = objType === 'group';
  const isText  = objType === 'i-text' || objType === 'text';
  const isPath  = objType === 'path';

  const handleClosePath = () => {
    const obj = getSelectedObject() as any;
    if (!obj || !canvasInstance) return;
    // Append Z to close the path if not already closed
    if (typeof obj.path === 'string') {
      if (!obj.path.trim().toUpperCase().endsWith('Z')) {
        obj.path = obj.path.trim() + ' Z';
        canvasInstance.requestRenderAll();
      }
    } else if (Array.isArray(obj.path)) {
      const last = obj.path[obj.path.length - 1];
      if (!last || last[0]?.toUpperCase() !== 'Z') {
        obj.path.push(['Z']);
        obj.dirty = true;
        canvasInstance.requestRenderAll();
      }
    }
  };

  return (
    <div className="inspector-panel">
      <div className="panel-header">
        <span>Propriétés</span>
        {selectedId && <span className="obj-type-badge">{objType}</span>}
      </div>

      {!selectedId ? (
        <div className="inspector-empty"><p>Aucun objet sélectionné</p></div>
      ) : (
        <div className="inspector-content">

          {/* Fermer le path pour les tracés libres */}
          {isPath && (
            <section className="inspector-section">
              <button className="ungroup-btn" onClick={handleClosePath}>
                <span>⊙</span> Fermer le path
              </button>
              <p className="ungroup-hint">
                Ferme le tracé pour appliquer un remplissage
              </p>
            </section>
          )}

          {/* Bouton Décomposer pour les groupes / SVG importés */}
          {isGroup && (
            <section className="inspector-section">
              <button className="ungroup-btn" onClick={handleUngroup}>
                <span>⊡</span> Décomposer le groupe
              </button>
              <p className="ungroup-hint">
                Sépare les éléments pour les modifier individuellement
              </p>
            </section>
          )}

          {/* Position / Taille / Rotation / Opacité */}
          <section className="inspector-section">
            <div className="prop-grid">
              {(['x','y','w','h','angle','opacity'] as const).map((key, i) => (
                <label key={key}>
                  <span>{['X','Y','L','H','°','%'][i]}</span>
                  <input
                    type="number"
                    min={key === 'opacity' ? 0 : undefined}
                    max={key === 'opacity' ? 100 : undefined}
                    value={props[key]}
                    onChange={(e) => applyChange(key, +e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="prop-labels">
              <span>X</span><span>Y</span><span>Larg</span>
              <span>Haut</span><span>Rot</span><span>Opac</span>
            </div>
          </section>

          <FillStroke />
          {isText && <Typography />}
        </div>
      )}
    </div>
  );
}
