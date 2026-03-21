import { useState, useRef, useEffect } from 'react';
import { useBackgroundStore } from '../../store/backgroundStore';
import './BackgroundPicker.css';

const DARK_PRESETS = [
  { color: '#1a1a2e', label: 'Bleu nuit' },
  { color: '#0f172a', label: 'Ardoise foncée' },
  { color: '#1e293b', label: 'Ardoise' },
  { color: '#18181b', label: 'Zinc foncé' },
  { color: '#09090b', label: 'Zinc très foncé' },
  { color: '#1c1917', label: 'Pierre foncée' },
  { color: '#1a1a1a', label: 'Gris foncé' },
  { color: '#1e1e1e', label: 'Gris très foncé' },
];

const LIGHT_PRESETS = [
  { color: '#ffffff', label: 'Blanc pur' },
  { color: '#f8fafc', label: 'Ardoise claire' },
  { color: '#f1f5f9', label: 'Ardoise pâle' },
  { color: '#fafafa', label: 'Zinc clair' },
  { color: '#fef9f0', label: 'Crème' },
  { color: '#f0f4ff', label: 'Lavande' },
  { color: '#f0fff4', label: 'Menthe' },
  { color: '#fff0f6', label: 'Rose pâle' },
];

function isValidHex(v: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

export default function BackgroundPicker() {
  const { bgColor, bgOpacity, bgTransparent, setBgColor, setBgOpacity, setBgTransparent } = useBackgroundStore();

  const [open, setOpen] = useState(false);
  const [hexVal, setHexVal] = useState(bgColor);
  const [hexInvalid, setHexInvalid] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Position dropdown below button
  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen(true);
  };

  // Sync hex field when color changes externally
  useEffect(() => {
    if (!bgTransparent) setHexVal(bgColor);
  }, [bgColor, bgTransparent]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleHexChange = (v: string) => {
    setHexVal(v);
    if (isValidHex(v)) {
      setHexInvalid(false);
      setBgColor(v);
    } else {
      setHexInvalid(true);
    }
  };

  const handleNativeColor = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    const v = (e.target as HTMLInputElement).value;
    setHexVal(v);
    setHexInvalid(false);
    setBgColor(v);
  };

  const handlePreset = (color: string) => {
    setBgColor(color);
    setHexVal(color);
    setHexInvalid(false);
  };

  return (
    <div className="bg-picker-wrapper" ref={wrapperRef}>
      {/* Trigger */}
      <button
        ref={btnRef}
        className="bg-picker-btn"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        title="Couleur de fond"
      >
        {bgTransparent ? (
          <span className="bg-picker-swatch bg-picker-swatch--transparent" />
        ) : (
          <span
            className="bg-picker-swatch"
            style={{ backgroundColor: bgColor, opacity: bgOpacity / 100 }}
          />
        )}
        <span>Fond</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="bg-picker-dropdown"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {/* Section 1: Transparent */}
          <div className="bg-section-label">Transparent</div>
          <button
            className={`bg-transparent-btn ${bgTransparent ? 'active' : ''}`}
            onClick={() => setBgTransparent(true)}
          >
            <span className="bg-damier" />
            Arrière-plan transparent
          </button>

          {/* Section 2: Dark presets */}
          <div className="bg-section-label" style={{ marginTop: 10 }}>Tons sombres</div>
          <div className="bg-color-grid">
            {DARK_PRESETS.map((p) => (
              <button
                key={p.color}
                className={`bg-color-swatch ${!bgTransparent && bgColor === p.color ? 'active' : ''}`}
                style={{ backgroundColor: p.color }}
                title={p.label}
                onClick={() => handlePreset(p.color)}
              />
            ))}
          </div>

          {/* Section 3: Light presets */}
          <div className="bg-section-label" style={{ marginTop: 8 }}>Tons clairs</div>
          <div className="bg-color-grid">
            {LIGHT_PRESETS.map((p) => (
              <button
                key={p.color}
                className={`bg-color-swatch ${!bgTransparent && bgColor === p.color ? 'active' : ''}`}
                style={{ backgroundColor: p.color }}
                title={p.label}
                onClick={() => handlePreset(p.color)}
              />
            ))}
          </div>

          <div className="bg-sep" />

          {/* Section 4: Custom hex + native picker */}
          <div className="bg-section-label">Couleur personnalisée</div>
          <div className="bg-hex-row">
            <input
              className={`bg-hex-input ${hexInvalid ? 'invalid' : ''}`}
              value={hexVal}
              onChange={(e) => handleHexChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValidHex(hexVal)) {
                  setBgColor(hexVal);
                }
              }}
              placeholder="#000000"
              spellCheck={false}
              maxLength={7}
            />
            <input
              type="color"
              className="bg-color-native"
              value={bgTransparent ? '#ffffff' : bgColor}
              onChange={handleNativeColor}
              onInput={handleNativeColor}
              title="Choisir une couleur"
            />
          </div>

          <div className="bg-sep" />

          {/* Section 5: Opacity */}
          <div className="bg-section-label">Opacité</div>
          <div className="bg-opacity-row">
            <input
              type="range"
              className="bg-opacity-slider"
              min={0}
              max={100}
              value={bgOpacity}
              onChange={(e) => setBgOpacity(Number(e.target.value))}
            />
            <span className="bg-opacity-val">{bgOpacity}%</span>
          </div>

          {/* Export badge */}
          <span className="bg-export-badge">✓ Non visible dans vos exports</span>
        </div>
      )}
    </div>
  );
}
