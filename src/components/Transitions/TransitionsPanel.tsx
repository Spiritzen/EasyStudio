import { useState, useRef, useEffect } from 'react';
import { useTransitionStore } from '../../store/transitionStore';
import type { TransitionType, EasingType, TransitionConfig } from '../../store/transitionStore';
import { useCanvasStore } from '../../store/canvasStore';
import { toast } from '../../store/toastStore';
import { playTransition, generateCSSKeyframes, generateHTMLPreview } from '../../utils/transitionEngine';
import './TransitionsPanel.css';

const TRANSITION_TYPES: { value: TransitionType; label: string }[] = [
  { value: 'fade',       label: 'Fondu' },
  { value: 'slideLeft',  label: 'Glisser gauche' },
  { value: 'slideRight', label: 'Glisser droite' },
  { value: 'slideUp',    label: 'Glisser haut' },
  { value: 'slideDown',  label: 'Glisser bas' },
  { value: 'zoomIn',     label: 'Zoom avant' },
  { value: 'zoomOut',    label: 'Zoom arrière' },
  { value: 'rotate',     label: 'Rotation' },
  { value: 'flip',       label: 'Flip' },
  { value: 'morph',      label: 'Morphing' },
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
    states,
    fromStateId, toStateId,
    setFromStateId, setToStateId,
    captureState, deleteState, renameState,
    isPlaying, setPlaying,
  } = useTransitionStore();
  const { canvasInstance } = useCanvasStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal]   = useState('');
  const [looping, setLooping]       = useState(false);
  const loopRef   = useRef(false);
  const cancelRef = useRef<(() => void) | null>(null);

  // Annule toute animation en cours au démontage du composant
  useEffect(() => {
    return () => { cancelRef.current?.(); };
  }, []);

  const [draft, setDraft] = useState({
    type:     'fade' as TransitionType,
    duration: 0.6,
    easing:   'power2.out' as EasingType,
    delay:    0,
    stagger:  0,
  });

  // ── Capture ──
  const handleCapture = () => {
    if (!canvasInstance) return;
    captureState(canvasInstance);
    toast.success('État capturé ✓');
  };

  // ── Play ──
  const canPlay = states.length >= 2 && !!fromStateId && !!toStateId && fromStateId !== toStateId;

  const handlePlay = (loop = false) => {
    if (!canvasInstance || isPlaying || !canPlay) return;

    const fromState = states.find((s) => s.id === fromStateId);
    const toState   = states.find((s) => s.id === toStateId);
    if (!fromState || !toState) return;

    const config: TransitionConfig = {
      id: 'preview',
      fromStateId: fromStateId!,
      toStateId:   toStateId!,
      ...draft,
    };

    // Annule toute animation précédente
    cancelRef.current?.();
    setPlaying(true);
    loopRef.current = loop;
    if (loop) setLooping(true);

    const runNext = () => {
      if (!loopRef.current) {
        setLooping(false);
        setPlaying(false);
        cancelRef.current = null;
        return;
      }
      const { cancel } = playTransition(
        canvasInstance, fromState.fabricJSON, toState.fabricJSON, config, runNext
      );
      cancelRef.current = cancel;
    };

    const onFirstDone = loop ? runNext : () => {
      setPlaying(false);
      cancelRef.current = null;
    };

    const { cancel } = playTransition(
      canvasInstance, fromState.fabricJSON, toState.fabricJSON, config, onFirstDone
    );
    cancelRef.current = cancel;
  };

  const handleStop = () => {
    loopRef.current = false;
    cancelRef.current?.();
    cancelRef.current = null;
    setPlaying(false);
    setLooping(false);
  };

  // ── Export ──
  const handleCopyCSS = () => {
    if (!fromStateId || !toStateId) { toast.error('Sélectionnez De et Vers'); return; }
    const config: TransitionConfig = {
      id: 'export', fromStateId: fromStateId!, toStateId: toStateId!, ...draft,
    };
    const names = states.map((s) => s.name);
    navigator.clipboard.writeText(generateCSSKeyframes(config, names))
      .then(() => toast.success('CSS copié ✓'));
  };

  const handleDownloadHTML = () => {
    const fromState = states.find((s) => s.id === fromStateId);
    const toState   = states.find((s) => s.id === toStateId);
    if (!fromState || !toState) { toast.error('Sélectionnez De et Vers'); return; }
    const config: TransitionConfig = {
      id: 'export', fromStateId: fromStateId!, toStateId: toStateId!, ...draft,
    };
    const html = generateHTMLPreview(fromState, toState, config);
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'animation.html'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('HTML téléchargé ✓');
  };

  return (
    <div className="transitions-panel">

      {/* ── States ── */}
      <div className="tr-section">
        <div className="tr-section-header">
          <span className="tr-section-title">
            États
            {states.length > 0 && (
              <span className="tr-state-count">{states.length}</span>
            )}
          </span>
          <button className="tr-btn-icon" onClick={handleCapture} title="Capturer l'état actuel">
            + Capturer
          </button>
        </div>

        {states.length === 0 ? (
          <p className="tr-empty" style={{ color: 'var(--es-gold)', fontSize: 11 }}>
            Capturez au moins 2 états pour animer
          </p>
        ) : states.length === 1 ? (
          <>
            <div className="tr-states-grid">
              {states.map((st) => (
                <div key={st.id} className="tr-state-card">
                  <div className="tr-state-thumb" style={{ backgroundImage: `url(${st.thumbnail})` }} />
                  <span className="tr-state-name">{st.name}</span>
                  <button className="tr-state-del" onClick={() => deleteState(st.id)}>×</button>
                </div>
              ))}
            </div>
            <p className="tr-empty" style={{ color: 'var(--es-gold)', fontSize: 11, marginTop: 6 }}>
              Capturez au moins 2 états pour animer
            </p>
          </>
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
                <button className="tr-state-del" onClick={() => deleteState(st.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Config ── */}
      {states.length >= 2 && (
        <div className="tr-section">
          <div className="tr-section-title" style={{ marginBottom: 10 }}>Configuration</div>
          <div className="tr-config">

            {/* De / Vers */}
            <div className="tr-row">
              <label>De</label>
              <select value={fromStateId ?? ''} onChange={(e) => setFromStateId(e.target.value || null)}>
                <option value="">— État A —</option>
                {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="tr-row">
              <label>Vers</label>
              <select value={toStateId ?? ''} onChange={(e) => setToStateId(e.target.value || null)}>
                <option value="">— État B —</option>
                {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Type */}
            <div className="tr-row">
              <label>Type</label>
              <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as TransitionType }))}>
                {TRANSITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Easing */}
            <div className="tr-row">
              <label>Easing</label>
              <select value={draft.easing} onChange={(e) => setDraft((d) => ({ ...d, easing: e.target.value as EasingType }))}>
                {EASING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Sliders */}
            {([
              { key: 'duration', label: 'Durée',    min: 0.1, max: 3.0, step: 0.1,  unit: 's' },
              { key: 'delay',    label: 'Délai',    min: 0,   max: 2.0, step: 0.1,  unit: 's' },
              { key: 'stagger',  label: 'Décalage', min: 0,   max: 0.5, step: 0.05, unit: 's' },
            ] as const).map(({ key, label, min, max, step, unit }) => (
              <div className="tr-row tr-slider-row" key={key}>
                <label>{label}</label>
                <input
                  type="range" min={min} max={max} step={step}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: parseFloat(e.target.value) }))}
                />
                <span className="tr-slider-val">{draft[key]}{unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="tr-controls">
        <button
          className="tr-ctrl-btn tr-play"
          onClick={() => handlePlay(false)}
          disabled={!canPlay || isPlaying}
          title="Jouer"
        >
          ▶ Jouer
        </button>
        <button
          className={`tr-ctrl-btn tr-loop ${looping ? 'active' : ''}`}
          onClick={() => handlePlay(true)}
          disabled={!canPlay || isPlaying}
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
        <button className="tr-btn-export" onClick={handleCopyCSS} disabled={!canPlay}>
          Copier CSS
        </button>
        <button className="tr-btn-export" onClick={handleDownloadHTML} disabled={!canPlay}>
          HTML animé
        </button>
      </div>

    </div>
  );
}
