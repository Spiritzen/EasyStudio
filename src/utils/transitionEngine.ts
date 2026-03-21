import { gsap } from 'gsap';
import type { TransitionConfig, CanvasState } from '../store/transitionStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEasing(easing: string): string {
  // GSAP easing → CSS easing for CSS output
  const map: Record<string, string> = {
    'linear': 'linear',
    'power1.out': 'ease-out',
    'power2.out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    'power3.out': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
    'back.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'elastic.out': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'bounce.out': 'ease-out',
    'circ.out': 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  };
  return map[easing] ?? 'ease-out';
}

function matchObjects(fromObjects: any[], toObjects: any[]): Array<{ from: any; to: any }> {
  const pairs: Array<{ from: any; to: any }> = [];
  for (const toObj of toObjects) {
    const fromObj = fromObjects.find(
      (f) => f.layerName && f.layerName === toObj.layerName
    ) ?? fromObjects[toObjects.indexOf(toObj)] ?? null;
    if (fromObj) pairs.push({ from: fromObj, to: toObj });
  }
  return pairs;
}

// ─── Capture thumbnail ────────────────────────────────────────────────────────

export function captureStateThumbnail(canvas: any): string {
  return canvas.toDataURL({ format: 'png', multiplier: 0.15 });
}

// ─── Play transition ──────────────────────────────────────────────────────────

