/**
 * @file InspectorPanel.tsx
 * @description Panneau d'inspection des propriétés de l'objet sélectionné sur le canvas.
 * Affiche et permet de modifier : position (X, Y), dimensions (L, H), rotation, opacité,
 * remplissage/contour (FillStroke) et typographie si l'objet est un texte.
 * @module components/Inspector/InspectorPanel
 */

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

const PIVOT_POINTS = [
  { ox: 'left',   oy: 'top'    },
  { ox: 'center', oy: 'top'    },
  { ox: 'right',  oy: 'top'    },
  { ox: 'left',   oy: 'center' },
  { ox: 'center', oy: 'center' },
  { ox: 'right',  oy: 'center' },
  { ox: 'left',   oy: 'bottom' },
  { ox: 'center', oy: 'bottom' },
  { ox: 'right',  oy: 'bottom' },
];

const DEFAULT: ObjProps = { x: 0, y: 0, w: 0, h: 0, angle: 0, opacity: 100 };

function propsFromObject(obj: fabric.Object): ObjProps {
  return {
    x:       Math.round(obj.left    || 0),
    y:       Math.round(obj.top     || 0),
    w:       Math.round(obj.getScaledWidth?.()  ?? obj.width  ?? 0),
    h:       Math.round(obj.getScaledHeight?.() ?? obj.height ?? 0),
    angle:   Math.round(obj.angle   || 0),
    opacity: Math.round((obj.opacity ?? 1) * 100),
  };
}

/**
 * @component InspectorPanel
 * @description Panneau latéral droit affichant et permettant de modifier les propriétés
 * géométriques et visuelles de l'objet sélectionné sur le canvas Fabric.js.
 * @returns JSX du composant InspectorPanel.
 */
export default function InspectorPanel() {
  const { selectedId, selectedObject, canvasInstance } = useCanvasStore();
  const [props, setProps] = useState<ObjProps>(DEFAULT);
  const [objType, setObjType] = useState<string>('');

  const getSelectedObject = (): fabric.Object | null => {
    if (!canvasInstance || !selectedId) return null;
    return canvasInstance.getObjects().find((o) => (o as any).id === selectedId) ?? null;
  };

  // Sync when selection changes (selectedId) or object is mutated (selectedObject ref changes)
  useEffect(() => {
    const obj = selectedObject ?? getSelectedObject();
    if (!obj) { setProps(DEFAULT); setObjType(''); return; }
    setObjType(obj.type || '');
    setProps(propsFromObject(obj));
  }, [selectedId, selectedObject, canvasInstance]);

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

  const currentOX = (selectedObject as any)?.originX as string ?? 'center';
  const currentOY = (selectedObject as any)?.originY as string ?? 'center';

  const isGroup = objType === 'group';
  const isText  = objType === 'i-text' || objType === 'text';
  const isPath  = objType === 'path';

  const handlePivotChange = (ox: string, oy: string) => {
    const obj = getSelectedObject();
    if (!obj || !canvasInstance) return;

    // Sauvegarde le centre visuel absolu AVANT de changer l'origine
    const br      = obj.getBoundingRect(true);
    const centerX = br.left + br.width  / 2;
    const centerY = br.top  + br.height / 2;

    const w = obj.getScaledWidth();
    const h = obj.getScaledHeight();

    // Applique les nouvelles origines
    (obj as any).set({ originX: ox, originY: oy, centeredRotation: false });

    // Recalcule left/top pour que l'objet ne saute pas visuellement
    let newLeft = centerX;
    let newTop  = centerY;
    if (ox === 'left')   newLeft = centerX - w / 2;
    if (ox === 'right')  newLeft = centerX + w / 2;
    if (oy === 'top')    newTop  = centerY - h / 2;
    if (oy === 'bottom') newTop  = centerY + h / 2;

    obj.set({ left: newLeft, top: newTop });
    obj.setCoords();
    canvasInstance.requestRenderAll();

    // Force un nouvel objet wrapper pour déclencher la réactivité Zustand
    useCanvasStore.getState().setSelectedObject({ ...obj } as any);
    // Puis remet la vraie référence pour que les autres handlers trouvent l'objet
    setTimeout(() => useCanvasStore.getState().setSelectedObject(obj), 0);
  };

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
        <div className="inspector-placeholder">
          <div className="ip-title">Propriétés</div>
          <div className="ip-body">Cliquez sur un objet pour modifier :</div>
          <ul className="ip-list">
            <li>Position et dimensions</li>
            <li>Couleur de remplissage</li>
            <li>Contour et épaisseur</li>
            <li>Police et texte</li>
            <li>Opacité et rotation</li>
          </ul>
          <div className="ip-tip">
            Maintenez Shift pour sélectionner plusieurs objets
          </div>
        </div>
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
            <div className="pivot-section">
              <span className="pivot-label">Pivot</span>
              <div className="pivot-grid">
                {PIVOT_POINTS.map(({ ox, oy }, i) => (
                  <button
                    key={i}
                    className={`pivot-point${ox === currentOX && oy === currentOY ? ' active' : ''}`}
                    onClick={() => handlePivotChange(ox, oy)}
                    title={`${oy} ${ox}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <FillStroke />
          {isText && <Typography />}
        </div>
      )}
    </div>
  );
}
