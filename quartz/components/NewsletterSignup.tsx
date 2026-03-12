import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const NewsletterSignup: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  if (fileData.slug === "index") return null

  return (
    <div class="field-dispatch">
      <div class="field-dispatch-header">
        <span class="field-dispatch-label">FIELD DISPATCH</span>
        <span class="field-dispatch-seal" aria-hidden="true">
          JC
        </span>
      </div>
      <p class="field-dispatch-body">
        I write when something won't leave me alone. If you'd like to hear about it, leave your
        address.
      </p>
      <p class="field-dispatch-status">
        <span class="field-dispatch-status-dot" aria-hidden="true" />
        transmission pending
      </p>
    </div>
  )
}

NewsletterSignup.css = `
.field-dispatch {
  max-width: 56ch;
  margin: var(--space-xl) auto 0;
  padding: var(--space-l);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  position: relative;
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 27px,
      var(--color-border) 27px,
      var(--color-border) 28px
    ),
    var(--light, #fffdf8);
  background-position: 0 0.4rem;
}

[saved-theme="dark"] .field-dispatch {
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 27px,
      color-mix(in srgb, var(--light) 4%, transparent) 27px,
      color-mix(in srgb, var(--light) 4%, transparent) 28px
    ),
    var(--light, #1a1a1a);
  background-position: 0 0.4rem;
  border-color: color-mix(in srgb, var(--light) 8%, transparent);
  box-shadow: var(--shadow-md);
}

.field-dispatch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-s);
}

.field-dispatch-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.field-dispatch-seal {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--light);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transform: rotate(-6deg);
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

[saved-theme="dark"] .field-dispatch-seal {
  opacity: 0.5;
}

.field-dispatch-body {
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-s);
}

.field-dispatch-status {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: var(--tracking-wide);
  text-transform: lowercase;
  color: var(--color-text-muted);
  margin: 0;
  opacity: 0.6;
}

.field-dispatch-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: dispatch-breathe 4s ease-in-out infinite;
}

@keyframes dispatch-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .field-dispatch-status-dot {
    animation: none;
    opacity: 1;
  }
  .field-dispatch-seal {
    transform: rotate(-6deg);
  }
}

@media (max-width: 640px) {
  .field-dispatch {
    max-width: 100%;
    padding: var(--space-m);
  }
}
`

export default (() => NewsletterSignup) satisfies QuartzComponentConstructor
