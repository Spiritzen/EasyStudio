import { fabric } from 'fabric';

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 5;

const isReady = (canvas: fabric.Canvas): boolean =>
  !!(canvas && (canvas as any).lowerCanvasEl);

/** Returns the logical (unscaled) canvas dimensions */
export function getLogicalSize(canvas: fabric.Canvas) {
  if (!isReady(canvas)) return { w: 800, h: 600 };
  const zoom = canvas.getZoom();
  return { w: canvas.getWidth() / zoom, h: canvas.getHeight() / zoom };
}

/** Apply a zoom level, preserving logical canvas size */
export function applyZoom(canvas: fabric.Canvas, newZoom: number) {
  if (!isReady(canvas)) return;
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
  const { w, h } = getLogicalSize(canvas);
  canvas.setZoom(clamped);
  canvas.setDimensions({ width: Math.round(w * clamped), height: Math.round(h * clamped) });
  canvas.requestRenderAll();
}

/** Fit canvas to the given container element */
export function fitToView(canvas: fabric.Canvas, container: HTMLElement, padding = 40) {
  if (!isReady(canvas)) return;
  const { w: logW, h: logH } = getLogicalSize(canvas);
  const availW = container.clientWidth - padding * 2;
  const availH = container.clientHeight - padding * 2;
  if (availW <= 0 || availH <= 0) return;
  const scale = Math.min(availW / logW, availH / logH, 1);
  applyZoom(canvas, scale);
}
