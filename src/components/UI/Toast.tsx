import { useEffect, useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import type { ToastItem, ToastType } from '../../store/toastStore';
import './Toast.css';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: '✦',
};

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
