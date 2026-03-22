/**
 * @file OnboardingModal.tsx
 * @description Modale d'accueil affichée automatiquement à la première visite.
 * Présente les fonctionnalités clés d'EasyStudio et propose de ne plus afficher la modale.
 * La suppression permanente est persistée dans le localStorage.
 * @module components/UI/OnboardingModal
 */

import { useState, useEffect } from 'react';
import './OnboardingModal.css';

const STORAGE_KEY = 'easystudio-visited';

const FEATURES = [
  'Canvas vectoriel — logos, vignettes, boutons',
  'Transitions animées — export CSS keyframes',
  'Export SVG · PNG · PDF · HTML/CSS',
  'Module IA optionnel — votre clé Anthropic',
];

/**
 * @component OnboardingModal
 * @description Modale d'introduction affichée à la première visite. Présente les
 * fonctionnalités clés et propose "Ne plus afficher" pour une suppression définitive.
 * @returns JSX de la modale, ou null si déjà affichée précédemment.
 */
export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem(STORAGE_KEY);
    if (visited === null) setVisible(true);
  }, []);

  const dismiss = (permanent: boolean) => {
    if (permanent) localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="onboarding-backdrop" onClick={() => dismiss(false)}>
      <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ob-logo">EasyStudio</div>
        <div className="ob-tagline">Outil de création visuelle open source</div>

        <div className="ob-features">
          {FEATURES.map((f) => (
            <div key={f} className="ob-feature">{f}</div>
          ))}
        </div>

        <div className="ob-tip">
          Glissez une image sur le canvas pour commencer instantanément
        </div>

        <div className="onboarding-actions">
          <button className="ob-skip" onClick={() => dismiss(true)}>
            Ne plus afficher
          </button>
          <button className="ob-start" onClick={() => dismiss(true)}>
            Commencer →
          </button>
        </div>
      </div>
    </div>
  );
}
