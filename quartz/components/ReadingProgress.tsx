import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const ReadingProgress: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const slug = fileData.slug ?? ""
  // Only show on post pages
  if (slug === "index" || slug === "about" || slug === "random" || slug === "tags" || slug.startsWith("tags/")) {
    return null
  }

  return <div class="reading-progress" id="reading-progress" />
}

ReadingProgress.afterDOMLoaded = `
document.addEventListener("nav", function() {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;

  function updateProgress() {
    const article = document.querySelector('article');
    if (!article) return;
    const rect = article.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const articleHeight = rect.height;
    const windowHeight = window.innerHeight;
    const scrolled = window.scrollY - articleTop + windowHeight * 0.3;
    const progress = Math.min(Math.max(scrolled / articleHeight, 0), 1);
    bar.style.transform = 'scaleX(' + progress + ')';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  window.addCleanup(function() {
    window.removeEventListener('scroll', updateProgress);
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
