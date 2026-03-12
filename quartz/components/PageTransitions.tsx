import { QuartzComponent, QuartzComponentConstructor } from "./types"

const PageTransitions: QuartzComponent = () => {
  return null
}

PageTransitions.afterDOMLoaded = `
  // === PAGE TRANSITIONS (puff-out / settle-in) ===
  // Registered inside nav handler so each navigation gets a fresh center
  // reference and properly cleans up the prenav listener.
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    document.addEventListener('nav', function() {
      var center = document.querySelector('.center');
      if (!center) return;

      // Settle-in animation (runs on arrival to new page)
      center.classList.remove('puff-out');
      void center.offsetWidth;
      center.classList.add('settle-in');
      setTimeout(function() {
        center.classList.remove('settle-in');
      }, 400);

      // Reset fixed header on navigation (page scrolls to top)
      var sh = document.querySelector('.site-header');
      var sp = document.querySelector('.header-spacer');
      if (sh) sh.classList.remove('header-fixed');
      if (sp) sp.classList.remove('active');

      // Register puff-out for the next navigation away from this page
      function onPrenav() {
        center.classList.remove('settle-in');
        center.classList.add('puff-out');
      }
      document.addEventListener('prenav', onPrenav);
      window.addCleanup(function() {
        document.removeEventListener('prenav', onPrenav);
      });
    });
  }
`

export default (() => PageTransitions) satisfies QuartzComponentConstructor
