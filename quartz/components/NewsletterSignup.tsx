import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const NewsletterSignup: QuartzComponent = ({}: QuartzComponentProps) => {
  return (
    <div class="newsletter-signup">
      <div class="newsletter-letter">
        <p class="newsletter-prompt">
          I write when something won't leave me alone. If you'd like
          to hear about it, leave your address.
        </p>
        <form
          class="newsletter-form"
          action="https://buttondown.com/api/emails/embed-subscribe/USERNAME"
          method="post"
          target="popupwindow"
        >
          <input
            class="newsletter-input"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
          />
          <button class="newsletter-btn" type="submit" aria-label="Subscribe">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

NewsletterSignup.css = `
.newsletter-signup {
  border-top: 1px solid var(--lightgray);
  margin-top: 3.5rem;
  padding-top: 1.8rem;
}

.newsletter-letter {
  max-width: 420px;
}

.newsletter-prompt {
  font-style: italic;
  color: var(--darkgray);
  font-size: 0.95rem;
  margin-bottom: 1rem;
  font-family: "EB Garamond", serif;
  line-height: 1.6;
}

.newsletter-form {
  display: flex;
  gap: 0;
  align-items: stretch;
}

.newsletter-input {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.55rem 0.8rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--lightgray);
  color: var(--dark);
  flex: 1;
  min-width: 180px;
  outline: none;
  transition: border-color 0.25s ease !important;
  border-radius: 0;
}

.newsletter-input:focus {
  border-bottom-color: var(--secondary);
}

.newsletter-input::placeholder {
  color: var(--gray);
  opacity: 0.6;
}

.newsletter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.75rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--lightgray);
  color: var(--gray);
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease !important;
}

.newsletter-btn:hover {
  color: var(--secondary);
  transform: translateX(3px);
}

.newsletter-btn svg {
  display: block;
}
`

export default (() => NewsletterSignup) satisfies QuartzComponentConstructor