export async function playTransition(
  canvas: any,
  fromJSON: object,
  toJSON: object,
  config: TransitionConfig
): Promise<void> {
  if (!canvas) return;

  const { type, duration, easing, delay, stagger } = config;
  const w: number = canvas.getWidth();
  const h: number = canvas.getHeight();

  return new Promise((resolve) => {
    // Load the FROM state first (should already be on canvas, but ensure it)
    canvas.loadFromJSON(fromJSON, () => {
      canvas.renderAll();

      const objects = canvas.getObjects();
      const tl = gsap.timeline({
        delay,
        onComplete: () => {
          // Load the TO state
          canvas.loadFromJSON(toJSON, () => {
            canvas.renderAll();
            resolve();
          });
        },
      });

      objects.forEach((obj: any, i: number) => {
        const staggerDelay = i * stagger;

        const onUpdate = () => { obj.setCoords(); canvas.requestRenderAll(); };

        switch (type) {
          case 'fade':
            tl.fromTo(obj, { opacity: 1 }, { opacity: 0, duration, ease: easing, delay: staggerDelay, onUpdate }, staggerDelay === 0 ? undefined : '<' + staggerDelay);
            break;
          case 'slideLeft':
            tl.fromTo(obj, { left: obj.left }, { left: (obj.left ?? 0) - w, opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'slideRight':
            tl.fromTo(obj, { left: obj.left }, { left: (obj.left ?? 0) + w, opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'slideUp':
            tl.fromTo(obj, { top: obj.top }, { top: (obj.top ?? 0) - h, opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'slideDown':
            tl.fromTo(obj, { top: obj.top }, { top: (obj.top ?? 0) + h, opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'zoomIn':
            tl.fromTo(obj, { scaleX: obj.scaleX, scaleY: obj.scaleY, opacity: 1 }, { scaleX: (obj.scaleX ?? 1) * 2, scaleY: (obj.scaleY ?? 1) * 2, opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'zoomOut':
            tl.fromTo(obj, { scaleX: obj.scaleX, scaleY: obj.scaleY, opacity: 1 }, { scaleX: 0, scaleY: 0, opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'rotate':
            tl.fromTo(obj, { angle: obj.angle ?? 0, opacity: 1 }, { angle: (obj.angle ?? 0) + 180, opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'flip':
            tl.fromTo(obj, { scaleX: obj.scaleX ?? 1, opacity: 1 }, { scaleX: 0, opacity: 0, duration: duration / 2, ease: 'power2.in', onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
          case 'morph':
          default:
            tl.fromTo(obj, { opacity: 1 }, { opacity: 0, duration, ease: easing, onUpdate }, staggerDelay === 0 ? 0 : '<' + staggerDelay);
            break;
        }
      });

      if (objects.length === 0) {
        gsap.delayedCall(duration, () => {
          canvas.loadFromJSON(toJSON, () => {
            canvas.renderAll();
            resolve();
          });
        });
      }
    });
  });
}

// ─── Generate CSS keyframes ───────────────────────────────────────────────────

export function generateCSSKeyframes(config: TransitionConfig, objectNames: string[]): string {
  const { type, duration, easing, delay, stagger } = config;
  const cssEasing = getEasing(easing);
  const lines: string[] = [];

  lines.push(`/* EasyStudio — transition "${type}" */`);
  lines.push(`/* Duration: ${duration}s | Easing: ${easing} | Delay: ${delay}s | Stagger: ${stagger}s */`);
  lines.push('');

  const getKeyframes = (name: string): string => {
    switch (type) {
      case 'fade':
        return `@keyframes ${name} {
  from { opacity: 1; }
  to   { opacity: 0; }
}`;
      case 'slideLeft':
        return `@keyframes ${name} {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(-100%); opacity: 0; }
}`;
      case 'slideRight':
        return `@keyframes ${name} {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}`;
      case 'slideUp':
        return `@keyframes ${name} {
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(-100%); opacity: 0; }
}`;
      case 'slideDown':
        return `@keyframes ${name} {
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(100%); opacity: 0; }
}`;
      case 'zoomIn':
        return `@keyframes ${name} {
  from { transform: scale(1); opacity: 1; }
  to   { transform: scale(2); opacity: 0; }
}`;
      case 'zoomOut':
        return `@keyframes ${name} {
  from { transform: scale(1); opacity: 1; }
  to   { transform: scale(0); opacity: 0; }
}`;
      case 'rotate':
        return `@keyframes ${name} {
  from { transform: rotate(0deg); opacity: 1; }
  to   { transform: rotate(180deg); opacity: 0; }
}`;
      case 'flip':
        return `@keyframes ${name} {
  0%   { transform: scaleX(1); opacity: 1; }
  50%  { transform: scaleX(0); opacity: 0; }
  100% { transform: scaleX(-1); opacity: 0; }
}`;
      case 'morph':
      default:
        return `@keyframes ${name} {
  from { opacity: 1; filter: blur(0px); }
  to   { opacity: 0; filter: blur(8px); }
}`;
    }
  };

  const names = objectNames.length > 0 ? objectNames : ['element'];
  names.forEach((name, i) => {
    const safeName = `tr_${type}_${name.replace(/\s+/g, '_')}`;
    lines.push(getKeyframes(safeName));
    lines.push('');
    const objDelay = delay + i * stagger;
    lines.push(`.${name.replace(/\s+/g, '-')} {`);
    lines.push(`  animation: ${safeName} ${duration}s ${cssEasing} ${objDelay}s both;`);
    lines.push('}');
    lines.push('');
  });

  return lines.join('\n');
}

// ─── Generate HTML preview ────────────────────────────────────────────────────

export function generateHTMLPreview(
  fromState: CanvasState,
  toState: CanvasState,
  config: TransitionConfig
): string {
  const cssEasing = getEasing(config.easing);

  const getTransformTo = (): string => {
    switch (config.type) {
      case 'slideLeft':  return 'translateX(-100%)';
      case 'slideRight': return 'translateX(100%)';
      case 'slideUp':    return 'translateY(-100%)';
      case 'slideDown':  return 'translateY(100%)';
      case 'zoomIn':     return 'scale(2)';
      case 'zoomOut':    return 'scale(0)';
      case 'rotate':     return 'rotate(180deg)';
      case 'flip':       return 'scaleX(0)';
      default:           return 'none';
    }
  };

  const filterTo = config.type === 'morph' ? 'blur(8px)' : 'none';
  const transformTo = getTransformTo();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EasyStudio — Aperçu Transition ${config.type}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: system-ui, sans-serif;
    color: #fff;
    gap: 24px;
  }
  h1 { font-size: 18px; color: #9b8eff; letter-spacing: 0.05em; }
  .stage {
    position: relative;
    width: 480px;
    height: 320px;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .frame {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .frame img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  #frameFrom {
    z-index: 2;
    opacity: 1;
    transform: none;
    transition: none;
  }
  #frameTo {
    z-index: 1;
    opacity: 0;
  }
  #frameFrom.animating {
    animation: exitAnim ${config.duration}s ${cssEasing} ${config.delay}s both;
  }
  #frameTo.animating {
    animation: enterAnim ${config.duration}s ${cssEasing} ${config.delay}s both;
  }

  @keyframes exitAnim {
    from { opacity: 1; transform: none; ${filterTo !== 'none' ? 'filter: none;' : ''} }
    to   { opacity: 0; transform: ${transformTo}; ${filterTo !== 'none' ? `filter: ${filterTo};` : ''} }
  }
  @keyframes enterAnim {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  button {
    padding: 12px 32px;
    background: #9b8eff;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s;
  }
  button:hover { background: #7c6bdb; }
  .info {
    font-size: 12px;
    color: #6b6b8a;
    text-align: center;
  }
</style>
</head>
<body>
<h1>Transition : ${config.type} — ${config.duration}s</h1>

<div class="stage">
  <div class="frame" id="frameTo">
    <img src="${toState.thumbnail}" alt="${toState.name}" />
  </div>
  <div class="frame" id="frameFrom">
    <img src="${fromState.thumbnail}" alt="${fromState.name}" />
  </div>
</div>

<button onclick="play()">▶ Jouer la transition</button>

<p class="info">
  De : <strong>${fromState.name}</strong> → Vers : <strong>${toState.name}</strong><br>
  Type : ${config.type} | Easing : ${config.easing} | Délai : ${config.delay}s
</p>

<script>
  let playing = false;
  function play() {
    if (playing) return;
    playing = true;
    const from = document.getElementById('frameFrom');
    const to = document.getElementById('frameTo');
    from.classList.remove('animating');
    to.classList.remove('animating');
    to.style.opacity = '0';
    from.style.opacity = '1';
    from.style.transform = 'none';
    void from.offsetWidth; // reflow
    from.classList.add('animating');
    to.classList.add('animating');
    to.style.opacity = '';
    setTimeout(() => {
      from.classList.remove('animating');
      to.classList.remove('animating');
      from.style.opacity = '0';
      to.style.opacity = '1';
      playing = false;
    }, (${config.duration} + ${config.delay}) * 1000 + 100);
  }
</script>
</body>
</html>`;
}
