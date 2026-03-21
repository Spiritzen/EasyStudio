import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LayerItem as LayerItemType } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';
import Tooltip from '../UI/Tooltip';
import './LayersPanel.css';

const TYPE_ICONS: Record<string, string> = {
  rect: '▭',
  circle: '○',
  triangle: '△',
  text: 'T',
  image: '🖼',
  group: '⊞',
  path: '✎',
  svg: '◈',
  layer: '📁',
};

interface Props {
  layer: LayerItemType;
  isSelected: boolean;
  indent?: boolean;
  onContextMenu?: (e: React.MouseEvent, layerId: string) => void;
}

export default function LayerItemComponent({ layer, isSelected, indent, onContextMenu }: Props) {
  const {
    updateLayer, setSelectedId, canvasInstance,
    layers, toggleLayerExpanded, setActiveLayerId, activeLayerId,
  } = useCanvasStore();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
    disabled: !!indent,
  });

  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const children = layers.filter((l) => l.parentLayerId === layer.id);

  // ─── Rename — universal for ALL types ─────────────────────────────────────

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameVal(layer.name);
    setRenaming(true);
  };

  const commitRename = () => {
    const trimmed = renameVal.trim().slice(0, 40);
    if (trimmed && trimmed !== layer.name) {
      // Update Zustand store
      updateLayer(layer.id, { name: trimmed });

      // Sync Fabric object layerName (non-layer items only)
      if (!layer.isLayer && canvasInstance) {
        const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
        if (obj) {
          (obj as any).layerName = trimmed;
          canvasInstance.requestRenderAll();
        }
      }
    }
    setRenaming(false);
  };

  const cancelRename = () => {
    setRenameVal(layer.name);
    setRenaming(false);
  };

  // Focus + select all text when rename starts
  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  // ─── Container handlers ────────────────────────────────────────────────────

  const handleContainerClick = () => {
    setSelectedId(layer.id);
    setActiveLayerId(layer.id);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLayerExpanded(layer.id);
  };

  // ─── Regular object handlers ───────────────────────────────────────────────

  const handleSelect = () => {
    if (layer.isLayer) { handleContainerClick(); return; }
    if (!canvasInstance || layer.locked) return;
    const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
    if (obj) {
      canvasInstance.setActiveObject(obj);
      canvasInstance.renderAll();
      setSelectedId(layer.id);
    }
  };

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvasInstance) return;
    const newVisible = !layer.visible;

    if (layer.isLayer) {
      children.forEach((child) => {
        const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
        if (obj) obj.set('visible', newVisible);
        updateLayer(child.id, { visible: newVisible });
      });
      canvasInstance.requestRenderAll();
      updateLayer(layer.id, { visible: newVisible });
    } else {
      const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
      if (obj) { obj.set('visible', newVisible); canvasInstance.renderAll(); }
      updateLayer(layer.id, { visible: newVisible });
    }
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvasInstance) return;
    const locked = !layer.locked;

    if (layer.isLayer) {
      children.forEach((child) => {
        const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
        if (obj) obj.set({ selectable: !locked, evented: !locked });
        updateLayer(child.id, { locked });
      });
      canvasInstance.requestRenderAll();
      updateLayer(layer.id, { locked });
    } else {
      const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
      if (obj) { obj.set({ selectable: !locked, evented: !locked }); canvasInstance.renderAll(); }
      updateLayer(layer.id, { locked });
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (!layer.isLayer || !onContextMenu) return;
    e.preventDefault();
    onContextMenu(e, layer.id);
  };

  // ─── Classes ────────────────────────────────────────────────────────────────

  const isActiveLayer = layer.isLayer && activeLayerId === layer.id;

  const itemClass = [
    'layer-item',
    layer.isLayer ? 'layer-item--container' : '',
    isSelected ? 'selected' : '',
    isActiveLayer ? 'layer-item--active-target' : '',
    layer.locked ? 'locked' : '',
    indent ? 'layer-item--child' : '',
  ].filter(Boolean).join(' ');

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={itemClass}
      onClick={handleSelect}
      onDoubleClick={startRename}   /* universal — all types */
      onContextMenu={handleRightClick}
    >
      {/* Expand toggle (containers) or drag handle (objects) */}
      {layer.isLayer ? (
        <button
          className="layer-expand-btn"
          onClick={handleExpandToggle}
          title={layer.isExpanded ? 'Réduire' : 'Déplier'}
        >
          {layer.isExpanded ? '▼' : '▸'}
        </button>
      ) : (
        <span className="layer-drag" {...attributes} {...listeners} title="Glisser pour réordonner">
          ⠿
        </span>
      )}

      {/* Type icon */}
      <span className="layer-icon">{TYPE_ICONS[layer.type] ?? '◻'}</span>

      {/* Name area — input when renaming, text + pencil hint otherwise */}
      {renaming ? (
        <input
          ref={renameRef}
          className="layer-rename-input"
          value={renameVal}
          maxLength={40}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') cancelRename();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="layer-name-wrap" title="Double-clic pour renommer">
          <span className="layer-name">{layer.name}</span>
          <span className="layer-rename-hint" aria-hidden="true">✏</span>
        </span>
      )}

      {/* Badge: children count when container is closed */}
      {layer.isLayer && !layer.isExpanded && children.length > 0 && (
        <span className="layer-children-badge">{children.length}</span>
      )}

      {/* Visibility + lock */}
      <div className="layer-actions">
        <Tooltip text="Masquer / afficher" hint="L'objet reste dans le projet" position="top">
          <button
            className={`layer-btn ${layer.visible ? 'active' : 'inactive'}`}
            onClick={toggleVisibility}
          >
            {layer.visible ? '👁' : '🚫'}
          </button>
        </Tooltip>
        <Tooltip text="Verrouiller / déverrouiller" hint="Un objet verrouillé ne peut pas être sélectionné" position="top">
          <button
            className={`layer-btn ${layer.locked ? 'active' : ''}`}
            onClick={toggleLock}
          >
            {layer.locked ? '🔒' : '🔓'}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
