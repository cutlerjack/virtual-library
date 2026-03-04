import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const WeatheredNote: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  if (fileData.slug !== "index") return null

  return (
    <div class="weathered-note">
      <div class="weathered-note-pin" aria-hidden="true">
        {/* Pushpin - circle with center dot */}
        <svg class="pin-icon pin-pushpin" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.2" opacity="0.4" />
          <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.35" />
        </svg>
        {/* Paperclip */}
        <svg class="pin-icon pin-paperclip" width="12" height="14" viewBox="0 0 12 14" fill="none">
          <path d="M3 12V4a3 3 0 0 1 6 0v6a1.5 1.5 0 0 1-3 0V5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.4" />
        </svg>
        {/* Thumbtack */}
        <svg class="pin-icon pin-thumbtack" width="12" height="14" viewBox="0 0 12 14" fill="none">
          <circle cx="6" cy="4" r="3" stroke="currentColor" stroke-width="1.1" opacity="0.4" />
          <line x1="6" y1="7" x2="6" y2="13" stroke="currentColor" stroke-width="1.1" opacity="0.35" stroke-linecap="round" />
        </svg>
        {/* Tape strip */}
        <svg class="pin-icon pin-tape" width="20" height="8" viewBox="0 0 20 8" fill="none">
          <rect x="0.5" y="1" width="19" height="6" rx="0.5" stroke="currentColor" stroke-width="0.8" opacity="0.25" fill="currentColor" fill-opacity="0.06" />
        </svg>
      </div>
      <div class="weathered-note-text">
        This is a place I'm building as I go. Everything here is subject
        to change, revision, and second-guessing. I write about whatever
        I cannot stop thinking about. You're welcome to look around.
      </div>
    </div>
  )
}

WeatheredNote.afterDOMLoaded = `
document.addEventListener("nav", function() {
  const pins = document.querySelectorAll('.pin-icon');
  if (pins.length === 0) return;
  const today = new Date();
  const dayHash = today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate();
  const idx = dayHash % pins.length;
  pins.forEach((p, i) => {
    p.style.display = i === idx ? 'block' : 'none';
  });
});
`

WeatheredNote.css = `
  @keyframes note-sway {
    0%, 100% {
      transform: rotate(-0.8deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
    25% {
      transform: rotate(-1.1deg);
      box-shadow: 2px 2px 10px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
    75% {
      transform: rotate(-0.5deg);
      box-shadow: 0px 2px 7px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
  }

  @keyframes note-sway-dark {
    0%, 100% {
      transform: rotate(-0.8deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
    25% {
      transform: rotate(-1.1deg);
      box-shadow: 2px 2px 10px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
    75% {
      transform: rotate(-0.5deg);
      box-shadow: 0px 2px 7px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
  }

  @keyframes note-sway-mobile {
    0%, 100% {
      transform: rotate(-0.4deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
    25% {
      transform: rotate(-0.6deg);
      box-shadow: 2px 2px 10px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
    75% {
      transform: rotate(-0.2deg);
      box-shadow: 0px 2px 7px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
  }

  @keyframes note-sway-mobile-dark {
    0%, 100% {
      transform: rotate(-0.4deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
    25% {
      transform: rotate(-0.6deg);
      box-shadow: 2px 2px 10px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
    75% {
      transform: rotate(-0.2deg);
      box-shadow: 0px 2px 7px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
  }

  .weathered-note {
    position: relative;
    animation: note-sway 10s ease-in-out infinite;
    max-width: 48ch;
    margin: 0 auto 3rem;
    padding: 1.6rem 1.8rem 1.5rem;
    font-style: italic;
    font-family: "EB Garamond", Georgia, serif;
    font-size: 1rem;
    line-height: 1.7;
    color: #4a4438;
    background: var(--note-bg, #ece5d5);
    border: none;
    cursor: default;
    transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1),
                box-shadow 0.4s cubic-bezier(0.23, 1, 0.32, 1) !important;

    /* Torn / rough edge via clip-path */
    clip-path: polygon(
      0% 1.2%, 2% 0%, 5% 0.6%, 10% 0%, 14% 0.3%, 20% 0%,
      25% 0.5%, 32% 0%, 38% 0.2%, 44% 0%, 50% 0.4%, 56% 0%,
      62% 0.3%, 68% 0%, 74% 0.5%, 80% 0%, 86% 0.2%, 92% 0%,
      96% 0.4%, 100% 0%,
      100% 98.8%, 97% 100%, 94% 99.4%, 88% 100%, 82% 99.6%,
      76% 100%, 70% 99.3%, 64% 100%, 58% 99.5%, 52% 100%,
      46% 99.7%, 40% 100%, 34% 99.4%, 28% 100%, 22% 99.6%,
      16% 100%, 10% 99.3%, 6% 100%, 3% 99.5%, 0% 100%
    );
  }

  /* Paper grain texture */
  .weathered-note::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.04;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    mix-blend-mode: multiply;
  }

  .weathered-note:hover {
    animation-play-state: paused;
    transform: rotate(-0.3deg) translateY(-2px);
    box-shadow:
      2px 4px 16px rgba(0,0,0,0.1),
      0 0 0 0.5px rgba(0,0,0,0.04);
  }

  [saved-theme="dark"] .weathered-note:hover {
    box-shadow:
      2px 4px 16px rgba(0,0,0,0.3),
      0 0 0 0.5px rgba(255,255,255,0.04);
  }

  .weathered-note-pin {
    position: absolute;
    top: -3px;
    left: 50%;
    transform: translateX(-50%);
    color: #8a7e6b;
    transition: transform 0.3s ease !important;
  }

  .weathered-note:hover .weathered-note-pin {
    transform: translateX(-50%) rotate(15deg);
  }

  .weathered-note-text {
    margin: 0;
  }

  .pin-icon {
    display: none;
  }

  :root {
    --note-bg: #ece5d5;
  }

  [saved-theme="dark"] {
    --note-bg: #1e2433;
  }

  [saved-theme="dark"] .weathered-note {
    color: #b8b0a0;
    animation: note-sway-dark 10s ease-in-out infinite;
  }

  [saved-theme="dark"] .weathered-note::before {
    opacity: 0.06;
    mix-blend-mode: screen;
  }

  @media (prefers-reduced-motion: reduce) {
    .weathered-note {
      animation: none;
      transform: rotate(-0.8deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
    [saved-theme="dark"] .weathered-note {
      animation: none;
      transform: rotate(-0.8deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
  }

  @media (max-width: 640px) {
    .weathered-note {
      animation: note-sway-mobile 10s ease-in-out infinite;
      margin: 0 0 2rem;
      padding: 1.3rem 1.4rem;
      max-width: 100%;
      font-size: 0.95rem;
    }
    [saved-theme="dark"] .weathered-note {
      animation: note-sway-mobile-dark 10s ease-in-out infinite;
    }
  }

  @media (max-width: 640px) and (prefers-reduced-motion: reduce) {
    .weathered-note {
      animation: none;
      transform: rotate(-0.4deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04);
    }
    [saved-theme="dark"] .weathered-note {
      animation: none;
      transform: rotate(-0.4deg);
      box-shadow: 1px 2px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.04);
    }
  }
`

export default (() => WeatheredNote) satisfies QuartzComponentConstructor
