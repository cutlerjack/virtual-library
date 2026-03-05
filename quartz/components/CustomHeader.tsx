import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { i18n } from "../i18n"

const CustomHeader: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)

  return (
    <header class="site-header">
      <div class="site-title-group">
        <a href={baseDir} class="site-title">
          {title}
        </a>
        <span class="site-coordinates" aria-hidden="true" />
      </div>
      <nav class="site-nav">
        <a href={`${baseDir}/about`}>about</a>
        <a href={`${baseDir}/archive`}>archive</a>
        <a href={`${baseDir}/tags`}>garden</a>
        <a href={`${baseDir}/random`}>random</a>
      </nav>
    </header>
  )
}

CustomHeader.afterDOMLoaded = `
document.addEventListener("nav", function() {
  const coord = document.querySelector('.site-coordinates');
  if (!coord) return;
  const slug = document.body.getAttribute('data-slug') || '';
  const map = {
    'index': '48\\u00b052\\u2032N',
    'about': 'basecamp',
    'archive': 'catalog',
    'random': 'drift',
    '404': 'terra incognita',
  };
  let label = map[slug];
  if (!label && slug.startsWith('tags')) label = 'field notes';
  if (!label && slug.startsWith('posts/')) label = 'specimen';
  if (!label) label = 'survey';
  coord.textContent = label;
});
`

CustomHeader.css = `
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 2rem 0 0.85rem;
  border-bottom: 1px solid var(--lightgray);
  margin-bottom: 2.5rem;
  max-width: 780px;
  margin-left: auto;
  margin-right: auto;
}

.site-title-group {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.site-title {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--dark);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.site-title:hover {
  color: var(--secondary);
}

.site-coordinates {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.6rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--gray);
  opacity: 0.5;
  text-transform: lowercase;
  transition: opacity 0.3s;
}

.site-header:hover .site-coordinates {
  opacity: 0.8;
}

.site-nav {
  display: flex;
  gap: 1.5rem;
  align-items: baseline;
}

.site-nav a {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--gray);
  text-decoration: none;
  text-transform: lowercase;
  transition: color 0.15s;
}

.site-nav a:hover {
  color: var(--dark);
}

/* Override the Quartz header wrapper so our header renders properly */
header:has(.site-header) {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
}

@media (max-width: 640px) {
  .site-header {
    padding: 1.25rem 0 0.65rem;
    margin-bottom: 1.75rem;
  }
  .site-coordinates {
    display: none;
  }
  .site-nav {
    gap: 1rem;
  }
  .site-nav a {
    font-size: 0.72rem;
  }
}
`

export default (() => CustomHeader) satisfies QuartzComponentConstructor
