import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const CursorTrail: QuartzComponent = () => {
  return null
}

CursorTrail.afterDOMLoaded = `
(function() {
  // Shared state across SPA navigations — persists in module scope.
  if (window.__cursorTrailInit) return;
  window.__cursorTrailInit = true;

  if ('ontouchstart' in window) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var FADE_MS = 400;
  var dots = [];
  var canvas = null;
  var ctx = null;
  var drawing = false;

  function getColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#c47a45';
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function draw(now) {
    if (!canvas || !ctx) { drawing = false; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var color = getColor();
    for (var i = dots.length - 1; i >= 0; i--) {
      var dot = dots[i];
      var age = now - dot.born;
      if (age > FADE_MS) {
        dots.splice(i, 1);
        continue;
      }
      var alpha = 0.15 * (1 - age / FADE_MS);
      var radius = 1.5 * (1 - age / FADE_MS * 0.5);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  function ensureCanvas() {
    // SPA morph removes dynamically added body children — re-create canvas each nav.
    if (!document.getElementById('cursor-trail-canvas')) {
      canvas = document.createElement('canvas');
      canvas.id = 'cursor-trail-canvas';
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;';
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      resize();
      if (!drawing) {
        drawing = true;
        requestAnimationFrame(draw);
      }
    }
  }

  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', function(e) {
    dots.push({ x: e.clientX, y: e.clientY, born: performance.now() });
    if (dots.length > 30) dots.splice(0, dots.length - 30);
  });

  // Re-create canvas on every SPA navigation (micromorph removes it from body).
  document.addEventListener('nav', function() {
    ensureCanvas();
  });

  // Also create on initial load.
  ensureCanvas();
})();
`

export default (() => CursorTrail) satisfies QuartzComponentConstructor
