import { fabric } from 'fabric';
import jsPDF from 'jspdf';

function downloadFile(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function toSVG(canvas: fabric.Canvas) {
  const savedBg = canvas.backgroundColor;
  canvas.backgroundColor = '';
  const svgData = canvas.toSVG();
  canvas.backgroundColor = savedBg;
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, 'easystudio-export.svg');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toPNG(canvas: fabric.Canvas, scale = 2) {
  const savedBg = canvas.backgroundColor;
  canvas.backgroundColor = '';
  const dataUrl = canvas.toDataURL({
    format: 'png',
    multiplier: scale,
  });
  canvas.backgroundColor = savedBg;
  downloadFile(dataUrl, 'easystudio-export.png');
}

export function toJPEG(canvas: fabric.Canvas, quality = 0.92) {
  const dataUrl = canvas.toDataURL({
    format: 'jpeg',
    quality,
    multiplier: 2,
  });
  downloadFile(dataUrl, 'easystudio-export.jpg');
}

export async function toWebP(canvas: fabric.Canvas, quality = 0.9) {
  const pngUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
  const img = new Image();
  img.src = pngUrl;
  await new Promise((res) => (img.onload = res));
  const offscreen = document.createElement('canvas');
  offscreen.width = img.naturalWidth;
  offscreen.height = img.naturalHeight;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  offscreen.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      downloadFile(url, 'easystudio-export.webp');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    'image/webp',
    quality
  );
}

export async function toPDF(canvas: fabric.Canvas) {
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  const orientation = w > h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
  pdf.save('easystudio-export.pdf');
}
