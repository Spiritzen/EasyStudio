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

    if (obj.type === 'image') {
      // Images : lire depuis le filtre natif Fabric
      const blurFilter = (objAny.filters ?? []).find((f: any) => f.type === 'Blur') as any;
      setBlur(blurFilter ? Math.round((blurFilter.blur ?? 0) * 100) : 0);
    } else {
      // Formes & texte : lire depuis la valeur stockée sur l'objet
      setBlur((objAny._blurValue as number) ?? 0);
    }

    if (obj.type === 'rect') setBorderRadius((obj as fabric.Rect).rx || 0);
    else setBorderRadius(0);
  }, [selectedId]);

  // ── Applique le flou gaussien ────────────────────────────────────────────
  // CAS image  → pipeline natif fabric.Image.filters.Blur + applyFilters()
  // CAS formes → patch _render avec ctx.filter (seule méthode fiable en v5)
  const applyBlur = (value: number) => {
    const obj = getObj();
    if (!obj || !canvasInstance) return;
    const objAny = obj as any;

    if (obj.type === 'image') {
      // ── Images : filtre natif Fabric ────────────────────────────────────
      const blurVal = value / 100;
      if (value === 0) {
        objAny.filters = (objAny.filters ?? []).filter((f: any) => f.type !== 'Blur');
      } else {
        const existing = (objAny.filters ?? []).find((f: any) => f.type === 'Blur') as any;
        if (existing) {
          existing.blur = blurVal;
        } else {
          objAny.filters = [
            ...(objAny.filters ?? []),
            new fabric.Image.filters.Blur({ blur: blurVal }),
          ];
        }
      }
      objAny.applyFilters();
    } else {
      // ── Formes & texte : patch _render avec ctx.filter ──────────────────
      // Fabric v5 n'expose pas applyFilters() sur les objets vectoriels.
      // On injecte le filtre CSS directement dans le contexte de rendu.
      objAny._blurValue = value;

      if (value === 0) {
        if (objAny._originalRender) {
          objAny._render = objAny._originalRender;
          delete objAny._originalRender;
        }
      } else {
        const blurPx = Math.round(value * 0.4); // 0-100 → 0-40 px
        if (!objAny._originalRender) {
          objAny._originalRender = objAny._render.bind(objAny);
        }
        const originalRender = objAny._originalRender as (ctx: CanvasRenderingContext2D) => void;
        objAny._render = function (this: unknown, ctx: CanvasRenderingContext2D) {
          ctx.save();
          ctx.filter = `blur(${blurPx}px)`;
          originalRender.call(this, ctx);
          ctx.restore();
        };
      }
      obj.set('dirty', true);
    }

    canvasInstance.requestRenderAll();
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
