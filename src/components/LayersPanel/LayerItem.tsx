import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LayerItem as LayerItemType } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';
import Tooltip from '../UI/Tooltip';
import ConfirmDialog from '../UI/ConfirmDialog';
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
}

export default function LayerItemComponent({ layer, isSelected, indent }: Props) {
  const {
    updateLayer, setSelectedId, canvasInstance,
    layers, toggleLayerExpanded, setActiveLayerId, activeLayerId,
    removeLayer, removeObjectFromLayer, reorderLayers,
    addEmptyLayer, assignObjectToLayer,
  } = useCanvasStore();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  });

  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const children = layers.filter((l) => l.parentLayerId === layer.id);

  // ─── Rename ──────────────────────────────────────────────────────────────

  const startRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenameVal(layer.name);
    setRenaming(true);
  };

  const commitRename = () => {
    const trimmed = renameVal.trim().slice(0, 40);
    if (trimmed && trimmed !== layer.name) {
      updateLayer(layer.id, { name: trimmed });
      if (!layer.isLayer && canvasInstance) {
        const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
        if (obj) { (obj as any).layerName = trimmed; canvasInstance.requestRenderAll(); }
      }
    }
    setRenaming(false);
  };

  const cancelRename = () => { setRenameVal(layer.name); setRenaming(false); };

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  // ─── Container handlers ───────────────────────────────────────────────────

  const handleContainerClick = () => {
    setSelectedId(layer.id);
    setActiveLayerId(layer.id);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLayerExpanded(layer.id);
  };

  // ─── Select ──────────────────────────────────────────────────────────────

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

  // ─── Visibility & lock ────────────────────────────────────────────────────

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

  // ─── Delete ───────────────────────────────────────────────────────────────

  const doDeleteObject = () => {
    if (!canvasInstance) return;
    const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
    if (obj) { canvasInstance.remove(obj); canvasInstance.requestRenderAll(); }
    // syncLayers() via object:removed event handles the store cleanup automatically
  };

  const doDeleteLayer = () => {
    if (children.length === 0) {
      removeLayer(layer.id);
      setActiveLayerId(null);
    } else {
      setShowDeleteDialog(true);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (layer.isLayer) { doDeleteLayer(); } else { doDeleteObject(); }
  };

  const handleDeleteLayerOnly = () => {
    children.forEach((child) => removeObjectFromLayer(child.id));
    removeLayer(layer.id);
    setActiveLayerId(null);
  };

  const handleDeleteLayerAll = () => {
    if (canvasInstance) {
      children.forEach((child) => {
        const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
        if (obj) canvasInstance.remove(obj);
      });
      if (children.length > 0) canvasInstance.requestRenderAll();
    }
    removeLayer(layer.id);
    setActiveLayerId(null);
  };

  // ─── Duplicate ────────────────────────────────────────────────────────────

  const handleDuplicate = () => {
    setCtxMenu(null);
    if (!canvasInstance) return;

    if (layer.isLayer) {
      const newLayerId = addEmptyLayer(`${layer.name} (copie)`);
      children.forEach((child) => {
        const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
        if (!obj) return;
        (obj as any).clone((cloned: any) => {
          cloned.set({
            left: (obj.left ?? 0) + 10,
            top: (obj.top ?? 0) + 10,
            id: `obj_clone_${Date.now()}`,
            layerName: child.name,
          });
          canvasInstance.add(cloned);
          canvasInstance.renderAll();
          setTimeout(() => assignObjectToLayer(cloned.id, newLayerId), 50);
        });
      });
    } else {
      const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
      if (!obj) return;
      (obj as any).clone((cloned: any) => {
        const clonedId = `obj_clone_${Date.now()}`;
        cloned.set({
          left: (obj.left ?? 0) + 10,
          top: (obj.top ?? 0) + 10,
          id: clonedId,
          layerName: `${layer.name} (copie)`,
        });
        canvasInstance.add(cloned);
        canvasInstance.setActiveObject(cloned);
        canvasInstance.renderAll();
        if (layer.parentLayerId) {
          setTimeout(() => assignObjectToLayer(clonedId, layer.parentLayerId!), 50);
        }
      });
    }
  };

  // ─── Move up / down ───────────────────────────────────────────────────────

  const handleMoveUp = () => {
    setCtxMenu(null);
    if (!canvasInstance || layer.isLayer) return;
    const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
    if (obj) { canvasInstance.bringForward(obj); canvasInstance.requestRenderAll(); }
    const allLayers = useCanvasStore.getState().layers;
    const scope = layer.parentLayerId
      ? allLayers.filter((l) => l.parentLayerId === layer.parentLayerId)
      : allLayers.filter((l) => !l.parentLayerId);
    const idx = scope.findIndex((l) => l.id === layer.id);
    if (idx > 0) {
      const globalIdx = allLayers.findIndex((l) => l.id === layer.id);
      const globalTarget = allLayers.findIndex((l) => l.id === scope[idx - 1].id);
      reorderLayers(globalIdx, globalTarget);
    }
  };

  const handleMoveDown = () => {
    setCtxMenu(null);
    if (!canvasInstance || layer.isLayer) return;
    const obj = canvasInstance.getObjects().find((o: any) => o.id === layer.id);
    if (obj) { canvasInstance.sendBackwards(obj); canvasInstance.requestRenderAll(); }
    const allLayers = useCanvasStore.getState().layers;
    const scope = layer.parentLayerId
      ? allLayers.filter((l) => l.parentLayerId === layer.parentLayerId)
      : allLayers.filter((l) => !l.parentLayerId);
    const idx = scope.findIndex((l) => l.id === layer.id);
    if (idx < scope.length - 1) {
      const globalIdx = allLayers.findIndex((l) => l.id === layer.id);
      const globalTarget = allLayers.findIndex((l) => l.id === scope[idx + 1].id);
      reorderLayers(globalIdx, globalTarget);
    }
  };

  // ─── Context menu ─────────────────────────────────────────────────────────

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const onDown = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  // ─── Classes ──────────────────────────────────────────────────────────────

  const isActiveLayer = layer.isLayer && activeLayerId === layer.id;

  const itemClass = [
    'layer-item',
    layer.isLayer ? 'layer-item--container' : '',
    isSelected ? 'selected' : '',
    isActiveLayer ? 'layer-item--active-target' : '',
    layer.locked ? 'locked' : '',
    indent ? 'layer-item--child' : '',
  ].filter(Boolean).join(' ');

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={itemClass}
        onClick={handleSelect}
        onDoubleClick={startRename}
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

        {/* Name area */}
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

        {/* Actions */}
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
          <Tooltip text="Supprimer" hint="Suppr ou clic" position="top">
            <button className="layer-btn layer-btn--delete" onClick={handleDeleteClick}>
              🗑️
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="layer-context-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="ctx-item" onClick={() => { setCtxMenu(null); startRename(); }}>
            ✏️ Renommer
          </button>
          <button className="ctx-item" onClick={handleDuplicate}>
            📋 Dupliquer
          </button>
          {!layer.isLayer && (
            <>
              <button className="ctx-item" onClick={handleMoveUp}>⬆️ Monter d'un rang</button>
              <button className="ctx-item" onClick={handleMoveDown}>⬇️ Descendre d'un rang</button>
            </>
          )}
          <div className="ctx-sep" />
          <button
            className="ctx-item ctx-item--danger"
            onClick={() => { setCtxMenu(null); if (layer.isLayer) { doDeleteLayer(); } else { doDeleteObject(); } }}
          >
            🗑️ Supprimer
          </button>
        </div>
      )}

      {/* Delete confirmation for non-empty layers */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="🗑️ Supprimer le calque ?"
          message={`Ce calque contient ${children.length} objet${children.length > 1 ? 's' : ''}.`}
          buttons={[
            { label: 'Annuler', variant: 'ghost', onClick: () => {} },
            { label: 'Supprimer le calque seulement', variant: 'primary', onClick: handleDeleteLayerOnly },
            { label: 'Tout supprimer', variant: 'danger', onClick: handleDeleteLayerAll },
          ]}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  );
}
