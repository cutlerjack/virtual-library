import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { i18n } from "../i18n"

const CustomHeader: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)

  return (
    <>
      <a class="skip-link" href="#quartz-body">Skip to content</a>
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
          <a href={`${baseDir}/reading`}>reading</a>
          <a href={`${baseDir}/tags`}>garden</a>
          <a href={`${baseDir}/random`}>random</a>
        </nav>
      </header>
      <div class="header-spacer" />
    </>
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
    'reading': 'library',
    '404': 'terra incognita',
  };
  let label = map[slug];
  if (!label && slug.startsWith('tags')) label = 'field notes';
  if (!label && slug.startsWith('reading')) label = 'library';
  if (!label && slug.startsWith('posts/')) label = 'specimen';
  if (!label) label = 'survey';
  coord.textContent = label;

  // Active page indicator — highlight the current nav link
  var navLinks = document.querySelectorAll('.site-nav a');
  navLinks.forEach(function(link) {
    link.classList.remove('current');
    var href = link.getAttribute('href') || '';
    // Normalize: strip leading ./ or trailing /
    href = href.replace(/^\\.\\//,'').replace(/\\/$/,'');
    // Match exact slug or slug prefix
    if (slug === href || (href !== '' && slug.startsWith(href + '/'))) {
      link.classList.add('current');
    }
    // Edge case: tags link should match tags index and all tag pages
    if (href.endsWith('tags') && (slug === 'tags' || slug.startsWith('tags/'))) {
      link.classList.add('current');
    }
  });
});
`

CustomHeader.css = `
.skip-link {
  position: fixed;
  top: -100%;
  left: 1rem;
  z-index: 10000;
  padding: 0.5rem 1rem;
  background: var(--light);
  border: 1px solid var(--lightgray);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--dark);
  text-decoration: none;
  transition: top 0.15s ease;
}

.skip-link:focus-visible {
  top: 1rem;
  outline: 2px solid var(--secondary);
  outline-offset: 2px;
}

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
  font-family: var(--font-body);
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
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  opacity: 0.5;
  text-transform: lowercase;
  transition: opacity var(--duration-normal);
}

.site-header:hover .site-coordinates {
  opacity: 0.8;
}

.site-nav {
  display: flex;
  gap: var(--space-l);
  align-items: baseline;
}

.site-nav a {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-muted);
  text-decoration: none;
  text-transform: lowercase;
  transition: color var(--duration-fast), background-size var(--duration-slow);
  background: radial-gradient(circle, color-mix(in srgb, var(--color-accent) 10%, transparent) 0%, transparent 70%) no-repeat center center;
  background-size: 0% 0%;
  padding: 0.15em 0.3em;
  margin: -0.15em -0.3em;
  border-radius: var(--radius-sm);
}

.site-nav a:hover {
  color: var(--color-text);
  background-size: 280% 280%;
}

.site-nav a.current {
  color: var(--color-text);
  border-bottom: 1px solid var(--color-accent);
  padding-bottom: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .site-nav a {
    transition: color var(--duration-fast, 0.15s);
    background: none;
  }
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
