import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { i18n } from "../i18n"

const CustomHeader: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)

  return (
    <header class="site-header">
      <a href={baseDir} class="site-title">
        {title}
      </a>
      <nav class="site-nav">
        <a href={`${baseDir}/about`}>about</a>
        <a href={`${baseDir}/tags`}>tags</a>
        <a href={`${baseDir}/random`}>random</a>
      </nav>
    </header>
  )
}

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
  .site-nav {
    gap: 1rem;
  }
  .site-nav a {
    font-size: 0.72rem;
  }
}
`

export default (() => CustomHeader) satisfies QuartzComponentConstructor
