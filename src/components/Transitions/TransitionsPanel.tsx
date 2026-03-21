import { useState, useRef } from 'react';
import { useTransitionStore } from '../../store/transitionStore';
import type { TransitionType, EasingType } from '../../store/transitionStore';
import { useCanvasStore } from '../../store/canvasStore';
import { toast } from '../../store/toastStore';
import { playTransition, generateCSSKeyframes, generateHTMLPreview } from '../../utils/transitionEngine';
import './TransitionsPanel.css';

const TRANSITION_TYPES: { value: TransitionType; label: string }[] = [
  { value: 'fade',      label: '⬛ Fondu' },
  { value: 'slideLeft', label: '◀ Glisser gauche' },
  { value: 'slideRight',label: '▶ Glisser droite' },
  { value: 'slideUp',   label: '▲ Glisser haut' },
  { value: 'slideDown', label: '▼ Glisser bas' },
  { value: 'zoomIn',    label: '🔍 Zoom avant' },
  { value: 'zoomOut',   label: '🔍 Zoom arrière' },
  { value: 'rotate',    label: '↻ Rotation' },
  { value: 'flip',      label: '⇄ Flip' },
  { value: 'morph',     label: '✦ Morphing' },
];

const EASING_TYPES: { value: EasingType; label: string }[] = [
  { value: 'linear',      label: 'Linéaire' },
  { value: 'power1.out',  label: 'Douce' },
  { value: 'power2.out',  label: 'Fluide' },
  { value: 'power3.out',  label: 'Rapide' },
  { value: 'back.out',    label: 'Rebond léger' },
  { value: 'elastic.out', label: 'Élastique' },
  { value: 'bounce.out',  label: 'Rebond' },
  { value: 'circ.out',    label: 'Circulaire' },
];

