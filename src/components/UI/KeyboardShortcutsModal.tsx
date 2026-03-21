import { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import './KeyboardShortcutsModal.css';

const SHORTCUTS = [
  { section: 'Projet' },
  { key: 'Ctrl + N', action: 'Nouveau projet' },
  { key: 'Ctrl + O', action: 'Ouvrir un projet' },
  { key: 'Ctrl + S', action: 'Sauvegarder' },
  { section: 'Édition' },
  { key: 'Ctrl + Z', action: 'Annuler' },
  { key: 'Ctrl + Y', action: 'Rétablir' },
  { key: 'Ctrl + D', action: 'Dupliquer' },
  { key: 'Ctrl + G', action: 'Grouper la sélection' },
  { key: 'Delete', action: 'Supprimer la sélection' },
  { section: 'Canvas' },
  { key: 'Ctrl + V', action: 'Coller une image' },
  { key: 'Échap', action: 'Désélectionner / Fermer' },
  { section: 'Aide' },
  { key: 'F1', action: 'Afficher les raccourcis' },
];

export default function KeyboardShortcutsModal() {
  const { setShortcutsModal } = useUIStore();

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F1') setShortcutsModal(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [setShortcutsModal]);

  return (
    <div className="ks-overlay" onClick={() => setShortcutsModal(false)}>
      <div className="ks-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ks-header">
          <span>Raccourcis clavier</span>
          <button className="ks-close" onClick={() => setShortcutsModal(false)}>✕</button>
        </div>
        <div className="ks-body">
          {SHORTCUTS.map((item, i) =>
            'section' in item ? (
              <div key={i} className="ks-section">{item.section}</div>
            ) : (
              <div key={i} className="ks-row">
                <span className="ks-action">{item.action}</span>
                <kbd className="ks-key">{item.key}</kbd>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
