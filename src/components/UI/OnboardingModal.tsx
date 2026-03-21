import { useState, useEffect } from 'react';
import './OnboardingModal.css';

const STORAGE_KEY = 'easystudio-visited';

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
        <div className="onboarding-header">
          <span className="onboarding-icon">⚡</span>
          <h2 className="onboarding-title">Bienvenue sur EasyStudio !</h2>
        </div>

        <p className="onboarding-tagline">
          L'outil de création visuelle<br />open source pour développeurs
        </p>

        <ul className="onboarding-features">
          <li><span className="feat-icon">🎨</span> Créez logos et vignettes</li>
          <li><span className="feat-icon">⚡</span> Animez avec des transitions</li>
          <li><span className="feat-icon">📦</span> Exportez en SVG · PNG · HTML/CSS</li>
          <li><span className="feat-icon">🤖</span> Générez avec l'IA (optionnel)</li>
        </ul>

        <div className="onboarding-divider" />

        <div className="onboarding-tip">
          <span className="tip-icon">💡</span>
          <div>
            <strong>Astuce de départ :</strong><br />
            Glissez directement une image sur<br />le canvas blanc pour commencer !
          </div>
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-btn-ghost" onClick={() => dismiss(true)}>
            Ne plus afficher
          </button>
          <button className="onboarding-btn-primary" onClick={() => dismiss(true)}>
            C'est parti ! →
          </button>
        </div>
      </div>
    </div>
  );
}
