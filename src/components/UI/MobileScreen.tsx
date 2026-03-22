/**
 * @file MobileScreen.tsx
 * @description Écran de substitution affiché sur les appareils mobiles (< 768px).
 * Informe l'utilisateur qu'EasyStudio est optimisé pour desktop, propose un bouton
 * de copie du lien et un QR code généré via qrserver.com.
 * @module UI
 */

import { useState } from 'react';
import './MobileScreen.css';

const APP_URL = 'https://spiritzen.github.io/EasyStudio/';

// QR Code via API gratuite qrserver.com
const QR_URL =
  `https://api.qrserver.com/v1/create-qr-code/` +
  `?size=160x160` +
  `&data=${encodeURIComponent(APP_URL)}` +
  `&bgcolor=0d0d14` +
  `&color=f0a500` +
  `&format=svg`;

/**
 * @component MobileScreen
 * @description Page mobile affichée quand la largeur d'écran est inférieure à 768px.
 * Propose un QR code et un bouton de copie pour rediriger vers un poste desktop.
 * @returns JSX de l'écran mobile.
 */
export default function MobileScreen() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
    } catch {
      // Fallback pour navigateurs sans API Clipboard ou sans HTTPS
      const input = document.createElement('input');
      input.value = APP_URL;
      input.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(input);
      input.focus();
      input.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch {
        alert('Copiez ce lien : ' + APP_URL);
      }
      document.body.removeChild(input);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mobile-screen">

      {/* Header */}
      <div className="ms-header">
        <div className="ms-logo">EasyStudio</div>
        <div className="ms-tagline">
          Outil de création visuelle open source
        </div>
      </div>

      {/* Message principal */}
      <div className="ms-card">
        <div className="ms-card-icon">
          <svg viewBox="0 0 24 24" width="32" height="32"
            fill="none" stroke="currentColor"
            strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
        </div>
        <div className="ms-card-title">
          Optimisé pour desktop
        </div>
        <div className="ms-card-text">
          EasyStudio est un outil de création
          professionnelle qui nécessite un écran
          plus large pour offrir la meilleure
          expérience — comme Figma ou Photoshop.
        </div>
      </div>

      {/* Bouton copier */}
      <button
        className="ms-copy-btn"
        onClick={handleCopy}
      >
        {copied ? '✓ Lien copié !' : 'Copier le lien'}
      </button>

      {/* QR Code */}
      <div className="ms-qr-section">
        <div className="ms-qr-label">
          Scannez pour ouvrir sur votre ordinateur
        </div>
        <div className="ms-qr-wrapper">
          <img
            src={QR_URL}
            alt="QR Code EasyStudio"
            width="160"
            height="160"
          />
        </div>
      </div>

      {/* Features rapides */}
      <div className="ms-features">
        <div className="ms-feature">
          Canvas vectoriel · Export SVG/PNG/PDF
        </div>
        <div className="ms-feature">
          Transitions animées · Export CSS
        </div>
        <div className="ms-feature">
          Module IA · 100% gratuit · Open source
        </div>
      </div>

      {/* Footer links */}
      <div className="ms-footer">
        <a href="https://github.com/Spiritzen/EasyStudio"
          target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span>·</span>
        <a href="https://spiritzen.github.io/portfolio/"
          target="_blank" rel="noopener noreferrer">
          Portfolio
        </a>
        <span>·</span>
        <a href="https://www.linkedin.com/in/sebastien-cantrelle-26b695106/"
          target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      </div>

    </div>
  );
}
