import { QuartzComponent, QuartzComponentConstructor } from "./types"

const ScrollReveal: QuartzComponent = () => {
  return null
}

ScrollReveal.afterDOMLoaded = `
  // Scroll-reveal — fade sections in as they enter the viewport
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('nav', function() {
    if (reducedMotion) return;
    var targets = document.querySelectorAll('.post-shelf, .archive-section, .tag-garden-wrap, .newsletter-card, .about-dossier');
    if (targets.length === 0) return;
    targets.forEach(function(el) { el.classList.add('scroll-reveal'); });
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function(el) { observer.observe(el); });
    window.addCleanup(function() { observer.disconnect(); });
  });
`

export default (() => ScrollReveal) satisfies QuartzComponentConstructor
