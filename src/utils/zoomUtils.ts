/**
 * @file zoomUtils.ts
 * @description Utilitaires de gestion du zoom du canvas Fabric.js.
 * Applique les limites min/max, préserve les dimensions logiques et ajuste au conteneur.
 * @module utils/zoomUtils
 */

import { fabric } from 'fabric';

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 5;

const isReady = (canvas: fabric.Canvas): boolean =>
  !!(canvas && (canvas as any).lowerCanvasEl);

/**
 * Retourne les dimensions logiques (non zoomées) du canvas.
 * @param canvas - L'instance Fabric.js active.
 * @returns Un objet { w, h } représentant la largeur et la hauteur en pixels logiques.
 */
export function getLogicalSize(canvas: fabric.Canvas) {
  if (!isReady(canvas)) return { w: 800, h: 600 };
  const zoom = canvas.getZoom();
  return { w: canvas.getWidth() / zoom, h: canvas.getHeight() / zoom };
}

/**
 * Applique un niveau de zoom au canvas en préservant ses dimensions logiques.
 * Le zoom est limité entre MIN_ZOOM (0.05) et MAX_ZOOM (5).
 * @param canvas - L'instance Fabric.js active.
 * @param newZoom - Le nouveau niveau de zoom souhaité.
 */
export function applyZoom(canvas: fabric.Canvas, newZoom: number) {
  if (!isReady(canvas)) return;
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
  const { w, h } = getLogicalSize(canvas);
  canvas.setZoom(clamped);
  canvas.setDimensions({ width: Math.round(w * clamped), height: Math.round(h * clamped) });
  canvas.requestRenderAll();
}

/**
 * Ajuste le zoom du canvas pour qu'il tienne entièrement dans le conteneur donné.
 * Le zoom maximum appliqué est 1 (jamais d'agrandissement au-delà de 100%).
 * @param canvas - L'instance Fabric.js active.
 * @param container - L'élément HTML conteneur du canvas.
 * @param padding - La marge intérieure en pixels à respecter (défaut : 40).
 */
export function fitToView(canvas: fabric.Canvas, container: HTMLElement, padding = 40) {
  if (!isReady(canvas)) return;
  const { w: logW, h: logH } = getLogicalSize(canvas);
  const availW = container.clientWidth - padding * 2;
  const availH = container.clientHeight - padding * 2;
  if (availW <= 0 || availH <= 0) return;
  const scale = Math.min(availW / logW, availH / logH, 1);
  applyZoom(canvas, scale);
}
