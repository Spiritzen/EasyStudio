import { fabric } from 'fabric';

function colorToCss(color: string | fabric.Pattern | fabric.Gradient): string {
  if (typeof color === 'string') return color;
  return 'transparent';
}

function generateObjectCSS(obj: fabric.Object, index: number): { html: string; css: string } {
  const left = Math.round(obj.left || 0);
  const top = Math.round(obj.top || 0);
  const w = Math.round((obj.getScaledWidth?.() ?? obj.width) || 0);
  const h = Math.round((obj.getScaledHeight?.() ?? obj.height) || 0);
  const angle = Math.round(obj.angle || 0);
  const opacity = obj.opacity ?? 1;
  const fill = colorToCss(obj.fill || 'transparent');
  const stroke = colorToCss(obj.stroke || 'transparent');
  const strokeWidth = obj.strokeWidth || 0;
  const id = `el-${index}`;

  const baseStyle = [
    `position: absolute`,
    `left: ${left}px`,
    `top: ${top}px`,
    `width: ${w}px`,
    `height: ${h}px`,
    `opacity: ${opacity}`,
    angle ? `transform: rotate(${angle}deg)` : '',
  ]
    .filter(Boolean)
    .join('; ');

  if (obj.type === 'rect') {
    const rx = (obj as fabric.Rect).rx || 0;
    const style = `${baseStyle}; background: ${fill}; border: ${strokeWidth}px solid ${stroke}; border-radius: ${rx}px`;
    return { html: `  <div id="${id}" class="logo-el"></div>`, css: `#${id} { ${style}; }` };
  }

  if (obj.type === 'circle') {
    const style = `${baseStyle}; background: ${fill}; border: ${strokeWidth}px solid ${stroke}; border-radius: 50%`;
    return { html: `  <div id="${id}" class="logo-el"></div>`, css: `#${id} { ${style}; }` };
  }

  if (obj.type === 'i-text' || obj.type === 'text') {
    const itext = obj as fabric.IText;
    const fontSize = Math.round((itext.fontSize || 16) * (itext.scaleX || 1));
    const fontWeight = itext.fontWeight || 'normal';
    const fontFamily = itext.fontFamily || 'sans-serif';
    const color = colorToCss(itext.fill || '#000');
    const text = itext.text || '';
    const style = `${baseStyle}; font-size: ${fontSize}px; font-weight: ${fontWeight}; font-family: ${fontFamily}; color: ${color}; white-space: pre`;
    return { html: `  <div id="${id}" class="logo-el">${text}</div>`, css: `#${id} { ${style}; }` };
  }

  // Fallback: SVG representation
  const svgEl = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="${baseStyle}"><rect width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/></svg>`;
  return { html: `  <!-- Element ${index} (${obj.type}) -->\n  ${svgEl}`, css: '' };
}

export function generateCode(canvas: fabric.Canvas): string {
  const objects = canvas.getObjects();
  const canvasW = canvas.getWidth();
  const canvasH = canvas.getHeight();

  const parts = objects.map((obj, i) => generateObjectCSS(obj, i + 1));
  const htmlParts = parts.map((p) => p.html).join('\n');
  const cssParts = parts
    .map((p) => p.css)
    .filter(Boolean)
    .join('\n');

  return `<!-- ✦ EasyStudio – Logo généré automatiquement -->
<!-- Intégrez ce bloc dans votre HTML -->

<style>
.logo-container {
  position: relative;
  width: ${canvasW}px;
  height: ${canvasH}px;
  overflow: hidden;
}

.logo-el {
  box-sizing: border-box;
}

${cssParts}
</style>

<div class="logo-container">
${htmlParts}
</div>`;
}
