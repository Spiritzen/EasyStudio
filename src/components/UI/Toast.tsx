/**
 * @file Toast.tsx
 * @description Composant de notifications toast avec animation d'entrée/sortie.
 * Chaque notification disparaît automatiquement après 3 secondes (géré par le store).
 * L'animation de sortie est déclenchée 400 ms avant la suppression du store.
 * @module components/UI/Toast
 */

import { useEffect, useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import type { ToastItem, ToastType } from '../../store/toastStore';
import './Toast.css';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: '✦',
};

/**
 * Carte de notification individuelle avec animation de sortie progressive.
 * @param toast - Les données de la notification à afficher.
 * @param onRemove - Callback appelé pour supprimer le toast du store.
 */
function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`toast-card toast-${toast.type} ${leaving ? 'toast-leave' : ''}`}>
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => { setLeaving(true); setTimeout(onRemove, 300); }}>
        ×
      </button>
    </div>
  );
}

/**
 * @component ToastContainer
 * @description Conteneur global de notifications toast positionné en bas de l'écran.
 * Retourne null si aucun toast n'est actif.
 * @returns JSX du composant ToastContainer, ou null.
 */
export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
