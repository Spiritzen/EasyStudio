import { fabric } from 'fabric';

let objectCounter = 0;
const getId = () => `obj_${++objectCounter}_${Date.now()}`;

export function resetObjectCounter() { objectCounter = 0; }
export function setObjectCounter(n: number) { objectCounter = n; }

// ─── Helpers internes ───────────────────────────────────────────────

function centerOnCanvas(canvas: fabric.Canvas, obj: fabric.Object) {
  const zoom = canvas.getZoom();
  const logW = canvas.getWidth() / zoom;
  const logH = canvas.getHeight() / zoom;
  const maxW = logW * 0.65;
  if ((obj as any).getScaledWidth?.() > maxW) obj.scaleToWidth(maxW);
  obj.set({
    left: (logW - obj.getScaledWidth()) / 2,
    top: (logH - obj.getScaledHeight()) / 2,
  });
  obj.setCoords();
}

// ─── Guard canvas initialisé ────────────────────────────────────────

function isReady(canvas: fabric.Canvas | null): canvas is fabric.Canvas {
  return !!canvas && !!(canvas as any).lowerCanvasEl;
}

// ─── Formes de base ─────────────────────────────────────────────────

export function addRect(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const zoom = canvas.getZoom();
  const cw = canvas.getWidth() / zoom;
  const ch = canvas.getHeight() / zoom;
  const rect = new fabric.Rect({
    left: (cw - 160) / 2, top: (ch - 100) / 2, width: 160, height: 100,
    fill: '#6c63ff', stroke: 'transparent', strokeWidth: 0, rx: 8, ry: 8,
  });
  (rect as any).id = getId();
  (rect as any).layerName = `Rectangle ${objectCounter}`;
  canvas.add(rect);
  canvas.setActiveObject(rect);
  canvas.renderAll();
  return rect;
}

export function addCircle(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const zoom = canvas.getZoom();
  const cw = canvas.getWidth() / zoom;
  const ch = canvas.getHeight() / zoom;
  const circle = new fabric.Circle({
    left: (cw - 120) / 2, top: (ch - 120) / 2, radius: 60,
    fill: '#f97316', stroke: 'transparent', strokeWidth: 0,
  });
  (circle as any).id = getId();
  (circle as any).layerName = `Cercle ${objectCounter}`;
  canvas.add(circle);
  canvas.setActiveObject(circle);
  canvas.renderAll();
  return circle;
}

export function addTriangle(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const zoom = canvas.getZoom();
  const cw = canvas.getWidth() / zoom;
  const ch = canvas.getHeight() / zoom;
  const tri = new fabric.Triangle({
    left: (cw - 120) / 2, top: (ch - 120) / 2, width: 120, height: 120,
    fill: '#22c55e', stroke: 'transparent', strokeWidth: 0,
  });
  (tri as any).id = getId();
  (tri as any).layerName = `Triangle ${objectCounter}`;
  canvas.add(tri);
  canvas.setActiveObject(tri);
  canvas.renderAll();
  return tri;
}

export function addText(canvas: fabric.Canvas | null, text = 'EasyStudio') {
  if (!isReady(canvas)) return;
  const zoom = canvas.getZoom();
  const cw = canvas.getWidth() / zoom;
  const ch = canvas.getHeight() / zoom;
  const txt = new fabric.IText(text, {
    left: cw / 2, top: ch / 2,
    originX: 'center', originY: 'center',
    fontFamily: 'Inter, sans-serif',
    fontSize: 36, fill: '#ffffff', fontWeight: 'bold',
  });
  (txt as any).id = getId();
  (txt as any).layerName = `Texte ${objectCounter}`;
  canvas.add(txt);
  canvas.setActiveObject(txt);
  canvas.renderAll();
  return txt;
}

// ─── Import image (fichier local) ────────────────────────────────────

export function addImage(canvas: fabric.Canvas | null, url: string) {
  if (!isReady(canvas)) return;
  fabric.Image.fromURL(url, (img) => {
    centerOnCanvas(canvas, img);
    (img as any).id = getId();
    (img as any).layerName = `Image ${objectCounter}`;
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  });
}

// ─── Import image depuis un Blob (drag & drop, clipboard) ───────────

export function addImageFromBlob(canvas: fabric.Canvas | null, blob: Blob): Promise<void> {
  if (!isReady(canvas)) return Promise.resolve();
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    fabric.Image.fromURL(url, (img) => {
      centerOnCanvas(canvas, img);
      (img as any).id = getId();
      (img as any).layerName = `Image ${objectCounter}`;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve();
    });
  });
}

// ─── Import image depuis une URL (avec gestion CORS) ─────────────────

export function addImageFromURL(canvas: fabric.Canvas | null, url: string): Promise<void> {
  if (!isReady(canvas)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // Test CORS avec un HTMLImageElement avant de laisser Fabric charger
    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    testImg.onload = () => {
      fabric.Image.fromURL(
        url,
        (img) => {
          centerOnCanvas(canvas, img);
          (img as any).id = getId();
          (img as any).layerName = `Image ${objectCounter}`;
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          resolve();
        },
        { crossOrigin: 'anonymous' }
      );
    };
    testImg.onerror = () => reject(new Error('Image non accessible (CORS)'));
    testImg.src = url;
  });
}

