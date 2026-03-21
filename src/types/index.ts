export type ExportFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'pdf' | 'html';

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

export interface HistoryState {
  json: string;
  timestamp: number;
}

export interface AIPromptHistory {
  id: string;
  prompt: string;
  timestamp: number;
}
