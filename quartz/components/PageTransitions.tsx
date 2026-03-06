import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const PageTransitions: QuartzComponent = () => {
  return null
}

PageTransitions.afterDOMLoaded = `
  // Console easter egg — a small greeting for the curious
  if (!window.__fieldStationGreeted) {
    window.__fieldStationGreeted = true;
    console.log(
      '%c' +
      '       N       \\n' +
      '       |       \\n' +
      '  W ---+--- E  \\n' +
      '       |       \\n' +
      '       S       \\n',
      'font-family: monospace; color: #a0522d; font-size: 12px; line-height: 1.4;'
    );
    console.log(
      '%cField Station // jackcutler.net',
      'font-family: Georgia, serif; color: #a0522d; font-size: 14px; font-style: italic;'
    );
    console.log(
      '%cYou found the workshop. View source at github.com/jackrcutler.',
      'font-family: monospace; color: #888; font-size: 11px;'
    );
  }

  // Seasonal palette — accent color shifts subtly across seasons
  var m = new Date().getMonth();
  var season = m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  document.documentElement.setAttribute('data-season', season);

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reducedMotion) {
    var transitioning = false;

    document.addEventListener('prenav', () => {
      const center = document.querySelector('.center');
      if (!center || transitioning) return;
      transitioning = true;
      center.classList.remove('settle-in');
      center.classList.add('puff-out');
    });

    document.addEventListener('nav', () => {
      const center = document.querySelector('.center');
      if (!center) return;
      transitioning = false;
      center.classList.remove('puff-out');
      void center.offsetWidth;
      center.classList.add('settle-in');
      setTimeout(() => {
        center.classList.remove('settle-in');
      }, 400);
    });
  }

  // Terrain parallax — topographic background drifts on scroll
  if (!reducedMotion) {
    var ticking = false;
    function updateTopo() {
      var sy = window.scrollY;
      document.body.style.setProperty('--topo-y', (sy * 0.12) + 'px');
      // Field-depth parallax — margin decorations on post pages drift slightly
      var slug = document.body.getAttribute('data-slug') || '';
      if (slug.indexOf('posts/') === 0) {
        document.body.style.setProperty('--margin-shift', (sy * 0.015) + 'px');
      }
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateTopo);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addCleanup(function() {
      window.removeEventListener('scroll', onScroll);
    });
  }
`

export default (() => PageTransitions) satisfies QuartzComponentConstructor
