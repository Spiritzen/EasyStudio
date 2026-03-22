/**
 * @file exportUtils.ts
 * @description Utilitaires d'export du canvas Fabric.js vers différents formats :
 * SVG, PNG, JPEG, WebP et PDF. Chaque fonction nettoie le fond avant l'export
 * pour garantir un rendu transparent correct.
 * @module utils/exportUtils
 */

import { fabric } from 'fabric';
import jsPDF from 'jspdf';

// ─── Helper : vide le backgroundColor Fabric pendant l'export ─────────────────
// Garantit que le fond géré par CSS (div arrière-plan) n'est pas inclus dans
// les exports. Restore le fond et redessine après, quoi qu'il arrive.

/**
 * Vérifie que l'instance Fabric.js est initialisée et prête à l'export.
 * @param canvas - L'instance canvas à vérifier (peut être null).
 * @returns true si le canvas est valide et son élément DOM présent.
 */
function isReady(canvas: fabric.Canvas | null): canvas is fabric.Canvas {
  return !!canvas && !!(canvas as any).lowerCanvasEl;
}

/**
 * Exécute un callback après avoir supprimé temporairement le backgroundColor du canvas.
 * Garantit que l'arrière-plan CSS n'apparaît pas dans les exports.
 * @param canvas - L'instance Fabric.js active.
 * @param callback - Fonction recevant le niveau de zoom actuel.
 */
function withCleanCanvas(canvas: fabric.Canvas, callback: (zoom: number) => void) {
  const prevBg = canvas.backgroundColor;
  const zoom   = canvas.getZoom();
  canvas.backgroundColor = '';
  canvas.renderAll();
  try {
    callback(zoom);
  } finally {
    canvas.backgroundColor = prevBg;
    canvas.renderAll();
  }
}

// ─── Download helper ──────────────────────────────────────────────────────────

/**
 * Déclenche le téléchargement d'un fichier via un lien <a> temporaire.
 * Révoque automatiquement les URLs blob après le déclenchement.
 * @param url - L'URL de données ou blob à télécharger.
 * @param filename - Le nom de fichier proposé au navigateur.
 */
function downloadFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href           = url;
  a.download       = filename;
  a.style.display  = 'none';
  document.body.appendChild(a);
  a.click();
  // Nettoyage différé : laisse le navigateur démarrer le téléchargement
  requestAnimationFrame(() => {
    document.body.removeChild(a);
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
}

// ─── SVG ──────────────────────────────────────────────────────────────────────

/**
 * Exporte le canvas en fichier SVG vectoriel et le télécharge.
 * Les rectangles de fond injectés par Fabric sont retirés du SVG produit.
 * @param canvas - L'instance Fabric.js active (null ignoré silencieusement).
 */
export function toSVG(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  withCleanCanvas(canvas, () => {
    const svgData = canvas.toSVG();
    // Retire les éventuels rects de fond injectés par Fabric
    const clean = svgData.replace(
      /<rect[^>]*fill="[^"]*"[^>]*x="0"[^>]*y="0"[^>]*\/>/g,
      ''
    );
    const blob = new Blob([clean], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    downloadFile(url, 'easystudio-export.svg'); // revoke géré par downloadFile
  });
}

// ─── PNG ──────────────────────────────────────────────────────────────────────

/**
 * Exporte le canvas en image PNG haute résolution (×2) et la télécharge.
 * @param canvas - L'instance Fabric.js active.
 */
export function toPNG(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  withCleanCanvas(canvas, (zoom) => {
    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: (1 / zoom) * 2,
    });
    downloadFile(dataUrl, 'easystudio-export.png');
  });
}

// ─── JPEG ─────────────────────────────────────────────────────────────────────

/**
 * Exporte le canvas en image JPEG avec compression et la télécharge.
 * @param canvas - L'instance Fabric.js active.
 * @param quality - Qualité de compression JPEG entre 0 et 1 (défaut : 0.92).
 */
export function toJPEG(canvas: fabric.Canvas | null, quality = 0.92) {
  if (!isReady(canvas)) return;
  withCleanCanvas(canvas, (zoom) => {
    const dataUrl = canvas.toDataURL({
      format: 'jpeg',
      quality,
      multiplier: (1 / zoom) * 2,
    });
    downloadFile(dataUrl, 'easystudio-export.jpg');
  });
}

// ─── WebP ─────────────────────────────────────────────────────────────────────

/**
 * Exporte le canvas en image WebP optimisée pour le web et la télécharge.
 * Fabric ne produisant pas de WebP natif, une conversion PNG → canvas HTML → WebP est effectuée.
 * @param canvas - L'instance Fabric.js active.
 * @param quality - Qualité de compression WebP entre 0 et 1 (défaut : 0.9).
 */
export function toWebP(canvas: fabric.Canvas | null, quality = 0.9) {
  if (!isReady(canvas)) return;
  withCleanCanvas(canvas, (zoom) => {
    // Fabric ne génère pas de WebP natif → PNG intermédiaire puis conversion
    const pngDataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: (1 / zoom) * 2,
    });

    const logW = Math.round(canvas.getWidth()  / zoom * 2);
    const logH = Math.round(canvas.getHeight() / zoom * 2);

    const img    = new Image();
    img.onload = () => {
      const tmp = document.createElement('canvas');
      tmp.width  = logW;
      tmp.height = logH;
      const ctx = tmp.getContext('2d')!;
      ctx.drawImage(img, 0, 0, logW, logH);
      tmp.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          downloadFile(url, 'easystudio-export.webp'); // revoke géré par downloadFile
        },
        'image/webp',
        quality
      );
    };
    img.src = pngDataUrl;
  });
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/**
 * Exporte le canvas en document PDF paginé et le télécharge via jsPDF.
 * L'orientation (portrait/paysage) est déterminée automatiquement selon les dimensions.
 * @param canvas - L'instance Fabric.js active.
 * @returns Une promesse résolue une fois le téléchargement déclenché.
 */
export async function toPDF(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  return new Promise<void>((resolve) => {
    withCleanCanvas(canvas, (zoom) => {
      const dataUrl = canvas.toDataURL({
        format: 'png',
        multiplier: (1 / zoom) * 2,
      });

      const logW = Math.round(canvas.getWidth()  / zoom);
      const logH = Math.round(canvas.getHeight() / zoom);
      const orientation = logW > logH ? 'landscape' : 'portrait';

      const pdf = new jsPDF({ orientation, unit: 'px', format: [logW, logH] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, logW, logH);
      pdf.save('easystudio-export.pdf');
      resolve();
    });
  });
}
