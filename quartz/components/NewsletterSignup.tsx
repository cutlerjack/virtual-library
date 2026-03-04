import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const NewsletterSignup: QuartzComponent = ({}: QuartzComponentProps) => {
  return (
    <div class="newsletter-signup">
      <p class="newsletter-prompt">If you'd like to know when I write something new:</p>
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
          placeholder="your@email.com"
          required
        />
        <button class="newsletter-btn" type="submit">Subscribe</button>
      </form>
    </div>
  )
}

NewsletterSignup.css = `
.newsletter-signup {
  border-top: 1px solid var(--lightgray);
  margin-top: 3.5rem;
  padding-top: 1.5rem;
}

.newsletter-prompt {
  font-style: italic;
  color: var(--gray);
  font-size: 0.95rem;
  margin-bottom: 0.8rem;
  font-family: "EB Garamond", serif;
}

.newsletter-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.newsletter-input {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  background: var(--light);
  border: 1px solid var(--lightgray);
  color: var(--dark);
  flex: 1;
  min-width: 200px;
  outline: none;
  transition: border-color 0.12s;
}

.newsletter-input:focus {
  border-color: var(--secondary);
}

.newsletter-btn {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 0.4rem 1rem;
  background: transparent;
  border: 1px solid var(--secondary);
  color: var(--secondary);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.newsletter-btn:hover {
  background: var(--secondary);
  color: var(--light);
}
`

export default (() => NewsletterSignup) satisfies QuartzComponentConstructor
