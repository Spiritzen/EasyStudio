import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCanvasStore } from '../../store/canvasStore';
import LayerItemComponent from './LayerItem';
import './LayersPanel.css';

interface ContextMenu {
  layerId: string;
  x: number;
  y: number;
}

interface DeleteConfirm {
  layerId: string;
  childCount: number;
}

export default function LayersPanel() {
  const {
    layers, selectedId, reorderLayers, canvasInstance,
    addEmptyLayer, updateLayer, removeLayer, removeObjectFromLayer,
    setSelectedId, setActiveLayerId,
  } = useCanvasStore();

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [renamingOnCreate, setRenamingOnCreate] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Root-level items: containers and objects without a parent
  const rootLayers = layers.filter((l) => !l.parentLayerId);
  // Children of a given container
  const getChildren = (layerId: string) => layers.filter((l) => l.parentLayerId === layerId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rootLayers.findIndex((l) => l.id === active.id);
    const newIndex = rootLayers.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Map root indices back to global indices
    const globalOld = layers.findIndex((l) => l.id === active.id);
    const globalNew = layers.findIndex((l) => l.id === over.id);
    reorderLayers(globalOld, globalNew);

    // Sync z-order in Fabric (only for canvas objects)
    if (canvasInstance) {
      const movedLayer = rootLayers[oldIndex];
      if (!movedLayer.isLayer) {
        const allObjects = canvasInstance.getObjects();
        const movedObj = allObjects.find((o: any) => o.id === active.id);
        if (movedObj) {
          const targetZ = allObjects.length - 1 - newIndex;
          canvasInstance.moveTo(movedObj, Math.max(0, targetZ));
          canvasInstance.renderAll();
        }
      }
    }
  };

  // ─── [+ Calque] ─────────────────────────────────────────────────────────

  const handleAddLayer = () => {
    const id = addEmptyLayer();
    setRenamingOnCreate(id);
  };

  // Signal LayerItem to start renaming after creation
  // (We'll use a custom event approach via a data attribute)
  const layerCreatedId = renamingOnCreate;
  useEffect(() => {
    if (!layerCreatedId) return;
    // Give React one tick to render the new item, then clear
    const t = setTimeout(() => setRenamingOnCreate(null), 100);
    return () => clearTimeout(t);
  }, [layerCreatedId]);

  // ─── Context menu actions ────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setContextMenu({ layerId, x: e.clientX, y: e.clientY });
  }, []);

  const ctxRename = () => {
    if (!contextMenu) return;
    // Trigger rename by setting selectedId (LayerItem watches for double-click)
    // We use a custom event to tell LayerItem to start renaming
    const el = document.querySelector(`[data-layerid="${contextMenu.layerId}"] .layer-name`) as HTMLElement;
    el?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    setContextMenu(null);
  };

  const ctxDuplicate = () => {
    if (!contextMenu || !canvasInstance) return;
    const layerId = contextMenu.layerId;
    const srcLayer = layers.find((l) => l.id === layerId);
    if (!srcLayer) { setContextMenu(null); return; }

    const children = getChildren(layerId);
    const newLayerId = addEmptyLayer(`${srcLayer.name} (copie)`);

    // Clone each child Fabric object
    children.forEach((child) => {
      const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
      if (!obj) return;
      (obj as any).clone((cloned: any) => {
        cloned.set({
          left: (obj.left ?? 0) + 10,
          top: (obj.top ?? 0) + 10,
          id: `${child.id}_copy_${Date.now()}`,
          layerName: child.name,
        });
        canvasInstance.add(cloned);
        canvasInstance.renderAll();
        // Assign to new layer after syncLayers runs
        setTimeout(() => {
          useCanvasStore.getState().assignObjectToLayer(cloned.id, newLayerId);
        }, 50);
      });
    });

    setContextMenu(null);
  };

  const ctxDelete = () => {
    if (!contextMenu) return;
    const layerId = contextMenu.layerId;
    const childCount = getChildren(layerId).length;
    if (childCount > 0) {
      setDeleteConfirm({ layerId, childCount });
    } else {
      removeLayer(layerId);
      setActiveLayerId(null);
    }
    setContextMenu(null);
  };

  // ─── Delete confirm actions ──────────────────────────────────────────────

  const handleDeleteAll = () => {
    if (!deleteConfirm || !canvasInstance) return;
    const { layerId } = deleteConfirm;
    const children = getChildren(layerId);
    children.forEach((child) => {
      const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
      if (obj) canvasInstance.remove(obj);
      removeLayer(child.id);
    });
    canvasInstance.renderAll();
    removeLayer(layerId);
    setActiveLayerId(null);
    setDeleteConfirm(null);
  };

  const handleMoveToRoot = () => {
    if (!deleteConfirm) return;
    const { layerId } = deleteConfirm;
    getChildren(layerId).forEach((child) => removeObjectFromLayer(child.id));
    removeLayer(layerId);
    setActiveLayerId(null);
    setDeleteConfirm(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <aside className="layers-panel">
      {/* Header */}
      <div className="panel-header">
        <span>Calques</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="layer-count">{layers.length}</span>
          <button className="btn-add-layer" onClick={handleAddLayer} title="Nouveau calque vide">
            + Calque
          </button>
        </div>
      </div>

      {/* Empty state */}
      {rootLayers.length === 0 ? (
        <div className="layers-empty">
          <p>Aucun calque</p>
          <p className="layers-hint">Ajoutez des formes via la barre d'outils</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={rootLayers.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="layers-list">
              {rootLayers.map((layer) => (
                <div
                  key={layer.id}
                  data-layerid={layer.id}
                >
                  {/* Root item */}
                  <LayerItemComponent
                    layer={layer}
                    isSelected={layer.id === selectedId}
                    onContextMenu={layer.isLayer ? handleContextMenu : undefined}
                  />

                  {/* Children (rendered below the container, not in DnD) */}
                  {layer.isLayer && layer.isExpanded && (
                    <div className="layer-children">
                      {getChildren(layer.id).map((child) => (
                        <div
                          key={child.id}
                          className="layer-child-tree-line"
                          onClick={() => {
                            if (!canvasInstance || child.locked) return;
                            const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
                            if (obj) {
                              canvasInstance.setActiveObject(obj);
                              canvasInstance.renderAll();
                              setSelectedId(child.id);
                            }
                          }}
                        >
                          <LayerItemComponent
                            layer={child}
                            isSelected={child.id === selectedId}
                            indent
                          />
                        </div>
                      ))}
                      {getChildren(layer.id).length === 0 && (
                        <div className="layer-empty-hint">Glissez des objets ici</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="layer-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="ctx-item" onClick={ctxRename}>✏️ Renommer</button>
          <button className="ctx-item" onClick={ctxDuplicate}>📋 Dupliquer le calque</button>
          <div className="ctx-sep" />
          <button className="ctx-item ctx-item--danger" onClick={ctxDelete}>🗑️ Supprimer</button>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="layer-delete-overlay">
          <div className="layer-delete-dialog">
            <p>Ce calque contient <strong>{deleteConfirm.childCount}</strong> objet{deleteConfirm.childCount > 1 ? 's' : ''}.</p>
            <div className="layer-delete-btns">
              <button className="layer-del-btn layer-del-btn--danger" onClick={handleDeleteAll}>
                Supprimer tout
              </button>
              <button className="layer-del-btn" onClick={handleMoveToRoot}>
                Déplacer à la racine
              </button>
              <button className="layer-del-btn layer-del-btn--ghost" onClick={() => setDeleteConfirm(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
