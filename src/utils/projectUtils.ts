import { useCanvasStore } from '../store/canvasStore';
import { useProjectStore } from '../store/projectStore';
import { useTransitionStore } from '../store/transitionStore';
import { useBackgroundStore } from '../store/backgroundStore';
import type { CanvasState, TransitionConfig } from '../store/transitionStore';
import type { LayerItem } from '../types';
import { toast } from '../store/toastStore';
import { getObjectType } from './fabricHelpers';

const FORMAT_VERSION = '1.1';
const RECENT_KEY = 'easystudio-recent-projects';
const MAX_RECENT = 5;

// ─── Types ────────────────────────────────────────────────────────────

export interface EasyStudioFile {
  easystudio: true;
  version: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  canvas: { width: number; height: number; backgroundColor: string };
  background: { bgColor: string; bgOpacity: number; bgTransparent: boolean };
  objects: object;
  layers: Omit<LayerItem, 'fabricObject'>[];
  states?: CanvasState[];
  transitions?: TransitionConfig[];
  thumbnail: string;
}

export interface RecentProject {
  title: string;
  thumbnail: string;
  width: number;
  height: number;
  savedAt: number;
  fileData: EasyStudioFile;
}

// ─── Recent projects ──────────────────────────────────────────────────

export function getRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentProject[];
  } catch {
    return [];
  }
}

function addToRecent(entry: RecentProject) {
  const recents = getRecentProjects().filter((r) => r.title !== entry.title);
  recents.unshift(entry);
  if (recents.length > MAX_RECENT) recents.pop();
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
}

// ─── Save ─────────────────────────────────────────────────────────────

export function saveProject() {
  const { canvasInstance, layers } = useCanvasStore.getState();
  const { title, createdAt } = useProjectStore.getState();
  const { states, transitions } = useTransitionStore.getState();
  const { bgColor, bgOpacity, bgTransparent } = useBackgroundStore.getState();
  if (!canvasInstance) return;

  const now = Date.now();
  const thumbnail = canvasInstance.toDataURL({ format: 'png', multiplier: 0.25 });

  // Serialize layers without non-serializable fabricObject refs
  const serializedLayers = layers.map(({ fabricObject: _fb, ...rest }) => rest);

  const data: EasyStudioFile = {
    easystudio: true,
    version: FORMAT_VERSION,
    title,
    createdAt: createdAt || now,
    updatedAt: now,
    canvas: {
      width: canvasInstance.getWidth(),
      height: canvasInstance.getHeight(),
      backgroundColor: '',
    },
    background: { bgColor, bgOpacity, bgTransparent },
    objects: canvasInstance.toJSON(['id', 'layerName', 'visible', 'locked']),
    layers: serializedLayers,
    states,
    transitions,
    thumbnail,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename(title)}.easylogo`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  useProjectStore.getState().setDirty(false);
  useProjectStore.getState().touch();

  addToRecent({
    title,
    thumbnail,
    width: canvasInstance.getWidth(),
    height: canvasInstance.getHeight(),
    savedAt: now,
    fileData: data,
  });

  toast.success('Projet sauvegardé ✓');
}

// ─── Open file ────────────────────────────────────────────────────────

export function openProjectFile(file: File, onRestored?: () => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      if (!data.easystudio) {
        toast.error('Format non reconnu ✗');
        return;
      }
      restoreProject(data as EasyStudioFile, onRestored);
    } catch {
      toast.error('Fichier corrompu ✗');
    }
  };
  reader.readAsText(file);
}

// ─── Restore project ──────────────────────────────────────────────────

export function restoreProject(data: EasyStudioFile, onDone?: () => void) {
  const { canvasInstance, setLayers } = useCanvasStore.getState();
  if (!canvasInstance) return;

  canvasInstance.setWidth(data.canvas.width);
  canvasInstance.setHeight(data.canvas.height);
  canvasInstance.backgroundColor = '';

  canvasInstance.loadFromJSON(data.objects, () => {
    canvasInstance.backgroundColor = '';
    canvasInstance.renderAll();

    // Restore layers — re-link fabricObject refs
    if (data.layers?.length) {
      const objById = new Map(
        canvasInstance.getObjects().map((o: any) => [o.id, o])
      );
      const restoredLayers: LayerItem[] = data.layers.map((l) => ({
        ...l,
        fabricObject: objById.get(l.id),
      }));
      setLayers(restoredLayers);
    } else {
      // Fallback: rebuild from canvas objects
      const layers = [...canvasInstance.getObjects()].reverse().map((obj: any) => ({
        id: obj.id || '',
        name: obj.layerName || obj.type || 'Objet',
        type: getObjectType(obj) as LayerItem['type'],
        visible: obj.visible !== false,
        locked: !obj.selectable,
        fabricObject: obj,
      }));
      setLayers(layers);
    }

    // Restore background
    if (data.background) {
      const { setBgColor, setBgOpacity, setBgTransparent } = useBackgroundStore.getState();
      setBgColor(data.background.bgColor);
      setBgOpacity(data.background.bgOpacity);
      setBgTransparent(data.background.bgTransparent);
    }

    // Restore transitions
    const { setStates, setTransitions } = useTransitionStore.getState();
    if (data.states) setStates(data.states);
    if (data.transitions) setTransitions(data.transitions);

    // Update project meta
    const ps = useProjectStore.getState();
    ps.setTitle(data.title || 'Sans titre');
    ps.setDirty(false);
    if (data.createdAt) ps.setCreatedAt(data.createdAt);

    toast.success(`Projet chargé : ${data.title || 'Sans titre'} ✓`);
    onDone?.();
  });
}

// ─── New project ──────────────────────────────────────────────────────

export function newProject(title = 'Sans titre', width = 800, height = 600) {
  const { canvasInstance, setLayers, pushHistory } = useCanvasStore.getState();
  if (!canvasInstance) return;

  canvasInstance.clear();
  canvasInstance.setWidth(width);
  canvasInstance.setHeight(height);
  canvasInstance.backgroundColor = '';
  canvasInstance.renderAll();
  setLayers([]);

  const { setStates, setTransitions } = useTransitionStore.getState();
  setStates([]);
  setTransitions([]);

  const ps = useProjectStore.getState();
  ps.setTitle(title);
  ps.setDirty(false);
  ps.setCreatedAt(Date.now());

  pushHistory(JSON.stringify(canvasInstance.toJSON(['id', 'layerName'])));

  toast.success(`Projet créé : ${title} ✓`);
}

// ─── Load recent ──────────────────────────────────────────────────────

export function loadRecentProject(entry: RecentProject, onDone?: () => void) {
  restoreProject(entry.fileData, onDone);
}

// ─── Helpers ──────────────────────────────────────────────────────────

function safeFilename(str: string) {
  return str.replace(/[/\\:*?"<>|]/g, '-').trim() || 'projet';
}

export function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  if (h < 24) return `il y a ${h}h`;
  if (d < 7) return `il y a ${d} jour${d > 1 ? 's' : ''}`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
