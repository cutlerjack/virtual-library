import { QuartzComponent, QuartzComponentConstructor } from "./types"

const TerrainParallax: QuartzComponent = () => {
  return null
}

TerrainParallax.afterDOMLoaded = `
  // Terrain parallax — topographic background drifts on scroll.
  // Registered at top level (not inside nav) because the scroll handler
  // should persist across SPA navigations — it queries the DOM fresh.
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    var ticking = false;
    function updateTopo() {
      var sy = window.scrollY;
      document.body.style.setProperty('--topo-y', (sy * 0.12) + 'px');
      // Field-depth parallax — margin decorations on post pages drift slightly
      var slug = document.body.getAttribute('data-slug') || '';
      if (slug.indexOf('posts/') === 0) {
        document.documentElement.style.setProperty('--margin-y', (sy * -0.015) + 'px');
      } else {
        document.documentElement.style.setProperty('--margin-y', '0px');
      }
      // Sticky header — switch to fixed positioning when scrolled
      var siteHeader = document.querySelector('.site-header');
      var spacer = document.querySelector('.header-spacer');
      if (siteHeader && spacer) {
        if (sy > 80) {
          if (!siteHeader.classList.contains('header-fixed')) {
            spacer.style.height = siteHeader.offsetHeight + 'px';
            spacer.classList.add('active');
            siteHeader.classList.add('header-fixed');
          }
        } else {
          siteHeader.classList.remove('header-fixed');
          spacer.classList.remove('active');
        }
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
  }
`

export default (() => TerrainParallax) satisfies QuartzComponentConstructor
