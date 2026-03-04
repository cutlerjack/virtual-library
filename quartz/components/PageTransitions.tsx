import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const PageTransitions: QuartzComponent = () => {
  return null
}

PageTransitions.afterDOMLoaded = `
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('prenav', () => {
    const center = document.querySelector('.center');
    if (!center) return;
    center.classList.remove('settle-in');
    center.classList.add('puff-out');
  });

  document.addEventListener('nav', () => {
    const center = document.querySelector('.center');
    if (!center) return;
    center.classList.remove('puff-out');
    void center.offsetWidth;
    center.classList.add('settle-in');
    setTimeout(() => {
      center.classList.remove('settle-in');
    }, 400);
  });
`

export default (() => PageTransitions) satisfies QuartzComponentConstructor
