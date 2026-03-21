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
import ConfirmDialog from '../UI/ConfirmDialog';
import type { DialogButton } from '../UI/ConfirmDialog';

interface Props {
  onClose: () => void;
  onNewProject: () => void;
}

export default function FileMenu({ onClose, onNewProject }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  return (
    <>
      <div className="file-menu" ref={menuRef}>
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
