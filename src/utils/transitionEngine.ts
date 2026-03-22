import type { TransitionConfig, CanvasState } from '../store/transitionStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEasing(easing: string): string {
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// JS easing functions keyed by EasingType
const EASING_FN: Record<string, (t: number) => number> = {
  'linear':      (t) => t,
  'power1.out':  (t) => 1 - Math.pow(1 - t, 2),
  'power2.out':  (t) => 1 - Math.pow(1 - t, 3),
  'power3.out':  (t) => 1 - Math.pow(1 - t, 4),
  'back.out':    (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  'elastic.out': (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  'bounce.out':  (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  'circ.out':    (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
};

function getEasingFn(easing: string): (t: number) => number {
  return EASING_FN[easing] ?? EASING_FN['power2.out'];
}

// ─── Capture thumbnail ────────────────────────────────────────────────────────

export function captureStateThumbnail(canvas: any): string {
  return canvas.toDataURL({ format: 'png', multiplier: 0.15 });
}

// ─── Play transition (requestAnimationFrame) ──────────────────────────────────

export function playTransition(
  canvas: any,
  fromJSON: object,
  toJSON: object,
  config: TransitionConfig,
  onDone?: () => void
): { cancel: () => void } {
  if (!canvas) return { cancel: () => {} };

  let rafId: number | null = null;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  // Load FROM state, then kick off the RAF loop
  canvas.loadFromJSON(fromJSON, () => {
    if (cancelled) return;
    canvas.backgroundColor = '';
    canvas.renderAll();

    const duration = (config.duration || 0.6) * 1000;
    const delayMs  = (config.delay    || 0)   * 1000;
    const type     = config.type;
    const logicalW = canvas.getWidth()  / canvas.getZoom();
    const logicalH = canvas.getHeight() / canvas.getZoom();

    // Snapshot initial values before animation mutates them
    const initial = canvas.getObjects().map((obj: any) => ({
      left:    obj.left    ?? 0,
      top:     obj.top     ?? 0,
      scaleX:  obj.scaleX  ?? 1,
      scaleY:  obj.scaleY  ?? 1,
      opacity: obj.opacity ?? 1,
      angle:   obj.angle   ?? 0,
    }));

    const start = performance.now() + delayMs;

    const animate = (now: number) => {
      if (cancelled) return;
      if (now < start) { rafId = requestAnimationFrame(animate); return; }

      const progress = Math.min((now - start) / duration, 1);
      const eased    = getEasingFn(config.easing)(progress);

      canvas.getObjects().forEach((obj: any, i: number) => {
        const init = initial[i];
        if (!init) return;

        switch (type) {
          case 'fade':
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'slideLeft':
            obj.set('left',    lerp(init.left, init.left - logicalW, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'slideRight':
            obj.set('left',    lerp(init.left, init.left + logicalW, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'slideUp':
            obj.set('top',     lerp(init.top, init.top - logicalH, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'slideDown':
            obj.set('top',     lerp(init.top, init.top + logicalH, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'zoomIn':
            obj.set('scaleX',  lerp(init.scaleX, init.scaleX * 2, eased));
            obj.set('scaleY',  lerp(init.scaleY, init.scaleY * 2, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'zoomOut':
            obj.set('scaleX',  lerp(init.scaleX, 0, eased));
            obj.set('scaleY',  lerp(init.scaleY, 0, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'rotate':
            obj.set('angle',   lerp(init.angle, init.angle + 180, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'flip':
            obj.set('scaleX',  lerp(init.scaleX, 0, eased));
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
          case 'morph':
          default:
            obj.set('opacity', lerp(init.opacity, 0, eased));
            break;
        }
        obj.setCoords();
      });

      canvas.requestRenderAll();

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        if (!cancelled) {
          canvas.loadFromJSON(toJSON, () => {
            if (!cancelled) {
              canvas.backgroundColor = '';
              canvas.renderAll();
              onDone?.();
            }
          });
        }
      }
    };

    rafId = requestAnimationFrame(animate);
  });

  return { cancel };
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
        return `@keyframes ${name} {\n  from { opacity: 1; }\n  to   { opacity: 0; }\n}`;
      case 'slideLeft':
        return `@keyframes ${name} {\n  from { transform: translateX(0); opacity: 1; }\n  to   { transform: translateX(-100%); opacity: 0; }\n}`;
      case 'slideRight':
        return `@keyframes ${name} {\n  from { transform: translateX(0); opacity: 1; }\n  to   { transform: translateX(100%); opacity: 0; }\n}`;
      case 'slideUp':
        return `@keyframes ${name} {\n  from { transform: translateY(0); opacity: 1; }\n  to   { transform: translateY(-100%); opacity: 0; }\n}`;
      case 'slideDown':
        return `@keyframes ${name} {\n  from { transform: translateY(0); opacity: 1; }\n  to   { transform: translateY(100%); opacity: 0; }\n}`;
      case 'zoomIn':
        return `@keyframes ${name} {\n  from { transform: scale(1); opacity: 1; }\n  to   { transform: scale(2); opacity: 0; }\n}`;
      case 'zoomOut':
        return `@keyframes ${name} {\n  from { transform: scale(1); opacity: 1; }\n  to   { transform: scale(0); opacity: 0; }\n}`;
      case 'rotate':
        return `@keyframes ${name} {\n  from { transform: rotate(0deg); opacity: 1; }\n  to   { transform: rotate(180deg); opacity: 0; }\n}`;
      case 'flip':
        return `@keyframes ${name} {\n  0%   { transform: scaleX(1); opacity: 1; }\n  50%  { transform: scaleX(0); opacity: 0; }\n  100% { transform: scaleX(-1); opacity: 0; }\n}`;
      case 'morph':
      default:
        return `@keyframes ${name} {\n  from { opacity: 1; filter: blur(0px); }\n  to   { opacity: 0; filter: blur(8px); }\n}`;
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
<title>EasyStudio — Aperçu Transition ${config.type}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; color: #fff; gap: 24px; }
  h1 { font-size: 18px; color: #9b8eff; letter-spacing: 0.05em; }
  .stage { position: relative; width: 480px; height: 320px; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .frame { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .frame img { width: 100%; height: 100%; object-fit: contain; }
  #frameFrom { z-index: 2; opacity: 1; transform: none; }
  #frameTo { z-index: 1; opacity: 0; }
  #frameFrom.animating { animation: exitAnim ${config.duration}s ${cssEasing} ${config.delay}s both; }
  #frameTo.animating { animation: enterAnim ${config.duration}s ${cssEasing} ${config.delay}s both; }
  @keyframes exitAnim { from { opacity: 1; transform: none; ${filterTo !== 'none' ? 'filter: none;' : ''} } to { opacity: 0; transform: ${transformTo}; ${filterTo !== 'none' ? `filter: ${filterTo};` : ''} } }
  @keyframes enterAnim { from { opacity: 0; } to { opacity: 1; } }
  button { padding: 12px 32px; background: #9b8eff; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; transition: background 0.2s; }
  button:hover { background: #7c6bdb; }
  .info { font-size: 12px; color: #6b6b8a; text-align: center; }
</style>
</head>
<body>
<h1>Transition : ${config.type} — ${config.duration}s</h1>
<div class="stage">
  <div class="frame" id="frameTo"><img src="${toState.thumbnail}" alt="${toState.name}" /></div>
  <div class="frame" id="frameFrom"><img src="${fromState.thumbnail}" alt="${fromState.name}" /></div>
</div>
<button onclick="play()">▶ Jouer la transition</button>
<p class="info">De : <strong>${fromState.name}</strong> → Vers : <strong>${toState.name}</strong><br>Type : ${config.type} | Easing : ${config.easing} | Délai : ${config.delay}s</p>
<script>
  let playing = false;
  function play() {
    if (playing) return;
    playing = true;
    const from = document.getElementById('frameFrom');
    const to = document.getElementById('frameTo');
    from.classList.remove('animating'); to.classList.remove('animating');
    to.style.opacity = '0'; from.style.opacity = '1'; from.style.transform = 'none';
    void from.offsetWidth;
    from.classList.add('animating'); to.classList.add('animating'); to.style.opacity = '';
    setTimeout(() => { from.classList.remove('animating'); to.classList.remove('animating'); from.style.opacity = '0'; to.style.opacity = '1'; playing = false; }, (${config.duration} + ${config.delay}) * 1000 + 100);
  }
<\/script>
</body>
</html>`;
}
