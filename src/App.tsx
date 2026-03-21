import { useState, useRef } from 'react';
import Toolbar from './components/Toolbar/Toolbar';
import Footer from './components/Footer/Footer';
import LayersPanel from './components/LayersPanel/LayersPanel';
import CanvasArea from './components/Canvas/CanvasArea';
import InspectorPanel from './components/Inspector/InspectorPanel';
import EffectsPanel from './components/Effects/EffectsPanel';
import AIPanel from './components/AIPanel/AIPanel';
import CodeOutput from './components/CodeOutput/CodeOutput';
import ToastContainer from './components/UI/Toast';
import StatusBar from './components/UI/StatusBar';
import OnboardingModal from './components/UI/OnboardingModal';
import TemplatesModal from './components/Templates/TemplatesModal';
import NewProjectModal from './components/Toolbar/NewProjectModal';
import KeyboardShortcutsModal from './components/UI/KeyboardShortcutsModal';
import { useUIStore } from './store/uiStore';
import { useCanvasStore } from './store/canvasStore';
import { saveProject, newProject, openProjectFile } from './utils/projectUtils';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

type Tab = 'Fichier' | 'Templates' | 'Outils' | 'IA';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Outils');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const { showShortcutsModal } = useUIStore();
  const { canvasInstance } = useCanvasStore();
  const fileOpenRef = useRef<HTMLInputElement>(null);

  const showAI = activeTab === 'IA';

  const handleOpenProject = () => fileOpenRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openProjectFile(file);
    e.target.value = '';
  };

  const handleNewProject = () => setShowNewProjectModal(true);

  const handleNewProjectConfirm = (title: string, width: number, height: number, saveFirst: boolean) => {
    setShowNewProjectModal(false);
    if (saveFirst) saveProject();
    newProject(title, width, height);
  };

  useKeyboardShortcuts({
    onOpenProject: handleOpenProject,
    onOpenNewConfirm: handleNewProject,
  });

  return (
    <div className="app-layout">
      <Toolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onShowTemplates={() => setShowTemplates(true)}
        onOpenProject={handleOpenProject}
        onNewProject={handleNewProject}
      />

      <div className="app-body">
        <LayersPanel />
        <CanvasArea onOpenAI={() => setActiveTab('IA')} />

        {showAI ? (
          <AIPanel />
        ) : (
          <div className="right-panel">
            <InspectorPanel />
            <EffectsPanel />
          </div>
        )}
      </div>

      <StatusBar />

      {/* ─── Modals & Overlays ─── */}
      <CodeOutput />
      <ToastContainer />
      <OnboardingModal />

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      {showShortcutsModal && <KeyboardShortcutsModal />}

      {showNewProjectModal && (
        <NewProjectModal
          isCanvasEmpty={!canvasInstance || canvasInstance.getObjects().length === 0}
          onConfirm={handleNewProjectConfirm}
          onCancel={() => setShowNewProjectModal(false)}
        />
      )}

      {/* Hidden file input for open project */}
      <input
        ref={fileOpenRef}
        type="file"
        accept=".easylogo,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Footer />
    </div>
  );
}
