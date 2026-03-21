import { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { toast } from '../../store/toastStore';
import ConfirmDialog from '../UI/ConfirmDialog';
import './TemplatesModal.css';

interface Template {
  name: string;
  width: number;
  height: number;
  color: string;
}

const CATEGORIES: { name: string; items: Template[] }[] = [
  {
    name: 'Logos',
    items: [
      { name: 'Logo carré',  width: 400,  height: 400,  color: '#4a3f6b' },
      { name: 'Favicon',    width: 64,   height: 64,   color: '#3a3a52' },
    ],
  },
  {
    name: 'Réseaux sociaux',
    items: [
      { name: 'Instagram Post',  width: 1080, height: 1080, color: '#6b2f4a' },
      { name: 'Story / TikTok',  width: 1080, height: 1920, color: '#2f4a6b' },
      { name: 'YouTube Vignette',width: 1280, height: 720,  color: '#6b4a2f' },
      { name: 'LinkedIn Bannière',width: 1584, height: 396, color: '#2f6b4a' },
    ],
  },
  {
    name: 'Web & Print',
    items: [
      { name: 'Open Graph',       width: 1200, height: 630,  color: '#4a2f6b' },
      { name: 'Carte de visite',  width: 1050, height: 600,  color: '#6b4a3f' },
      { name: 'Par défaut',       width: 800,  height: 600,  color: '#3f4a6b' },
    ],
  },
];

interface Props {
  onClose: () => void;
}

export default function TemplatesModal({ onClose }: Props) {
  const { canvasInstance } = useCanvasStore();
  const [pending, setPending] = useState<Template | null>(null);

  const applyTemplate = (tpl: Template, keepObjects: boolean) => {
    if (!canvasInstance) return;
    if (!keepObjects) canvasInstance.clear();
    canvasInstance.setWidth(tpl.width);
    canvasInstance.setHeight(tpl.height);
    canvasInstance.backgroundColor = '';
    canvasInstance.renderAll();
    toast.success(`Format appliqué : ${tpl.name} ${tpl.width}×${tpl.height}`);
    onClose();
  };

  const handleClick = (tpl: Template) => {
    if (!canvasInstance) return;
    if (canvasInstance.getObjects().length > 0) {
      setPending(tpl);
    } else {
      applyTemplate(tpl, false);
    }
  };

  const maxDim = 100;

  return (
    <div className="tpl-overlay" onClick={onClose}>
      <div className="tpl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-header">
          <span>Choisir un format</span>
          <button className="tpl-close" onClick={onClose}>✕</button>
        </div>

        <div className="tpl-body">
          {CATEGORIES.map((cat) => (
            <div key={cat.name} className="tpl-category">
              <div className="tpl-cat-title">{cat.name}</div>
              <div className="tpl-grid">
                {cat.items.map((tpl) => {
                  const ratio = tpl.width / tpl.height;
                  const pw = ratio >= 1 ? maxDim : Math.round(maxDim * ratio);
                  const ph = ratio >= 1 ? Math.round(maxDim / ratio) : maxDim;
                  return (
                    <button key={tpl.name} className="tpl-card" onClick={() => handleClick(tpl)}>
                      <div
                        className="tpl-preview"
                        style={{
                          width: pw,
                          height: ph,
                          backgroundColor: tpl.color,
                          borderRadius: 4,
                        }}
                      />
                      <div className="tpl-card-name">{tpl.name}</div>
                      <div className="tpl-card-size">{tpl.width} × {tpl.height}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          title="Changer de format ?"
          message="Que faire avec les éléments actuels ?"
          onClose={() => setPending(null)}
          buttons={[
            { label: '🗑 Canvas vide',         variant: 'danger',   onClick: () => applyTemplate(pending, false) },
            { label: '📋 Garder les éléments', variant: 'primary',  onClick: () => applyTemplate(pending, true) },
            { label: 'Annuler',                variant: 'ghost',    onClick: () => {} },
          ]}
        />
      )}
    </div>
  );
}