export default function TransitionsPanel() {
  const {
    states, transitions,
    captureState, deleteState, renameState,
    addTransition, updateTransition, deleteTransition,
    isPlaying, setPlaying,
  } = useTransitionStore();
  const { canvasInstance } = useCanvasStore();

  const [selectedTrId, setSelectedTrId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal]     = useState('');
  const [looping, setLooping]         = useState(false);
  const loopRef = useRef(false);

  // ── selected transition or draft ──
  const [draft, setDraft] = useState({
    fromStateId: '',
    toStateId: '',
    type: 'fade' as TransitionType,
    duration: 0.6,
    easing: 'power2.out' as EasingType,
    delay: 0,
    stagger: 0,
  });

  const selectedTr = transitions.find((t) => t.id === selectedTrId) ?? null;

  const handleCapture = () => {
    if (!canvasInstance) return;
    captureState(canvasInstance);
    toast.success('État capturé ✓');
  };

  const handlePlay = async (loop = false) => {
    if (!canvasInstance || isPlaying) return;
    const config = selectedTr ?? null;
    if (!config) { toast.error('Sélectionnez une transition'); return; }

    const fromState = states.find((s) => s.id === config.fromStateId);
    const toState   = states.find((s) => s.id === config.toStateId);
    if (!fromState || !toState) { toast.error('États introuvables'); return; }

    setPlaying(true);
    loopRef.current = loop;

    const runOnce = async () => {
      await playTransition(canvasInstance, fromState.fabricJSON, toState.fabricJSON, config);
    };

    if (loop) {
      setLooping(true);
      const runLoop = async () => {
        while (loopRef.current) {
          await runOnce();
        }
        setLooping(false);
        setPlaying(false);
      };
      runLoop();
    } else {
      await runOnce();
      setPlaying(false);
    }
  };

  const handleStop = () => {
    loopRef.current = false;
    setPlaying(false);
    setLooping(false);
  };

  const handleCopyCSS = () => {
    if (!selectedTr) { toast.error('Sélectionnez une transition'); return; }
    const names = states.map((s) => s.name);
    const css = generateCSSKeyframes(selectedTr, names);
    navigator.clipboard.writeText(css).then(() => toast.success('CSS copié ✓'));
  };

  const handleDownloadHTML = () => {
    if (!selectedTr) { toast.error('Sélectionnez une transition'); return; }
    const fromState = states.find((s) => s.id === selectedTr.fromStateId);
    const toState   = states.find((s) => s.id === selectedTr.toStateId);
    if (!fromState || !toState) { toast.error('États introuvables'); return; }

    const html = generateHTMLPreview(fromState, toState, selectedTr);
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'animation.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('HTML téléchargé ✓');
  };

  const handleAddTransition = () => {
    if (!draft.fromStateId || !draft.toStateId) {
      toast.error('Choisissez État A et État B');
      return;
    }
    addTransition(draft);
    toast.success('Transition ajoutée ✓');
  };

  const handleUpdateField = (field: string, value: any) => {
    if (selectedTr) {
      updateTransition(selectedTr.id, { [field]: value });
    } else {
      setDraft((d) => ({ ...d, [field]: value }));
    }
  };

  const cfg = selectedTr ?? draft;

  return (
    <div className="transitions-panel">

      {/* ── States ── */}
      <div className="tr-section">
        <div className="tr-section-header">
          <span className="tr-section-title">États</span>
          <button className="tr-btn-icon" onClick={handleCapture} title="Capturer l'état actuel">
            + Capturer
          </button>
        </div>

        {states.length === 0 ? (
          <p className="tr-empty">Aucun état capturé. Cliquez sur "+ Capturer".</p>
        ) : (
          <div className="tr-states-grid">
            {states.map((st) => (
              <div key={st.id} className="tr-state-card">
                <div
                  className="tr-state-thumb"
                  style={{ backgroundImage: `url(${st.thumbnail})` }}
                  title={st.name}
                />
                {renamingId === st.id ? (
                  <input
                    className="tr-rename-input"
                    value={renameVal}
                    autoFocus
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => { renameState(st.id, renameVal || st.name); setRenamingId(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { renameState(st.id, renameVal || st.name); setRenamingId(null); }
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                ) : (
                  <span
                    className="tr-state-name"
                    onDoubleClick={() => { setRenamingId(st.id); setRenameVal(st.name); }}
                    title="Double-clic pour renommer"
                  >
                    {st.name}
                  </span>
                )}
                <button
                  className="tr-state-del"
                  onClick={() => deleteState(st.id)}
                  title="Supprimer cet état"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Transitions list ── */}
      <div className="tr-section">
        <div className="tr-section-header">
          <span className="tr-section-title">Transitions</span>
        </div>

        {transitions.length === 0 ? (
          <p className="tr-empty">Aucune transition. Configurez ci-dessous.</p>
        ) : (
          <div className="tr-list">
            {transitions.map((t) => {
              const from = states.find((s) => s.id === t.fromStateId);
              const to   = states.find((s) => s.id === t.toStateId);
              return (
                <div
                  key={t.id}
                  className={`tr-list-item ${selectedTrId === t.id ? 'active' : ''}`}
                  onClick={() => setSelectedTrId(selectedTrId === t.id ? null : t.id)}
                >
                  <span className="tr-list-label">
                    {from?.name ?? '?'} → {to?.name ?? '?'}
                  </span>
                  <span className="tr-list-type">{t.type}</span>
                  <button
                    className="tr-state-del"
                    onClick={(e) => { e.stopPropagation(); deleteTransition(t.id); if (selectedTrId === t.id) setSelectedTrId(null); }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Config ── */}
      <div className="tr-section">
        <div className="tr-section-title" style={{ marginBottom: 10 }}>
          {selectedTr ? 'Modifier la transition' : 'Nouvelle transition'}
        </div>

        <div className="tr-config">
          {/* From / To */}
          <div className="tr-row">
            <label>De</label>
            <select value={cfg.fromStateId} onChange={(e) => handleUpdateField('fromStateId', e.target.value)}>
              <option value="">— État A —</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="tr-row">
            <label>Vers</label>
            <select value={cfg.toStateId} onChange={(e) => handleUpdateField('toStateId', e.target.value)}>
              <option value="">— État B —</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Type */}
          <div className="tr-row">
            <label>Type</label>
            <select value={cfg.type} onChange={(e) => handleUpdateField('type', e.target.value as TransitionType)}>
              {TRANSITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Easing */}
          <div className="tr-row">
            <label>Easing</label>
            <select value={cfg.easing} onChange={(e) => handleUpdateField('easing', e.target.value as EasingType)}>
              {EASING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Sliders */}
          {[
            { key: 'duration', label: 'Durée', min: 0.1, max: 3.0, step: 0.1, unit: 's' },
            { key: 'delay',    label: 'Délai',  min: 0,   max: 2.0, step: 0.1, unit: 's' },
            { key: 'stagger',  label: 'Décalage',min: 0,  max: 0.5, step: 0.05,unit: 's' },
          ].map(({ key, label, min, max, step, unit }) => (
            <div className="tr-row tr-slider-row" key={key}>
              <label>{label}</label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={(cfg as any)[key]}
                onChange={(e) => handleUpdateField(key, parseFloat(e.target.value))}
              />
              <span className="tr-slider-val">{(cfg as any)[key]}{unit}</span>
            </div>
          ))}

          {!selectedTr && (
            <button className="tr-btn-add" onClick={handleAddTransition}>
              + Ajouter cette transition
            </button>
          )}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="tr-controls">
        <button
          className="tr-ctrl-btn tr-play"
          onClick={() => handlePlay(false)}
          disabled={isPlaying || !selectedTr}
          title="Jouer"
        >
          ▶ Jouer
        </button>
        <button
          className={`tr-ctrl-btn tr-loop ${looping ? 'active' : ''}`}
          onClick={() => handlePlay(true)}
          disabled={isPlaying || !selectedTr}
          title="Boucle"
        >
          ⟳ Boucle
        </button>
        <button
          className="tr-ctrl-btn tr-stop"
          onClick={handleStop}
          disabled={!isPlaying}
          title="Stop"
        >
          ⏹ Stop
        </button>
      </div>

      {/* ── Export ── */}
      <div className="tr-export-row">
        <button className="tr-btn-export" onClick={handleCopyCSS} disabled={!selectedTr}>
          📋 Copier CSS
        </button>
        <button className="tr-btn-export" onClick={handleDownloadHTML} disabled={!selectedTr}>
          ⬇ HTML animé
        </button>
      </div>

    </div>
  );
}
