import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
  const baseDir = url.pathname

  return (
    <article class="popover-hint not-found-page">
      <div class="not-found-card">
        <div class="not-found-card-lines" aria-hidden="true" />
        <div class="not-found-card-content">
          <span class="not-found-label">Specimen not found</span>
          <p class="not-found-number">404</p>
          <p class="not-found-watermark" aria-hidden="true">terra incognita</p>
          <div class="not-found-compass" aria-hidden="true">
            <svg viewBox="0 0 120 120" width="48" height="48" class="not-found-compass-svg">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--lightgray)" stroke-width="1" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--lightgray)" stroke-width="0.5" />
              <text x="60" y="20" text-anchor="middle" class="compass-cardinal-sm">N</text>
              <text x="100" y="63" text-anchor="middle" class="compass-cardinal-sm">E</text>
              <text x="60" y="106" text-anchor="middle" class="compass-cardinal-sm">S</text>
              <text x="20" y="63" text-anchor="middle" class="compass-cardinal-sm">W</text>
              <g class="not-found-needle" style="transform: rotate(137deg); transform-origin: 60px 60px;">
                <polygon points="60,18 55,60 65,60" fill="var(--dark)" opacity="0.8" />
                <polygon points="60,102 55,60 65,60" fill="var(--lightgray)" opacity="0.6" />
                <circle cx="60" cy="60" r="3" fill="var(--secondary)" />
              </g>
            </svg>
            <span class="not-found-compass-label">You are here (approximately).</span>
          </div>
          <p class="not-found-message">
            You've wandered somewhere that doesn't exist yet.
            <br />
            Maybe it will someday. Maybe it won't.
          </p>
          <p class="not-found-prompt">
            <a href={baseDir}>Return to base camp</a>
            <span class="not-found-sep" aria-hidden="true">/</span>
            <a href={`${baseDir}random`}>Drift somewhere</a>
          </p>
        </div>
      </div>
    </article>
  )
}

NotFound.css = `
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.not-found-card {
  position: relative;
  max-width: 400px;
  width: 100%;
  padding: var(--space-xl) var(--space-xl) var(--space-xl);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
}

/* Ruled notebook lines */
.not-found-card-lines {
  position: absolute;
  top: 0;
  left: 2rem;
  right: 2rem;
  bottom: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent calc(1.4rem - 1px),
    var(--color-border) calc(1.4rem - 1px),
    var(--color-border) 1.4rem
  );
  opacity: 0.35;
  pointer-events: none;
}

/* Left margin line */
.not-found-card::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 1.25rem;
  width: 1px;
  background: var(--secondary);
  opacity: 0.25;
}

.not-found-card-content {
  position: relative;
  z-index: 1;
}

.not-found-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--color-text-muted);
  display: block;
  margin-bottom: var(--text-xs);
}

.not-found-number {
  font-family: var(--font-body);
  font-size: 4.5rem;
  font-weight: 400;
  color: var(--color-border);
  margin: 0 0 var(--space-xs) 0;
  line-height: 1;
  letter-spacing: var(--tracking-tight);
}

.not-found-watermark {
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-md);
  color: var(--color-border);
  margin: 0 0 var(--space-l) 0;
  opacity: 0.5;
  letter-spacing: 0.04em;
}

.not-found-message {
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-body);
  line-height: var(--line-body);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-l) 0;
}

.not-found-prompt {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--color-text-muted);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.not-found-sep {
  color: var(--color-border);
}

.not-found-prompt a {
  color: var(--color-text-muted);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.not-found-prompt a:hover {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.not-found-compass {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin: 0.25rem 0 1.25rem 0;
  opacity: 0.55;
}

.not-found-compass-svg {
  display: block;
}

.not-found-compass-svg .compass-cardinal-sm {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  fill: var(--gray);
  letter-spacing: 0.02em;
}

.not-found-compass-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: 0.03em;
}

[saved-theme="dark"] .not-found-card {
  background: var(--color-surface);
  border-color: var(--color-border);
}

@media (max-width: 640px) {
  .not-found-card {
    padding: var(--space-xl) var(--space-l) var(--space-l);
  }

  .not-found-card-lines {
    left: var(--space-l);
    right: var(--space-l);
  }

  .not-found-card::before {
    left: 0.75rem;
  }

  .not-found-number {
    font-size: 3.5rem;
  }

  .not-found-watermark {
    font-size: 1.15rem;
  }
}
`

export default (() => NotFound) satisfies QuartzComponentConstructor
