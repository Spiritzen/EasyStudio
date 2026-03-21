import { useState, useEffect, useRef } from 'react';
import './NewProjectModal.css';

const TEMPLATES = [
  { name: 'Logo carré',        width: 400,  height: 400  },
  { name: 'Vignette YouTube',  width: 1280, height: 720  },
  { name: 'Post Instagram',    width: 1080, height: 1080 },
  { name: 'Story / TikTok',    width: 1080, height: 1920 },
  { name: 'Bannière LinkedIn', width: 1584, height: 396  },
  { name: 'Par défaut',        width: 800,  height: 600  },
];

interface Props {
  isCanvasEmpty: boolean;
  onConfirm: (title: string, width: number, height: number, saveFirst: boolean) => void;
  onCancel: () => void;
}

export default function NewProjectModal({ isCanvasEmpty, onConfirm, onCancel }: Props) {
  const [name, setName] = useState('Sans titre');
  const [selected, setSelected] = useState(0);
  const [confirmStep, setConfirmStep] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.select(), 50);
    return () => clearTimeout(t);
  }, []);

  const doCreate = (saveFirst: boolean) => {
    const tpl = TEMPLATES[selected];
    onConfirm(name.trim(), tpl.width, tpl.height, saveFirst);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    if (!isCanvasEmpty) {
      setConfirmStep(true);
    } else {
      doCreate(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    if (e.key === 'Enter' && !confirmStep && name.trim()) handleCreate();
  };

  return (
    <div className="npm-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="npm-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Confirm overwrite step ── */}
        {confirmStep ? (
          <>
            <div className="npm-header">
              <span>Sauvegarder avant de continuer ?</span>
            </div>
            <div className="npm-body">
              <p className="npm-confirm-msg">
                Le projet actuel sera remplacé par <strong>{name}</strong>.<br />
                Voulez-vous sauvegarder avant de continuer ?
              </p>
            </div>
            <div className="npm-footer">
              <button className="npm-btn npm-btn--ghost"   onClick={() => setConfirmStep(false)}>Annuler</button>
              <button className="npm-btn npm-btn--danger"  onClick={() => doCreate(false)}>Continuer sans sauvegarder</button>
              <button className="npm-btn npm-btn--primary" onClick={() => doCreate(true)}>Sauvegarder</button>
            </div>
          </>
        ) : (
          <>
            <div className="npm-header">
              <span>Nouveau projet</span>
              <button className="npm-close" onClick={onCancel}>✕</button>
            </div>

            <div className="npm-body">
              <label className="npm-label">Nom du projet</label>
              <input
                ref={inputRef}
                className="npm-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Sans titre"
              />

              <label className="npm-label" style={{ marginTop: 16 }}>Format</label>
              <div className="npm-templates">
                {TEMPLATES.map((tpl, i) => (
                  <label
                    key={tpl.name}
                    className={`npm-tpl ${selected === i ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="npm-template"
                      checked={selected === i}
                      onChange={() => setSelected(i)}
                    />
                    <span className="npm-tpl-name">{tpl.name}</span>
                    <span className="npm-tpl-size">{tpl.width}×{tpl.height}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="npm-footer">
              <button className="npm-btn npm-btn--ghost" onClick={onCancel}>Annuler</button>
              <button
                className="npm-btn npm-btn--primary"
                onClick={handleCreate}
                disabled={!name.trim()}
              >
                Créer →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
