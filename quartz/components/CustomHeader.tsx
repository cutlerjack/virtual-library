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
        <a href={`${baseDir}/graph`}>graph</a>
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
  padding: 1.75rem 0 1.1rem;
  border-bottom: 1px solid var(--lightgray);
  margin-bottom: 3rem;
}

.site-title {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.15rem;
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
  gap: 1.75rem;
  align-items: baseline;
}

.site-nav a {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--gray);
  text-decoration: none;
  transition: color 0.12s;
}

.site-nav a:hover {
  color: var(--secondary);
}

@media (max-width: 640px) {
  .site-header {
    flex-direction: column;
    gap: 0.9rem;
    padding: 1.25rem 0 0.9rem;
  }
  .site-nav {
    gap: 1.1rem;
    flex-wrap: wrap;
  }
  .site-nav a {
    font-size: 0.8rem;
  }
}
`

export default (() => CustomHeader) satisfies QuartzComponentConstructor
