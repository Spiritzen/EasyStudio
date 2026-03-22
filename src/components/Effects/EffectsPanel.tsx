/**
 * @file EffectsPanel.tsx
 * @description Panneau à onglets "Effets / Transitions". L'onglet Effets permet d'appliquer
 * un flou gaussien, des coins arrondis et une ombre portée sur l'objet sélectionné.
 * L'onglet Transitions affiche le composant TransitionsPanel.
 * @module components/Effects/EffectsPanel
 */

import { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';
import ShadowControl from './ShadowControl';
import TransitionsPanel from '../Transitions/TransitionsPanel';
import './Effects.css';

type PanelTab = 'effets' | 'transitions';

/**
 * @component EffectsPanel
 * @description Panneau latéral droit à onglets pour les effets visuels (flou, arrondi, ombre)
 * et les transitions animées. Affiche un état vide si aucun objet n'est sélectionné.
 * @returns JSX du composant EffectsPanel.
 */
export default function EffectsPanel() {
  const { selectedId, canvasInstance } = useCanvasStore();
  const [activeTab, setActiveTab] = useState<PanelTab>('effets');
  const [blur, setBlur] = useState(0);
  const [borderRadius, setBorderRadius] = useState(0);

  const getObj = (): fabric.Object | null => {
    if (!canvasInstance || !selectedId) return null;
    return canvasInstance.getObjects().find((o) => (o as any).id === selectedId) ?? null;
  };

  useEffect(() => {
    const obj = getObj();
    if (!obj) { setBlur(0); setBorderRadius(0); return; }
    const objAny = obj as any;
    const blurFilter = (objAny.filters as fabric.IBaseFilter[] | undefined)?.find(
      (f: any) => f.type === 'Blur'
    ) as any;
    setBlur(blurFilter ? Math.round((blurFilter.blur || 0) * 100) : 0);
    if (obj.type === 'rect') {
      setBorderRadius((obj as fabric.Rect).rx || 0);
    }
  }, [selectedId]);

  // Applique réellement le filtre Blur sur l'objet Fabric (opération lourde)
  const applyBlur = (value: number) => {
    const obj = getObj();
    if (!obj || !canvasInstance) return;
    const objAny = obj as any;
    const blurVal = value / 100;
    if (value === 0) {
      objAny.filters = (objAny.filters as fabric.IBaseFilter[] | undefined)?.filter((f: any) => f.type !== 'Blur') || [];
    } else {
      const existing = (objAny.filters as fabric.IBaseFilter[] | undefined)?.find((f: any) => f.type === 'Blur') as any;
      if (existing) { existing.blur = blurVal; }
      else {
        if (!objAny.filters) objAny.filters = [];
        objAny.filters.push(new fabric.Image.filters.Blur({ blur: blurVal }) as any);
      }
    }
    objAny.applyFilters?.();
    canvasInstance.renderAll();
  };

  const applyBorderRadius = (value: number) => {
    const obj = getObj();
    if (!obj || !canvasInstance || obj.type !== 'rect') return;
    setBorderRadius(value);
    (obj as fabric.Rect).set({ rx: value, ry: value });
    canvasInstance.renderAll();
  };

  return (
    <div className="effects-panel">
      <div className="panel-header" style={{ padding: 0 }}>
        <div className="effects-tabs">
          <button
            className={`effects-tab ${activeTab === 'effets' ? 'active' : ''}`}
            onClick={() => setActiveTab('effets')}
          >
            Effets
          </button>
          <button
            className={`effects-tab ${activeTab === 'transitions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transitions')}
          >
            Transitions
          </button>
        </div>
      </div>

      {activeTab === 'transitions' ? (
        <TransitionsPanel />
      ) : !selectedId ? (
        <div className="effects-placeholder">
          <div className="ip-title">Effets visuels</div>
          <div className="ip-body">Sélectionnez un objet pour appliquer :</div>
          <ul className="ip-list">
            <li>Flou gaussien</li>
            <li>Coins arrondis</li>
            <li>Ombre portée</li>
          </ul>
          <div className="ip-tip">
            Onglet Transitions pour animer entre deux états de votre design
          </div>
        </div>
      ) : (
        <div className="effects-content">
          <section className="inspector-section">
            <div className="section-title">Flou</div>
            <div className="fill-row">
              <span>Blur</span>
              <input
                type="range"
                min={0}
                max={100}
                value={blur}
                onChange={(e) => setBlur(+e.target.value)}
                onPointerUp={(e) => applyBlur(+(e.target as HTMLInputElement).value)}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 30, color: '#c5c5e0', fontSize: 11 }}>{blur}</span>
            </div>
          </section>

          <section className="inspector-section">
            <div className="section-title">Arrondi</div>
            <div className="fill-row">
              <span>Rayon</span>
              <input
                type="range"
                min={0}
                max={100}
                value={borderRadius}
                onChange={(e) => applyBorderRadius(+e.target.value)}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 30, color: '#c5c5e0', fontSize: 11 }}>{borderRadius}px</span>
            </div>
          </section>

          <section className="inspector-section">
            <ShadowControl />
          </section>
        </div>
      )}
    </div>
  );
}
