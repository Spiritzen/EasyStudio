/**
 * @file Tooltip.tsx
 * @description Composant infobulle affichée après un délai de 600 ms au survol.
 * Supporte un texte principal, un sous-texte (hint) et quatre positions.
 * @module components/UI/Tooltip
 */

import { useState, useRef, type ReactNode } from 'react';
import './Tooltip.css';

/**
 * @interface TooltipProps
 * @description Props du composant Tooltip.
 */
interface TooltipProps {
  text: string;
  hint?: string;
  children: ReactNode;
  position?: 'bottom' | 'top' | 'left' | 'right';
}

/**
 * @component Tooltip
 * @description Enveloppe un élément enfant et affiche une infobulle positionnée
 * après 600 ms de survol. Supporte un texte principal et un texte secondaire (hint).
 * @returns JSX du composant Tooltip.
 */
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
