import { useState, useEffect, useCallback } from 'react';
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
import { toast } from '../../store/toastStore';
import LayerItemComponent from './LayerItem';
import Tooltip from '../UI/Tooltip';
import ConfirmDialog from '../UI/ConfirmDialog';
import './LayersPanel.css';

export default function LayersPanel() {
  const {
    layers, selectedId, reorderLayers, canvasInstance,
    addEmptyLayer, setSelectedId, setActiveLayerId, clearAllLayers,
  } = useCanvasStore();

  const [renamingOnCreate, setRenamingOnCreate] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Root-level items: containers and objects without a parent
  const rootLayers = layers.filter((l) => !l.parentLayerId);
  // Children of a given container
  const getChildren = (layerId: string) => layers.filter((l) => l.parentLayerId === layerId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rootLayers.findIndex((l) => l.id === active.id);
    const newIndex = rootLayers.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const globalOld = layers.findIndex((l) => l.id === active.id);
    const globalNew = layers.findIndex((l) => l.id === over.id);
    reorderLayers(globalOld, globalNew);

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

  // ─── [+ Calque] ────────────────────────────────────────────────────────────

  const handleAddLayer = () => {
    const id = addEmptyLayer();
    setRenamingOnCreate(id);
  };

  useEffect(() => {
    if (!renamingOnCreate) return;
    const t = setTimeout(() => setRenamingOnCreate(null), 100);
    return () => clearTimeout(t);
  }, [renamingOnCreate]);

  // ─── Clear all ────────────────────────────────────────────────────────────

  const handleClearAll = () => {
    if (!canvasInstance) return;
    canvasInstance.clear();
    canvasInstance.backgroundColor = '';
    canvasInstance.requestRenderAll();
    clearAllLayers();
    toast.success('Canvas vidé ✓');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <aside className="layers-panel">
      {/* Header */}
      <div className="panel-header">
        <span>Calques</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="layer-count">{layers.length}</span>
          <Tooltip text="Nouveau calque vide" hint="Organisez vos objets en groupes logiques">
            <button className="btn-add-layer" onClick={handleAddLayer}>
              + Calque
            </button>
          </Tooltip>
          <Tooltip text="Tout supprimer" hint="Vide le canvas">
            <button
              className="btn-clear-layers"
              onClick={() => setShowClearDialog(true)}
              disabled={layers.length === 0}
            >
              🗑️
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Empty state */}
      {rootLayers.length === 0 ? (
        <div className="layers-placeholder">
          <div className="lp-title">📋 Vos calques</div>
          <div className="lp-body">Chaque forme, texte ou image crée un calque.</div>
          <ul className="lp-list">
            <li><span className="lp-icon">👁</span> Masquer / afficher</li>
            <li><span className="lp-icon">🔒</span> Verrouiller</li>
            <li><span className="lp-icon">✏️</span> Renommer (double-clic)</li>
            <li><span className="lp-icon">📁</span> Grouper en calque</li>
          </ul>
          <div className="lp-tip">Utilisez [+ Calque] pour créer un groupe logique</div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={rootLayers.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="layers-list">
              {rootLayers.map((layer) => (
                <div key={layer.id} data-layerid={layer.id}>
                  {/* Root item */}
                  <LayerItemComponent
                    layer={layer}
                    isSelected={layer.id === selectedId}
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

      {/* Clear all confirmation */}
      {showClearDialog && (
        <ConfirmDialog
          title="🗑️ Vider le canvas ?"
          message="Tous les objets et calques seront supprimés."
          buttons={[
            { label: 'Annuler', variant: 'ghost', onClick: () => {} },
            { label: 'Tout supprimer', variant: 'danger', onClick: handleClearAll },
          ]}
          onClose={() => setShowClearDialog(false)}
        />
      )}
    </aside>
  );
}
