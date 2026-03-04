import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
  const baseDir = url.pathname

  return (
    <article class="popover-hint not-found-page">
      <div class="not-found-content">
        <p class="not-found-number">404</p>
        <p class="not-found-message">
          You've wandered somewhere that doesn't exist yet.
          <br />
          Maybe it will someday. Maybe it won't.
        </p>
        <p class="not-found-prompt">
          In the meantime, you could <a href={baseDir}>go back to the start</a>,
          or try your luck with <a href={`${baseDir}random`}>something random</a>.
        </p>
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
  text-align: left;
}

.not-found-content {
  max-width: 36ch;
}

.not-found-number {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 5rem;
  font-weight: 400;
  color: var(--lightgray);
  margin: 0 0 1.5rem 0;
  line-height: 1;
  letter-spacing: -0.02em;
}

.not-found-message {
  font-family: "EB Garamond", Georgia, serif;
  font-style: italic;
  font-size: 1.15rem;
  line-height: 1.7;
  color: var(--darkgray);
  margin: 0 0 1.8rem 0;
}

.not-found-prompt {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--gray);
  margin: 0;
}

.not-found-prompt a {
  color: var(--dark);
  text-decoration: none;
  border-bottom: 1px solid var(--lightgray);
  transition: border-color 0.2s ease, color 0.2s ease !important;
}

.not-found-prompt a:hover {
  color: var(--secondary);
  border-bottom-color: var(--secondary);
}
`

export default (() => NotFound) satisfies QuartzComponentConstructor
