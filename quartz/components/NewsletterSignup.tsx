import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const NewsletterSignup: QuartzComponent = ({}: QuartzComponentProps) => {
  return (
    <div class="newsletter-signup">
      <div class="newsletter-card">
        <div class="newsletter-card-header">
          <span class="newsletter-label">Field Dispatch</span>
          <span class="newsletter-seal" aria-hidden="true">JC</span>
        </div>
        <p class="newsletter-prompt">
          I write when something won't leave me alone. If you'd like
          to hear about it, leave your address.
        </p>
        <p class="newsletter-status">
          <span class="newsletter-status-dot" aria-hidden="true" />
          transmission pending
        </p>
      </div>
    </div>
  )
}

NewsletterSignup.css = `
.newsletter-signup {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-xl);
  padding-top: var(--space-l);
}

.newsletter-card {
  max-width: 420px;
  padding: var(--space-l) var(--space-l) var(--space-l);
  border: 1px solid var(--lightgray);
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 27px,
      var(--lightgray) 27px,
      var(--lightgray) 28px
    ),
    var(--light);
  background-position: 0 0.4rem;
  position: relative;
}

[saved-theme="dark"] .newsletter-card {
  border-color: rgba(255,255,255,0.06);
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 27px,
      rgba(255,255,255,0.04) 27px,
      rgba(255,255,255,0.04) 28px
    ),
    var(--light);
  background-position: 0 0.4rem;
}

.newsletter-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-s);
}

.newsletter-label {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.newsletter-seal {
  width: var(--size-seal);
  height: var(--size-seal);
  border-radius: 50%;
  background: var(--color-status-active);
  color: var(--color-surface);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
  flex-shrink: 0;
}

[saved-theme="dark"] .newsletter-seal {
  opacity: 0.75;
}

.newsletter-prompt {
  font-style: italic;
  color: var(--color-text-secondary);
  font-size: var(--text-base);
  margin-bottom: var(--space-s);
  margin-top: 0;
  font-family: var(--font-body);
  line-height: 1.6;
}

.newsletter-status {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: var(--tracking-wide);
  text-transform: lowercase;
  margin: 0;
  opacity: 0.65;
}

.newsletter-status-dot {
  width: var(--size-status-dot);
  height: var(--size-status-dot);
  border-radius: 50%;
  background: var(--color-status-active);
  animation: status-breathe 4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .newsletter-status-dot {
    animation: none;
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .newsletter-card {
    max-width: 100%;
    padding: 1.2rem 1.3rem 1.1rem;
  }
}
`

export default (() => NewsletterSignup) satisfies QuartzComponentConstructor