// ─── Import SVG (string) ─────────────────────────────────────────────

export function addSVGFromString(
  canvas: fabric.Canvas | null,
  svgString: string,
  onDone?: (group: fabric.Object) => void
) {
  if (!isReady(canvas)) return;
  fabric.loadSVGFromString(svgString, (objects, options) => {
    if (!objects || objects.length === 0) return;
    const group = fabric.util.groupSVGElements(objects, options);
    (group as any).id = getId();
    (group as any).layerName = `SVG ${objectCounter}`;
    (group as any).isSVGGroup = true;
    centerOnCanvas(canvas, group);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    onDone?.(group);
  });
}

// ─── Import SVG depuis un fichier .svg ───────────────────────────────

export function addSVGFromFile(canvas: fabric.Canvas | null, file: File): Promise<void> {
  if (!isReady(canvas)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const svgString = e.target?.result as string;
      if (!svgString) { reject(new Error('Fichier SVG vide')); return; }
      addSVGFromString(canvas, svgString, () => resolve());
    };
    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsText(file);
  });
}

// ─── Décomposer un groupe en objets individuels ──────────────────────

export function ungroupSelected(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const active = canvas.getActiveObject();
  if (!active || active.type !== 'group') return;

  const group = active as fabric.Group;
  const groupMatrix = group.calcTransformMatrix();
  const items = group.getObjects().slice(); // clone la liste

  canvas.remove(group);

  items.forEach((obj) => {
    // Calcule la transformation absolue de chaque élément dans le groupe
    const objLocalMatrix = (obj as any).calcTransformMatrix?.() ?? [1, 0, 0, 1, obj.left || 0, obj.top || 0];
    const absMatrix = fabric.util.multiplyTransformMatrices(groupMatrix, objLocalMatrix);
    const decomposed = fabric.util.qrDecompose(absMatrix);

    obj.set({ flipX: false, flipY: false });
    (obj as any).setPositionByOrigin?.(
      new fabric.Point(decomposed.translateX, decomposed.translateY),
      'center',
      'center'
    );
    obj.set({
      scaleX: decomposed.scaleX,
      scaleY: decomposed.scaleY,
      angle: decomposed.angle,
      skewX: decomposed.skewX,
      skewY: decomposed.skewY,
    });

    if (!(obj as any).id) (obj as any).id = getId();
    if (!(obj as any).layerName) (obj as any).layerName = `Forme ${objectCounter}`;

    obj.setCoords();
    canvas.add(obj);
  });

  canvas.discardActiveObject();
  canvas.renderAll();
}

// ─── Grouper la sélection ────────────────────────────────────────────

export function groupSelected(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length < 2) return;
  canvas.discardActiveObject();
  const group = new fabric.Group(activeObjects, {
    left: activeObjects[0].left,
    top: activeObjects[0].top,
  });
  (group as any).id = getId();
  (group as any).layerName = `Groupe ${objectCounter}`;
  activeObjects.forEach((obj) => canvas.remove(obj));
  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.renderAll();
}

// ─── Supprimer la sélection ──────────────────────────────────────────

export function deleteSelected(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const activeObjects = canvas.getActiveObjects();
  canvas.discardActiveObject();
  activeObjects.forEach((obj) => canvas.remove(obj));
  canvas.renderAll();
}

// ─── Nouvelles formes ────────────────────────────────────────────────

export function addLine(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const zoom = canvas.getZoom();
  const cw = canvas.getWidth() / zoom;
  const cy = canvas.getHeight() / zoom / 2;
  const line = new fabric.Line([cw * 0.25, cy, cw * 0.75, cy], {
    stroke: '#6c63ff',
    strokeWidth: 3,
    selectable: true,
  });
  (line as any).id = getId();
  (line as any).layerName = `Ligne ${objectCounter}`;
  canvas.add(line);
  canvas.setActiveObject(line);
  canvas.renderAll();
  return line;
}

export function addArrow(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const svgArrow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80">
    <line x1="0" y1="40" x2="240" y2="40" stroke="#6c63ff" stroke-width="6" stroke-linecap="round"/>
    <polygon points="235,18 300,40 235,62" fill="#6c63ff"/>
  </svg>`;
  addSVGFromString(canvas, svgArrow);
}

export function addStar(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const svgStar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <polygon points="50,5 61,35 93,36 67,56 77,86 50,68 24,86 33,56 7,36 39,35"
      fill="#f59e0b" stroke="none"/>
  </svg>`;
  addSVGFromString(canvas, svgStar);
}

// ─── Présets texte ────────────────────────────────────────────────────

