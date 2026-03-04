import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const CursorTrail: QuartzComponent = () => {
  return null
}

CursorTrail.afterDOMLoaded = `
(function() {
  // CursorTrail is a persistent global overlay — initialize once, never tear down.
  // Guard against duplicate initialization on SPA nav.
  if (document.getElementById('cursor-trail-canvas')) return;
  if ('ontouchstart' in window) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const FADE_MS = 400;
  const dots = [];
  const canvas = document.createElement('canvas');
  canvas.id = 'cursor-trail-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', (e) => {
    dots.push({ x: e.clientX, y: e.clientY, born: performance.now() });
    if (dots.length > 30) dots.splice(0, dots.length - 30);
  });

  function getColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#c47a45';
  }

  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = getColor();
    for (let i = dots.length - 1; i >= 0; i--) {
      const dot = dots[i];
      const age = now - dot.born;
      if (age > FADE_MS) {
        dots.splice(i, 1);
        continue;
      }
      const alpha = 0.15 * (1 - age / FADE_MS);
      const radius = 1.5 * (1 - age / FADE_MS * 0.5);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // Do NOT register addCleanup — this canvas persists across all SPA navigations.
})();
`

export default (() => CursorTrail) satisfies QuartzComponentConstructor
