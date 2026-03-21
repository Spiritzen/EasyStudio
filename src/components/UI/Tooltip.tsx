import { useState, useRef, type ReactNode } from 'react';
import './Tooltip.css';

interface TooltipProps {
  text: string;
  hint?: string;
  children: ReactNode;
  position?: 'bottom' | 'top' | 'left' | 'right';
}

export default function Tooltip({ text, hint, children, position = 'bottom' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 600);
  };

  const hide = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setVisible(false);
  };

  return (
    <div className="tooltip-wrapper" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className={`tooltip-box tooltip-box--${position}`} role="tooltip">
          <span>{text}</span>
          {hint && <span className="tooltip-hint">{hint}</span>}
        </div>
      )}
    </div>
  );
}
