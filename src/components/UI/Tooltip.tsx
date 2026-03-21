import { useState, useRef, type ReactNode } from 'react';
import './Tooltip.css';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
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
        <div className="tooltip-box" role="tooltip">
          {content.split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
      )}
    </div>
  );
}
