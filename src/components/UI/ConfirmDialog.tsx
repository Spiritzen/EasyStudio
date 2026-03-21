import './ConfirmDialog.css';

export interface DialogButton {
  label: string;
  variant?: 'primary' | 'danger' | 'ghost';
  onClick: () => void;
}

interface Props {
  title: string;
  message?: string;
  buttons: DialogButton[];
  onClose: () => void;
}

export default function ConfirmDialog({ title, message, buttons, onClose }: Props) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        {message && <div className="dialog-message">{message}</div>}
        <div className="dialog-buttons">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              className={`dialog-btn dialog-btn-${btn.variant || 'ghost'}`}
              onClick={() => { btn.onClick(); onClose(); }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
