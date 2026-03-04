import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const WeatheredNote: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  // Only show on the index page
  if (fileData.slug !== "index") return null

  return (
    <div class="weathered-note">
      <div class="weathered-note-pin" aria-hidden="true">
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
          <circle cx="5" cy="5" r="3.5" fill="currentColor" opacity="0.45" />
          <line
            x1="5"
            y1="8.5"
            x2="5"
            y2="18"
            stroke="currentColor"
            stroke-width="1.5"
            opacity="0.35"
          />
        </svg>
      </div>
      <div class="weathered-note-content">
        <p>
          This is a place I'm building as I go. Everything here is subject to change, revision, and
          second-guessing. I write about whatever I cannot stop thinking about. You're welcome to
          look around.
        </p>
      </div>
    </div>
  )
}

WeatheredNote.css = `
  .weathered-note {
    position: relative;
    transform: rotate(-0.7deg);
    background: var(--note-bg, #eee8d9);
    border: 1px solid rgba(0,0,0,0.07);
    box-shadow: 2px 3px 14px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.05);
    padding: 1.25rem 1.5rem 1.15rem;
    margin: 1.5rem auto 3rem;
    max-width: 54ch;
    font-style: italic;
    font-family: "EB Garamond", Georgia, serif;
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--darkgray);
  }

  .weathered-note-pin {
    position: absolute;
    top: -11px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--gray);
  }

  .weathered-note-content p {
    margin: 0;
  }

  :root {
    --note-bg: #eee8d9;
  }

  [saved-theme="dark"] {
    --note-bg: #1c2232;
  }

  [saved-theme="dark"] .weathered-note {
    border-color: rgba(255,255,255,0.07);
    box-shadow: 2px 3px 14px rgba(0,0,0,0.35);
  }
`

export default (() => WeatheredNote) satisfies QuartzComponentConstructor
