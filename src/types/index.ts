/**
 * @file index.ts
 * @description Types et interfaces partagés dans toute l'application EasyStudio.
 * Centralise les contrats de données : calques, canvas, historique, IA.
 * @module types
 */

/**
 * @typedef ExportFormat
 * @description Formats d'export supportés par EasyStudio.
 * - svg : vectoriel pur, idéal pour les logos scalables
 * - png : bitmap haute résolution (×2)
 * - jpeg : bitmap avec compression
 * - webp : bitmap web optimisé
 * - pdf : document paginé
 * - html : code HTML/CSS statique intégrable
 */
export type ExportFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'pdf' | 'html';

/**
 * @interface LayerItem
 * @description Représente un calque dans le panneau des calques.
 * Peut être un objet Fabric (forme, texte, image) ou un conteneur logique (isLayer).
 */
export interface LayerItem {
  id: string;
  name: string;
  type: 'rect' | 'circle' | 'triangle' | 'text' | 'image' | 'group' | 'path' | 'svg' | 'layer';
  visible: boolean;
  locked: boolean;
  fabricObject?: unknown;
  // Layer container fields
  parentLayerId?: string;   // id of parent layer container if nested
  isLayer?: boolean;        // true = logical container (no fabric object)
  isExpanded?: boolean;     // show/hide children in panel
}

/**
 * @interface CanvasObject
 * @description Snapshot sérialisable d'un objet Fabric.js sur le canvas,
 * utilisé pour les exports et la persistance légère.
 */
export interface CanvasObject {
  id: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

/**
 * @interface HistoryState
 * @description Entrée de l'historique undo/redo du canvas.
 * Contient le JSON sérialisé de l'état Fabric et un horodatage.
 */
export interface HistoryState {
  json: string;
  timestamp: number;
}

/**
 * @interface AIPromptHistory
 * @description Entrée de l'historique des prompts envoyés au module IA.
 * Permet de réutiliser rapidement des prompts précédents.
 */
export interface AIPromptHistory {
  id: string;
  prompt: string;
  timestamp: number;
}
