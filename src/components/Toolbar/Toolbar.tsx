import { useState, useRef } from 'react';
import { fabric } from 'fabric';
import { useCanvasStore } from '../../store/canvasStore';
import { useProjectStore } from '../../store/projectStore';
import DrawingToolbar from '../Drawing/DrawingToolbar';
import {
  addRect, addCircle, addTriangle, addText,
  addImage, addSVGFromFile,
} from '../../utils/fabricHelpers';
import ExportMenu from './ExportMenu';
import FileMenu from './FileMenu';
import ToolsMenu from './ToolsMenu';
import URLImportModal from './URLImportModal';
import BackgroundPicker from './BackgroundPicker';
import './Toolbar.css';

type Tab = 'Fichier' | 'Templates' | 'Outils' | 'IA';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onShowTemplates: () => void;
  onOpenProject: () => void;
  onNewProject: () => void;
}

export default function Toolbar({ activeTab, onTabChange, onShowTemplates, onOpenProject, onNewProject }: Props) {
  const { canvasInstance, history, historyIndex, isDrawingMode, setDrawingMode } = useCanvasStore();
  const { title, setTitle } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showURLModal, setShowURLModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [openMenu, setOpenMenu] = useState<'file' | 'tools' | null>(null);

  // ─── Title ───────────────────────────────────────────────────────

  const handleTitleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false);
  };

  // ─── File input ───────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasInstance) return;
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      addSVGFromFile(canvasInstance, file);
    } else {
      const url = URL.createObjectURL(file);
      addImage(canvasInstance, url);
    }
    e.target.value = '';
  };

  const handleUndo = () => {
    const json = useCanvasStore.getState().undo();
    if (json && canvasInstance)
      canvasInstance.loadFromJSON(JSON.parse(json), () => canvasInstance.renderAll());
  };

  const handleRedo = () => {
    const json = useCanvasStore.getState().redo();
    if (json && canvasInstance)
      canvasInstance.loadFromJSON(JSON.parse(json), () => canvasInstance.renderAll());
  };

  const closeMenu = () => setOpenMenu(null);

  const handleTabClick = (tab: Tab) => {
    if (tab === 'Fichier') { setOpenMenu(openMenu === 'file' ? null : 'file'); return; }
    if (tab === 'Outils')  { setOpenMenu(openMenu === 'tools' ? null : 'tools'); return; }
    if (tab === 'Templates') { closeMenu(); onShowTemplates(); return; }
    closeMenu();
    onTabChange(tab);
  };

  // ─── Drawing mode ─────────────────────────────────────────────────
  // Apply directly to Fabric canvas — synchronous, no useEffect

  const handleDrawingToggle = () => {
    closeMenu();
    const canvas = canvasInstance;
    if (!canvas) return;

    const newMode = !isDrawingMode;

    if (newMode) {
      // Build and assign brush immediately
      const store = useCanvasStore.getState();
      const pencil = new fabric.PencilBrush(canvas);
      pencil.width = store.brushSize;
      pencil.color = store.brushColor;
      pencil.decimate = Math.max(0.1, 10 - store.brushSmoothing);
      canvas.freeDrawingBrush = pencil;
      canvas.isDrawingMode = true;
      canvas.requestRenderAll();

      // Cursor on the actual <canvas> element
      const el = canvas.getElement() as HTMLElement;
      if (el) el.style.cursor = 'crosshair';

      console.log('[EasyStudio] isDrawingMode:', canvas.isDrawingMode, '— brush:', canvas.freeDrawingBrush);
    } else {
      canvas.isDrawingMode = false;
      canvas.requestRenderAll();

      const el = canvas.getElement() as HTMLElement;
      if (el) el.style.cursor = 'default';
    }

    setDrawingMode(newMode);
  };

  return (
    <>
      <header className="toolbar">
        {/* ─── Left: Logo + title + tabs ─── */}
        <div className="toolbar-left">
          <div className="toolbar-logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">EasyStudio</span>
          </div>

          {/* Editable project title */}
          <div className="project-title-wrapper">
            {editingTitle ? (
              <input
                className="project-title-input"
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={handleTitleKey}
              />
            ) : (
              <button
                className="project-title-display"
                onClick={() => setEditingTitle(true)}
                title="Cliquer pour renommer"
              >
                {title}
              </button>
            )}
          </div>

          {/* Tabs */}
          <nav className="toolbar-tabs">
            {(['Fichier', 'Templates', 'Outils', 'IA'] as Tab[]).map((tab) => (
              <div key={tab} className="toolbar-tab-wrapper">
                <button
                  className={`toolbar-tab ${activeTab === tab || (tab === 'Fichier' && openMenu === 'file') || (tab === 'Outils' && openMenu === 'tools') ? 'active' : ''}`}
                  onClick={() => handleTabClick(tab)}
                >
                  {tab}
                </button>
                {tab === 'Fichier' && openMenu === 'file' && (
                  <FileMenu onClose={closeMenu} onNewProject={onNewProject} />
                )}
                {tab === 'Outils' && openMenu === 'tools' && (
                  <ToolsMenu onClose={closeMenu} />
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* ─── Center: Quick shape tools + undo/redo ─── */}
        <div className="toolbar-center">
          <div className="tool-group">
            <button className="tool-btn" onClick={() => canvasInstance && addRect(canvasInstance)} title="Rectangle">▭</button>
            <button className="tool-btn" onClick={() => canvasInstance && addCircle(canvasInstance)} title="Cercle">○</button>
            <button className="tool-btn" onClick={() => canvasInstance && addTriangle(canvasInstance)} title="Triangle">△</button>
            <button className="tool-btn" onClick={() => canvasInstance && addText(canvasInstance)} title="Texte">T</button>
          </div>

          <div className="toolbar-divider" />

          <div className="tool-group">
            <button className="tool-btn" onClick={() => fileInputRef.current?.click()} title="Image / SVG">🖼</button>
            <input ref={fileInputRef} type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={handleFileChange} />
            <button className="tool-btn" onClick={() => setShowURLModal(true)} title="URL image">🔗</button>
            {/* ✏️ Dessin libre — temporairement retiré (v2) */}
          </div>

          <div className="toolbar-divider" />

          <div className="tool-group">
            <button className="tool-btn" onClick={handleUndo} disabled={historyIndex <= 0} title="Annuler (Ctrl+Z)">↩</button>
            <button className="tool-btn" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Rétablir (Ctrl+Y)">↪</button>
          </div>
        </div>

        {/* ─── Right ─── */}
        <div className="toolbar-right">
          <BackgroundPicker />
          <button className="toolbar-btn share-btn">↑ Partager</button>
          <ExportMenu />
        </div>
      </header>

      {/* DrawingToolbar — masqué jusqu'à v2 : {isDrawingMode && <DrawingToolbar />} */}
      {showURLModal && <URLImportModal onClose={() => setShowURLModal(false)} />}
    </>
  );
}
