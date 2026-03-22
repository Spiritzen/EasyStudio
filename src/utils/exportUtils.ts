import { fabric } from 'fabric';
import jsPDF from 'jspdf';

// ─── Helper : vide le backgroundColor Fabric pendant l'export ─────────────────
// Garantit que le fond géré par CSS (div arrière-plan) n'est pas inclus dans
// les exports. Restore le fond et redessine après, quoi qu'il arrive.

function isReady(canvas: fabric.Canvas | null): canvas is fabric.Canvas {
  return !!canvas && !!(canvas as any).lowerCanvasEl;
}

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
