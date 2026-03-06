import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

const RandomRedirect: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  if (fileData.slug !== "random") return null

  const baseDir = pathToRoot(fileData.slug!)

  const posts = (allFiles ?? [])
    .filter(
      (f) =>
        f.slug &&
        f.slug !== "index" &&
        f.slug !== "about" &&
        f.slug !== "random" &&
        f.slug !== "archive" &&
        f.slug !== "tags" &&
        !String(f.slug).startsWith("tags/"),
    )
    .filter((f) => f.frontmatter?.title)
    .map((f) => ({ slug: `${baseDir}/${f.slug}`, title: f.frontmatter?.title ?? "" }))

  const fallback = baseDir || "/"
  const postsJson = JSON.stringify(posts)

  return (
    <div class="random-redirect">
      {/* Compass rose SVG */}
      <div class="compass-container" aria-hidden="true">
        <svg class="compass-rose" viewBox="0 0 120 120" width="120" height="120">
          {/* Outer ring */}
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--lightgray)" stroke-width="1" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--lightgray)" stroke-width="0.5" />
          {/* Tick marks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const major = angle % 90 === 0
            const r1 = major ? 44 : 47
            const r2 = 50
            const rad = (angle * Math.PI) / 180
            return (
              <line
                x1={60 + r1 * Math.sin(rad)}
                y1={60 - r1 * Math.cos(rad)}
                x2={60 + r2 * Math.sin(rad)}
                y2={60 - r2 * Math.cos(rad)}
                stroke="var(--gray)"
                stroke-width={major ? "1.5" : "0.75"}
              />
            )
          })}
          {/* Cardinal labels */}
          <text x="60" y="20" text-anchor="middle" class="compass-cardinal">N</text>
          <text x="100" y="63" text-anchor="middle" class="compass-cardinal">E</text>
          <text x="60" y="106" text-anchor="middle" class="compass-cardinal">S</text>
          <text x="20" y="63" text-anchor="middle" class="compass-cardinal">W</text>
          {/* Needle — the spinning part */}
          <g class="compass-needle">
            {/* North pointer (dark) */}
            <polygon points="60,18 55,60 65,60" fill="var(--dark)" opacity="0.8" />
            {/* South pointer (light) */}
            <polygon points="60,102 55,60 65,60" fill="var(--lightgray)" opacity="0.6" />
            {/* Center dot */}
            <circle cx="60" cy="60" r="3" fill="var(--secondary)" />
          </g>
        </svg>
      </div>
      <p class="random-destination" />
      <p class="random-message">Finding a heading...</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var posts = ${postsJson};
              var chosen = posts.length > 0
                ? posts[Math.floor(Math.random() * posts.length)]
                : { slug: "${fallback}", title: "" };
              var needle = document.querySelector('.compass-needle');
              var dest = document.querySelector('.random-destination');
              var msg = document.querySelector('.random-message');
              // Random final angle (2-3 full spins + random offset)
              var spins = 720 + Math.random() * 360;
              if (needle) {
                needle.style.transition = 'transform 1.8s cubic-bezier(0.22, 1, 0.36, 1)';
                needle.style.transformOrigin = '60px 60px';
                requestAnimationFrame(function() {
                  needle.style.transform = 'rotate(' + spins + 'deg)';
                });
              }
              setTimeout(function() {
                if (dest && chosen.title) {
                  dest.textContent = chosen.title;
                  dest.classList.add('visible');
                }
                if (msg) {
                  msg.textContent = '';
                }
              }, 1600);
              setTimeout(function() {
                window.location.replace(chosen.slug);
              }, 2200);
            })();
          `,
        }}
      />
    </div>
  )
}

RandomRedirect.css = `
.random-redirect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1.2rem;
}

.compass-container {
  opacity: 0;
  animation: compass-appear 0.4s ease 0.1s forwards;
}

@keyframes compass-appear {
  to { opacity: 1; }
}

.compass-rose {
  display: block;
}

.compass-cardinal {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  fill: var(--gray);
  letter-spacing: 0.05em;
}

.compass-needle {
  transform-origin: 60px 60px;
}

.random-message {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 0.95rem;
  color: var(--gray);
  opacity: 0;
  animation: random-fade-in 0.3s ease 0.2s forwards;
  margin: 0;
}

.random-destination {
  font-family: var(--font-body);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--dark);
  margin: 0;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  min-height: 1.5em;
}

.random-destination.visible {
  opacity: 1;
  transform: translateY(0);
}

@keyframes random-fade-in {
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .compass-container {
    animation: none;
    opacity: 1;
  }

  .compass-needle {
    transition: none !important;
  }

  .random-message {
    animation: none;
    opacity: 1;
  }

  .random-destination {
    transition: none;
  }
}
`

export default (() => RandomRedirect) satisfies QuartzComponentConstructor