export function addTextPreset(
  canvas: fabric.Canvas | null,
  preset: 'title' | 'subtitle' | 'body'
) {
  if (!isReady(canvas)) return;
  const configs = {
    title:    { text: 'Titre',        fontSize: 48, fontWeight: 'bold',   fill: '#ffffff' },
    subtitle: { text: 'Sous-titre',   fontSize: 28, fontWeight: 'normal', fill: '#c5c5e0' },
    body:     { text: 'Texte',        fontSize: 16, fontWeight: 'normal', fill: '#a0a0c0' },
  };
  const c = configs[preset];
  const zoom = canvas.getZoom();
  const logW = canvas.getWidth() / zoom;
  const logH = canvas.getHeight() / zoom;
  const tb = new fabric.Textbox(c.text, {
    left: logW / 2 - 120,
    top: logH / 2 - c.fontSize / 2,
    width: 240,
    fontSize: c.fontSize,
    fontWeight: c.fontWeight,
    fontFamily: 'Inter, sans-serif',
    fill: c.fill,
    textAlign: 'center',
  });
  (tb as any).id = getId();
  (tb as any).layerName = `${c.text} ${objectCounter}`;
  canvas.add(tb);
  canvas.setActiveObject(tb);
  canvas.renderAll();
  return tb;
}

export function addTextArc(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const svgArc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
    <path id="arc" d="M 30,150 Q 150,30 270,150" fill="none"/>
    <text font-family="Inter,sans-serif" font-size="24" fill="#ffffff" font-weight="bold">
      <textPath href="#arc" startOffset="15%">Texte en arc</textPath>
    </text>
  </svg>`;
  addSVGFromString(canvas, svgArc);
}

// ─── Dupliquer la sélection ───────────────────────────────────────────

export function duplicateSelected(canvas: fabric.Canvas | null) {
  if (!isReady(canvas)) return;
  const active = canvas.getActiveObject();
  if (!active) return;

  active.clone((cloned: fabric.Object) => {
    cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
    (cloned as any).id = getId();
    (cloned as any).layerName = `Copie ${objectCounter}`;

    if (cloned.type === 'activeSelection') {
      const sel = cloned as fabric.ActiveSelection;
      (sel as any).canvas = canvas;
      sel.forEachObject((obj: fabric.Object) => {
        (obj as any).id = getId();
        (obj as any).layerName = `Copie ${objectCounter}`;
        canvas.add(obj);
      });
      sel.setCoords();
    } else {
      canvas.add(cloned);
    }
    canvas.setActiveObject(cloned);
    canvas.renderAll();
  }, ['id', 'layerName']);
}

// ─── Aligner les objets ──────────────────────────────────────────────

export type AlignDirection = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export function alignObjects(canvas: fabric.Canvas | null, direction: AlignDirection) {
  if (!isReady(canvas)) return;
  const objects = canvas.getActiveObjects();
  if (!objects.length) return;

  if (objects.length === 1) {
    // Align single object to canvas
    const obj = objects[0];
    const zoom = canvas.getZoom();
    const cw = canvas.getWidth() / zoom;
    const ch = canvas.getHeight() / zoom;
    const w = obj.getScaledWidth();
    const h = obj.getScaledHeight();
    if (direction === 'left')   obj.set('left', 0);
    if (direction === 'right')  obj.set('left', cw - w);
    if (direction === 'center') obj.set('left', (cw - w) / 2);
    if (direction === 'top')    obj.set('top', 0);
    if (direction === 'bottom') obj.set('top', ch - h);
    if (direction === 'middle') obj.set('top', (ch - h) / 2);
    obj.setCoords();
  } else {
    // Align multiple objects relative to their bounding box
    const bounds = objects.reduce(
      (acc, obj) => {
        const l = obj.left || 0;
        const t = obj.top || 0;
        const r = l + obj.getScaledWidth();
        const b = t + obj.getScaledHeight();
        return {
          l: Math.min(acc.l, l), r: Math.max(acc.r, r),
          t: Math.min(acc.t, t), b: Math.max(acc.b, b),
        };
      },
      { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity }
    );
    objects.forEach((obj) => {
      if (direction === 'left')   obj.set('left', bounds.l);
      if (direction === 'right')  obj.set('left', bounds.r - obj.getScaledWidth());
      if (direction === 'center') obj.set('left', (bounds.l + bounds.r) / 2 - obj.getScaledWidth() / 2);
      if (direction === 'top')    obj.set('top', bounds.t);
      if (direction === 'bottom') obj.set('top', bounds.b - obj.getScaledHeight());
      if (direction === 'middle') obj.set('top', (bounds.t + bounds.b) / 2 - obj.getScaledHeight() / 2);
      obj.setCoords();
    });
  }
  canvas.renderAll();
}

// ─── Utilitaire type ─────────────────────────────────────────────────

export function getObjectType(obj: fabric.Object): string {
  if (obj.type === 'rect') return 'rect';
  if (obj.type === 'circle') return 'circle';
  if (obj.type === 'triangle') return 'triangle';
  if (obj.type === 'i-text' || obj.type === 'text') return 'text';
  if (obj.type === 'image') return 'image';
  if (obj.type === 'group') return 'group';
  return 'path';
}
