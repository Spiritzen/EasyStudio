import { useState } from 'react';
import { useAIStore } from '../../store/aiStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useAI } from './useAI';
import { addSVGFromString } from '../../utils/fabricHelpers';
import './AIPanel.css';

const SUGGESTIONS = [
  'Logo pour une boulangerie artisanale, style minimaliste',
  'Logo tech startup, lettres géométriques modernes',
  'Emblème vintage pour un coffee shop',
  'Icône abstraite pour une app de méditation',
  'Logo médical propre et professionnel',
];

export default function AIPanel() {
  const { apiKey, setApiKey, isGenerating, error, promptHistory } = useAIStore();
  const { canvasInstance } = useCanvasStore();
  const { generateSVG } = useAI();
  const [prompt, setPrompt] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const svg = await generateSVG(prompt.trim());
    if (svg && canvasInstance) {
      addSVGFromString(canvasInstance, svg);
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span className="ai-icon">✦</span>
        <span>Assistant IA</span>
      </div>

      <div className="ai-panel-body">
        {/* API Key */}
        <div className="ai-key-section">
          <label className="ai-label">Clé API Anthropic</label>
          <div className="ai-key-input-row">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="ai-input"
            />
            <button className="ai-icon-btn" onClick={() => setShowKey(!showKey)}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <p className="ai-hint">Stockée localement, jamais envoyée ailleurs.</p>
        </div>

        {/* Prompt */}
        <div className="ai-prompt-section">
          <label className="ai-label">Décrivez votre logo</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex : Logo minimaliste pour une boulangerie artisanale..."
            className="ai-textarea"
            rows={4}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleGenerate(); }}
          />

          {/* Suggestions */}
          <div className="ai-suggestions">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button key={s} className="ai-suggestion" onClick={() => setPrompt(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          className={`ai-generate-btn ${isGenerating ? 'loading' : ''}`}
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim() || !apiKey}
        >
          {isGenerating ? (
            <span className="ai-spinner" />
          ) : (
            '✦ Générer le logo'
          )}
        </button>

        {error && (
          <div className="ai-error">
            <span>⚠</span> {error}
          </div>
        )}

        {/* History */}
        {promptHistory.length > 0 && (
          <div className="ai-history">
            <div className="ai-label" style={{ marginBottom: 6 }}>Historique</div>
            {promptHistory.slice(0, 5).map((h) => (
              <button key={h.id} className="ai-history-item" onClick={() => setPrompt(h.prompt)}>
                {h.prompt.slice(0, 50)}{h.prompt.length > 50 ? '…' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
