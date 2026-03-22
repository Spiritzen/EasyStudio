/**
 * @file FileMenu.tsx
 * @description Menu déroulant "Fichier" de la barre d'outils. Permet de créer un nouveau projet,
 * d'ouvrir un fichier .easylogo, de sauvegarder, de charger un projet récent,
 * d'importer une image ou de copier le code HTML/CSS généré.
 * @module components/Toolbar/FileMenu
 */

import { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useProjectStore } from '../../store/projectStore';
import { useExportStore } from '../../store/exportStore';
import {
  saveProject, openProjectFile, loadRecentProject,
  getRecentProjects, relativeDate,
  type RecentProject,
} from '../../utils/projectUtils';
import { generateCode } from '../../utils/codeGenerator';
import { addRect, addImage, addSVGFromFile } from '../../utils/fabricHelpers';
import ConfirmDialog from '../UI/ConfirmDialog';
import type { DialogButton } from '../UI/ConfirmDialog';

/**
 * @interface Props
 * @description Props du composant FileMenu.
 */
interface Props {
  onClose: () => void;
  onNewProject: () => void;
  onOpenAI?: () => void;
}

const IcoShape = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
);
const IcoUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
  </svg>
);
const IcoAI = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

/**
 * @component FileMenu
 * @description Menu déroulant "Fichier" avec démarrage rapide, gestion de projet
 * (nouveau, ouvrir, sauvegarder), projets récents et export de code HTML/CSS.
 * @returns JSX du composant FileMenu.
 */
export default function FileMenu({ onClose, onNewProject, onOpenAI }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { canvasInstance } = useCanvasStore();
  const { isDirty } = useProjectStore();
  const { openCodeModal } = useExportStore();
  const [recents] = useState<RecentProject[]>(() => getRecentProjects());

  const [dialog, setDialog] = useState<{
    title: string; message?: string; buttons: DialogButton[];
  } | null>(null);

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

  const canvasIsEmpty = () => !canvasInstance || canvasInstance.getObjects().length === 0;

  const handleNew = () => {
    onClose();
    onNewProject();
  };

  const handleOpen = () => {
    onClose();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canvasIsEmpty() || isDirty) {
      setDialog({
        title: 'Ouvrir un projet',
        message: 'Le canvas actuel sera remplacé. Sauvegarder avant ?',
        buttons: [
          { label: 'Sauvegarder',      variant: 'primary', onClick: () => { saveProject(); openProjectFile(file); } },
          { label: 'Ouvrir quand même', variant: 'danger',  onClick: () => openProjectFile(file) },
          { label: 'Annuler',           variant: 'ghost',   onClick: () => {} },
        ],
      });
    } else {
      openProjectFile(file);
    }
    e.target.value = '';
  };

  const handleRecent = (r: RecentProject) => {
    onClose();
    if (!canvasIsEmpty()) {
      setDialog({
        title: 'Charger un projet',
        message: `"${r.title}" remplacera le canvas actuel. Sauvegarder avant ?`,
        buttons: [
          { label: 'Sauvegarder',      variant: 'primary', onClick: () => { saveProject(); loadRecentProject(r); } },
          { label: 'Ouvrir quand même', variant: 'danger',  onClick: () => loadRecentProject(r) },
          { label: 'Annuler',           variant: 'ghost',   onClick: () => {} },
        ],
      });
    } else {
      loadRecentProject(r);
    }
  };

  const handleCopyCode = () => {
    onClose();
    if (!canvasInstance) return;
    openCodeModal(generateCode(canvasInstance));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasInstance) return;
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      addSVGFromFile(canvasInstance, file);
    } else {
      const url = URL.createObjectURL(file);
      addImage(canvasInstance, url);
    }
    e.target.value = '';
    onClose();
  };

  const handleQuickShape = () => {
    onClose();
    if (canvasInstance) addRect(canvasInstance);
  };

  const handleQuickImport = () => {
    onClose();
    imageInputRef.current?.click();
  };

  const handleQuickAI = () => {
    onClose();
    onOpenAI?.();
  };

  return (
    <>
      <div className="file-menu" ref={menuRef}>
        {/* ── Démarrage rapide ── */}
        <div className="file-menu-section-label file-menu-section-label--gold">Démarrage rapide</div>
        <button className="file-menu-item" onClick={handleQuickShape}>
          <span className="file-menu-icon file-menu-icon--gold"><IcoShape /></span>
          <span className="file-menu-label">Ajouter une forme</span>
        </button>
        <button className="file-menu-item" onClick={handleQuickImport}>
          <span className="file-menu-icon file-menu-icon--gold"><IcoUpload /></span>
          <span className="file-menu-label">Importer un logo</span>
        </button>
        <button className="file-menu-item" onClick={handleQuickAI}>
          <span className="file-menu-icon file-menu-icon--gold"><IcoAI /></span>
          <span className="file-menu-label">Générer avec l'IA</span>
        </button>
        <div className="file-menu-sep" />

        <button className="file-menu-item" onClick={handleNew}>
          <span className="file-menu-icon">📄</span>
          <span className="file-menu-label">Nouveau projet</span>
          <span className="file-menu-shortcut">Ctrl+N</span>
        </button>
        <button className="file-menu-item" onClick={handleOpen}>
          <span className="file-menu-icon">📂</span>
          <span className="file-menu-label">Ouvrir projet</span>
          <span className="file-menu-shortcut">Ctrl+O</span>
        </button>
        <button className="file-menu-item" onClick={() => { onClose(); saveProject(); }}>
          <span className="file-menu-icon">💾</span>
          <span className="file-menu-label">Sauvegarder</span>
          <span className="file-menu-shortcut">Ctrl+S</span>
        </button>

        {recents.length > 0 && (
          <>
            <div className="file-menu-sep" />
            <div className="file-menu-section-label">🕐 Projets récents</div>
            {recents.map((r) => (
              <button
                key={`${r.title}-${r.savedAt}`}
                className="file-menu-recent"
                onClick={() => handleRecent(r)}
              >
                <img
                  className="recent-thumb"
                  src={r.thumbnail}
                  alt={r.title}
                />
                <div className="recent-info">
                  <span className="recent-title">{r.title}</span>
                  <span className="recent-meta">
                    {r.width}×{r.height} · {relativeDate(r.savedAt)}
                  </span>
                </div>
              </button>
            ))}
          </>
        )}

        <div className="file-menu-sep" />
        <button className="file-menu-item" onClick={handleCopyCode}>
          <span className="file-menu-icon">⟨⟩</span>
          <span className="file-menu-label">Copier le code HTML/CSS</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".easylogo,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,.svg"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          buttons={dialog.buttons}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
