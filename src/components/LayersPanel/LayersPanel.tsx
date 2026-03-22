/**
 * @file LayersPanel.tsx
 * @description Panneau des calques avec glisser-déposer (dnd-kit). Affiche la liste
 * hiérarchique des calques, permet le réordonnancement, l'imbrication dans des conteneurs,
 * l'ajout de calques vides et le vidage complet du canvas.
 * @module components/LayersPanel/LayersPanel
 */

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { LayerItem } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';
import { toast } from '../../store/toastStore';
import LayerItemComponent from './LayerItem';
import Tooltip from '../UI/Tooltip';
import ConfirmDialog from '../UI/ConfirmDialog';
import './LayersPanel.css';

// ── Ghost shown in DragOverlay ────────────────────────────────────────────────
function LayerItemGhost({ layer }: { layer: LayerItem }) {
  return (
    <div className="layer-ghost">
      <span className="layer-ghost-icon">{layer.isLayer ? '📁' : '◻'}</span>
      <span className="layer-ghost-name">{layer.name}</span>
    </div>
  );
}

// ── SortableLayerItem wrapper ─────────────────────────────────────────────────
function SortableLayerItem({
  layer, isSelected, activeId, overId, isChild, children,
}: {
  layer: LayerItem;
  isSelected: boolean;
  activeId: string | null;
  overId: string | null;
  isChild?: boolean;
  children?: React.ReactNode;
}) {
  const isDragging = activeId === layer.id;
  const isOver     = overId === layer.id && activeId !== layer.id;
  const isGroup    = !!layer.isLayer;

  const cls = [
    'sortable-layer-item',
    isChild             ? 'is-child'   : '',
    isDragging          ? 'is-dragging': '',
    isOver && !isGroup  ? 'drop-above' : '',
    isOver && isGroup   ? 'can-receive': '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <LayerItemComponent layer={layer} isSelected={isSelected} indent={isChild} />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @component LayersPanel
 * @description Panneau latéral gauche affichant la liste hiérarchique des calques avec
 * drag-and-drop, imbrication dans des conteneurs et actions de gestion (ajout, suppression, vidage).
 * @returns JSX du composant LayersPanel.
 */
export default function LayersPanel() {
  const {
    layers, selectedId, canvasInstance,
    setLayers, addEmptyLayer, setSelectedId, setActiveLayerId, clearAllLayers,
    assignObjectToLayer,
  } = useCanvasStore();

  const [renamingOnCreate, setRenamingOnCreate] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog]   = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId]     = useState<string | null>(null);

  const rootLayers   = layers.filter((l) => !l.parentLayerId);
  const childrenOf   = (id: string) => layers.filter((l) => l.parentLayerId === id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Sync z-index Fabric après drop dans un groupe ────────────────────────

  const syncGroupZIndex = (groupLayerId: string) => {
    const { layers: currentLayers, canvasInstance: ci } = useCanvasStore.getState();
    if (!ci) return;
    const children = currentLayers.filter((l) => l.parentLayerId === groupLayerId);
    const total = ci.getObjects().length;
    children.forEach((child, i) => {
      const obj = ci.getObjects().find((o: any) => o.id === child.id);
      if (obj) ci.moveTo(obj, Math.max(0, total - 1 - i));
    });
    ci.requestRenderAll();
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    setOverId(e.over ? String(e.over.id) : null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;

    const activeLayer = layers.find((l) => l.id === active.id);
    const overLayer   = layers.find((l) => l.id === over.id);
    if (!activeLayer || !overLayer) return;

    // ── CAS 1 : drop SUR un calque groupe → imbriquer ──────────────────────
    if (overLayer.isLayer && !activeLayer.isLayer && overLayer.id !== activeLayer.parentLayerId) {
      assignObjectToLayer(activeLayer.id, overLayer.id);
      setTimeout(() => syncGroupZIndex(overLayer.id), 50);
      return;
    }

    // ── CAS 2 : réordonnancement DANS le même groupe ────────────────────────
    if (activeLayer.parentLayerId && activeLayer.parentLayerId === overLayer.parentLayerId) {
      const siblings  = layers.filter((l) => l.parentLayerId === activeLayer.parentLayerId);
      const oldIndex  = siblings.findIndex((l) => l.id === active.id);
      const newIndex  = siblings.findIndex((l) => l.id === over.id);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(siblings, oldIndex, newIndex);
      // Rebuild: all non-siblings first, then the siblings in their new order
      const newLayers = [
        ...layers.filter((l) => l.parentLayerId !== activeLayer.parentLayerId),
        ...reordered,
      ];
      setLayers(newLayers);

      // Sync z-index Fabric
      if (canvasInstance) {
        const total = canvasInstance.getObjects().length;
        reordered.forEach((child, i) => {
          const obj = canvasInstance.getObjects().find((o: any) => o.id === child.id);
          if (obj) canvasInstance.moveTo(obj, Math.max(0, total - 1 - i));
        });
        canvasInstance.requestRenderAll();
      }
      return;
    }

    // ── CAS 3 : réordonnancement à la RACINE ────────────────────────────────
    const oldIndex = rootLayers.findIndex((l) => l.id === active.id);
    const newIndex = rootLayers.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(rootLayers, oldIndex, newIndex);

    // Reconstruit layers en préservant les enfants sous chaque racine
    const newLayers: LayerItem[] = [];
    reordered.forEach((root) => {
      newLayers.push(root);
      newLayers.push(...layers.filter((l) => l.parentLayerId === root.id));
    });
    setLayers(newLayers);

    // Sync z-index Fabric (objets racine seulement)
    if (canvasInstance && !activeLayer.isLayer) {
      const total = canvasInstance.getObjects().length;
      const obj   = canvasInstance.getObjects().find((o: any) => o.id === active.id);
      if (obj) {
        canvasInstance.moveTo(obj, Math.max(0, total - 1 - newIndex));
        canvasInstance.requestRenderAll();
      }
    }
  };

  // ── [+ Calque] ─────────────────────────────────────────────────────────────

  const handleAddLayer = () => {
    const id = addEmptyLayer();
    setRenamingOnCreate(id);
  };

  useEffect(() => {
    if (!renamingOnCreate) return;
    const t = setTimeout(() => setRenamingOnCreate(null), 100);
    return () => clearTimeout(t);
  }, [renamingOnCreate]);

  // ── Clear all ──────────────────────────────────────────────────────────────

  const handleClearAll = () => {
    if (!canvasInstance) return;
    canvasInstance.clear();
    canvasInstance.backgroundColor = '';
    canvasInstance.requestRenderAll();
    clearAllLayers();
    toast.success('Canvas vidé ✓');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeLayer = activeId ? layers.find((l) => l.id === activeId) : null;

  return (
    <aside className="layers-panel">
      {/* Header */}
      <div className="panel-header">
        <span>Calques</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="layer-count">{layers.length}</span>
          <Tooltip text="Nouveau calque vide" hint="Organisez vos objets en groupes logiques">
            <button className="btn-add-layer" onClick={handleAddLayer}>+ Calque</button>
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
          <div className="lp-title">Vos calques</div>
          <div className="lp-body">Chaque forme, texte ou image crée un calque.</div>
          <ul className="lp-list">
            <li>Masquer / afficher</li>
            <li>Verrouiller</li>
            <li>Renommer — double-clic</li>
            <li>Grouper en calque</li>
          </ul>
          <div className="lp-tip">Utilisez + Calque pour créer un groupe logique</div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Contexte racine */}
          <SortableContext
            items={rootLayers.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="layers-list">
              {rootLayers.map((layer) => (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isSelected={layer.id === selectedId}
                  activeId={activeId}
                  overId={overId}
                >
                  {/* Contexte enfants — imbriqué */}
                  {layer.isLayer && layer.isExpanded && (
                    childrenOf(layer.id).length > 0 ? (
                      <SortableContext
                        items={childrenOf(layer.id).map((l) => l.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="layer-children-zone">
                          {childrenOf(layer.id).map((child) => (
                            <SortableLayerItem
                              key={child.id}
                              layer={child}
                              isSelected={child.id === selectedId}
                              activeId={activeId}
                              overId={overId}
                              isChild
                            />
                          ))}
                        </div>
                      </SortableContext>
                    ) : (
                      <div className="layer-empty-hint">Glissez des objets ici</div>
                    )
                  )}
                </SortableLayerItem>
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeLayer ? <LayerItemGhost layer={activeLayer} /> : null}
          </DragOverlay>
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
