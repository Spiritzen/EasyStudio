import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useExportStore } from '../../store/exportStore';
import { useTransitionStore } from '../../store/transitionStore';
import { toSVG, toPNG, toJPEG, toWebP, toPDF } from '../../utils/exportUtils';
import { generateCode } from '../../utils/codeGenerator';
import { generateHTMLPreview } from '../../utils/transitionEngine';
import { toast } from '../../store/toastStore';
import Tooltip from '../UI/Tooltip';
import './Toolbar.css';

const FORMATS = [
  { id: 'svg', label: 'SVG', icon: '◈', desc: 'Vectoriel' },
  { id: 'pdf', label: 'PDF', icon: '📄', desc: 'Document' },
  { id: 'png', label: 'PNG', icon: '🖼', desc: 'Haute résolution ×2' },
  { id: 'webp', label: 'WebP', icon: '⚡', desc: 'Web optimisé' },
  { id: 'jpeg', label: 'JPEG', icon: '🏞', desc: 'Compression' },
  { id: 'html',      label: 'HTML/CSS',   icon: '⟨⟩', desc: 'Code intégrable' },
  { id: 'animated',  label: 'HTML animé', icon: '🎬', desc: 'Transition exportée' },
] as const;

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { canvasInstance } = useCanvasStore();
  const { openCodeModal } = useExportStore();
  const { transitions, states } = useTransitionStore();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExport = async (format: string) => {
    if (!canvasInstance) return;
    setExporting(format);
    setOpen(false);
    try {
      if (format === 'svg') toSVG(canvasInstance);
      else if (format === 'png') toPNG(canvasInstance);
      else if (format === 'jpeg') toJPEG(canvasInstance);
      else if (format === 'webp') await toWebP(canvasInstance);
      else if (format === 'pdf') await toPDF(canvasInstance);
      else if (format === 'html') {
        const code = generateCode(canvasInstance);
        openCodeModal(code);
      }
      else if (format === 'animated') {
        const tr = transitions[0];
        if (!tr) { toast.error('Aucune transition configurée'); return; }
        const fromState = states.find((s) => s.id === tr.fromStateId);
        const toState   = states.find((s) => s.id === tr.toStateId);
        if (!fromState || !toState) { toast.error('États introuvables'); return; }
        const html = generateHTMLPreview(fromState, toState, tr);
        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'animation.html';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success('HTML animé téléchargé ✓');
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="export-wrapper" ref={menuRef}>
      <Tooltip text="Exporter" hint="SVG · PNG · PDF · WebP · JPEG · HTML/CSS">
        <button className="toolbar-btn export-btn" onClick={() => setOpen(!open)}>
          {exporting ? <span className="tb-spinner" /> : '↓'} Exporter ▾
        </button>
      </Tooltip>

      {open && (
        <div className="export-dropdown">
          <div className="export-dropdown-title">Choisir un format</div>
          {FORMATS.map((f) => (
            <button key={f.id} className="export-item" onClick={() => handleExport(f.id)}>
              <span className="export-item-icon">{f.icon}</span>
              <span className="export-item-info">
                <span className="export-item-label">{f.label}</span>
                <span className="export-item-desc">{f.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
