import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { isContentSlug } from "../util/posts"

const ReadingProgress: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const slug = fileData.slug ?? ""
  // Only show on post pages
  if (!isContentSlug(slug)) return null

  return <div class="reading-progress" id="reading-progress" />
}

ReadingProgress.afterDOMLoaded = `
document.addEventListener("nav", function() {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;

  // Check if we're on desktop with margin decorations
  var isWide = window.matchMedia('(min-width: 1000px)').matches;

  function updateProgress() {
    var article = document.querySelector('article');
    if (!article) return;
    var rect = article.getBoundingClientRect();
    var articleTop = rect.top + window.scrollY;
    var articleHeight = rect.height;
    var windowHeight = window.innerHeight;
    var scrolled = window.scrollY - articleTop + windowHeight * 0.3;
    var progress = Math.min(Math.max(scrolled / articleHeight, 0), 1);

    if (isWide) {
      // Set CSS custom property on article for the margin vine fill
      article.style.setProperty('--read-progress', progress);
      bar.style.transform = 'scaleX(0)';
      bar.style.opacity = '0';
    } else {
      bar.style.transform = 'scaleX(' + progress + ')';
      bar.style.opacity = '0.7';
    }
  }

  function onResize() {
    isWide = window.matchMedia('(min-width: 1000px)').matches;
    updateProgress();
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  updateProgress();

  // Reset bar on prenav to prevent flash of old progress
  function onPrenav() {
    bar.style.transform = 'scaleX(0)';
    var article = document.querySelector('article');
    if (article) article.style.setProperty('--read-progress', 0);
  }
  document.addEventListener('prenav', onPrenav);

  window.addCleanup(function() {
    window.removeEventListener('scroll', updateProgress);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('prenav', onPrenav);
  });
});
`

ReadingProgress.css = `
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--secondary);
  transform-origin: 0 0;
  transform: scaleX(0);
  z-index: 9998;
  transition: opacity 0.3s ease;
  opacity: 0.7;
}
`

export default (() => ReadingProgress) satisfies QuartzComponentConstructor
