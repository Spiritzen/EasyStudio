import { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { addImageFromURL } from '../../utils/fabricHelpers';
import './URLImportModal.css';

interface Props {
  onClose: () => void;
}

export default function URLImportModal({ onClose }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canvasInstance } = useCanvasStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed || !canvasInstance) return;
    setError(null);
    setLoading(true);
    try {
      await addImageFromURL(canvasInstance, trimmed);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="url-modal-overlay" onClick={onClose}>
      <div className="url-modal" onClick={(e) => e.stopPropagation()}>
        <div className="url-modal-header">
          <span>Importer depuis une URL</span>
          <button className="url-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="url-modal-body">
          <p className="url-modal-hint">
            Entrez l'URL directe d'une image (PNG, JPG, SVG, WebP…).
            L'image doit autoriser les requêtes cross-origin.
          </p>
          <input
            ref={inputRef}
            className="url-modal-input"
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="https://exemple.com/logo.svg"
            onKeyDown={(e) => { if (e.key === 'Enter') handleImport(); }}
          />
          {error && (
            <div className="url-modal-error">
              <span>⚠</span> {error}
            </div>
          )}
        </div>

        <div className="url-modal-footer">
          <button className="url-modal-cancel" onClick={onClose}>Annuler</button>
          <button
            className="url-modal-import"
            onClick={handleImport}
            disabled={!url.trim() || loading}
          >
            {loading ? <span className="url-spinner" /> : '↓ Importer'}
          </button>
        </div>
      </div>
    </div>
  );
}
