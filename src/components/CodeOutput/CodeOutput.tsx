import { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';
import { useExportStore } from '../../store/exportStore';
import './CodeOutput.css';

hljs.registerLanguage('html', xml);

export default function CodeOutput() {
  const { isCodeModalOpen, generatedCode, closeCodeModal } = useExportStore();
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current && isCodeModalOpen) {
      codeRef.current.textContent = generatedCode;
      hljs.highlightElement(codeRef.current);
    }
  }, [generatedCode, isCodeModalOpen]);

  if (!isCodeModalOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      const btn = document.getElementById('copy-btn');
      if (btn) { btn.textContent = '✓ Copié !'; setTimeout(() => { btn.textContent = 'Copier'; }, 2000); }
    });
  };

  return (
    <div className="code-overlay" onClick={closeCodeModal}>
      <div className="code-modal" onClick={(e) => e.stopPropagation()}>
        <div className="code-modal-header">
          <span>Code HTML/CSS généré</span>
          <div className="code-modal-actions">
            <button id="copy-btn" className="code-action-btn" onClick={handleCopy}>Copier</button>
            <button className="code-close-btn" onClick={closeCodeModal}>✕</button>
          </div>
        </div>
        <div className="code-modal-body">
          <pre className="code-pre"><code ref={codeRef} className="language-html" /></pre>
        </div>
        <div className="code-modal-footer">
          <p>Collez ce code dans votre HTML. Aucune dépendance externe requise.</p>
        </div>
      </div>
    </div>
  );
}
