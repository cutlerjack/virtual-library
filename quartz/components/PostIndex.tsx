import { resolveRelative } from "../util/path"
import { hashTitle } from "../util/hash"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { getDate } from "./Date"

const PostIndex: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
  // Only render on the index page
  if (fileData.slug !== "index") return null

  // Filter out non-content pages
  const allPosts = allFiles
    .filter((f) => {
      const slug = f.slug ?? ""
      return (
        slug !== "index" &&
        slug !== "about" &&
        slug !== "random" &&
        slug !== "archive" &&
        slug !== "tags" &&
        !slug.startsWith("tags/") &&
        f.frontmatter?.title
      )
    })
    .sort((a, b) => {
      if (a.dates && b.dates) {
        return getDate(cfg, b)!.getTime() - getDate(cfg, a)!.getTime()
      }
      return 0
    })

  // Prefer featured posts; fall back to latest 8
  const featuredPosts = allPosts.filter((f) => f.frontmatter?.featured)
  const posts = featuredPosts.length > 0 ? featuredPosts.slice(0, 8) : allPosts.slice(0, 8)

  if (posts.length === 0) return null

  return (
    <div class="post-shelf">
      <h3 class="post-shelf-header">Writing</h3>
      <div class="post-shelf-grid">
        {posts.map((post) => {
          const title = post.frontmatter?.title ?? ""
          const cover = post.frontmatter?.cover as string | undefined
          const description = post.frontmatter?.description as string | undefined
          const status = post.frontmatter?.status as string | undefined
          const href = resolveRelative(fileData.slug!, post.slug!)

          return (
            <a href={href} class="internal post-shelf-item">
              <div class="post-shelf-cover">
                {cover ? (
                  <img src={cover} alt={title} loading="lazy" />
                ) : (
                  <div
                    class="post-shelf-cover-placeholder"
                    data-hash={hashTitle(title)}
                    style={{ ["--cover-seed" as any]: hashTitle(title) % 360 }}
                  />
                )}
              </div>
              <div class="post-shelf-meta">
                <span class="post-shelf-title">
                  {title}
                  {status && (
                    <span
                      class="post-shelf-dot"
                      role="img"
                      aria-label={`Status: ${status}`}
                      title={status}
                      style={{
                        backgroundColor:
                          status === "in-progress" ? "var(--color-status-active)" : "var(--color-status-complete)",
                      }}
                    />
                  )}
                </span>
                {description && (
                  <span class="post-shelf-desc">{description}</span>
                )}
              </div>
            </a>
          )
        })}
      </div>
      <a href={resolveRelative(fileData.slug!, "archive" as any)} class="internal post-shelf-see-all">
        See all writing →
      </a>
    </div>
  )
}

PostIndex.css = `
.post-shelf {
  margin-top: var(--space-m);
}

.post-shelf-header {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-2xs);
  margin-bottom: var(--space-xs);
  margin-top: 0;
}

.post-shelf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-l);
}

@media (max-width: 640px) {
  .post-shelf-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

.post-shelf-item {
  display: block;
  text-decoration: none;
  background: none;
  background-image: none;
  color: var(--dark);
  border-bottom: none;
  border-radius: 0;
  padding: 0;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out);
  transform-style: preserve-3d;
}

.post-shelf-item:hover {
  transform: translateY(-4px) rotateY(-2deg);
  box-shadow: var(--shadow-lg);
}

.post-shelf-cover {
  aspect-ratio: 2 / 3;
  overflow: hidden;
  background: var(--lightgray);
  position: relative;
}

.post-shelf-cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("/static/topography-light.svg");
  background-size: 200px 200px;
  background-repeat: repeat;
  opacity: 0;
  mix-blend-mode: multiply;
  transition: opacity var(--duration-normal) var(--ease-out);
  pointer-events: none;
}

[saved-theme="dark"] .post-shelf-cover::after {
  background-image: url("/static/topography-dark.svg");
  mix-blend-mode: screen;
}

.post-shelf-item:hover .post-shelf-cover::after {
  opacity: 0.15;
}

.post-shelf-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

[saved-theme="dark"] .post-shelf-cover img {
  opacity: 0.9;
}

.post-shelf-cover-placeholder {
  width: 100%;
  height: 100%;
  --seed: var(--cover-seed, 30);
  --hue: calc(var(--seed) * 1deg);
  background:
    repeating-linear-gradient(
      calc(var(--seed) * 2.7deg + 30deg),
      transparent 0px,
      transparent 8px,
      hsla(calc(30 + var(--seed)), 25%, 60%, 0.07) 8px,
      hsla(calc(30 + var(--seed)), 25%, 60%, 0.07) 9px
    ),
    repeating-linear-gradient(
      calc(var(--seed) * 1.3deg + 90deg),
      transparent 0px,
      transparent 12px,
      hsla(calc(30 + var(--seed)), 20%, 55%, 0.05) 12px,
      hsla(calc(30 + var(--seed)), 20%, 55%, 0.05) 13px
    ),
    linear-gradient(
      calc(var(--seed) * 0.8deg + 135deg),
      hsla(calc(35 + var(--seed)), 30%, 82%, 0.6) 0%,
      hsla(calc(35 + var(--seed) * 0.5), 18%, 88%, 0.4) 50%,
      hsla(calc(30 + var(--seed) * 0.3), 15%, 92%, 0.6) 100%
    ),
    var(--lightgray);
}

[saved-theme="dark"] .post-shelf-cover-placeholder {
  background:
    repeating-linear-gradient(
      calc(var(--seed) * 2.7deg + 30deg),
      transparent 0px,
      transparent 8px,
      hsla(calc(30 + var(--seed)), 20%, 40%, 0.12) 8px,
      hsla(calc(30 + var(--seed)), 20%, 40%, 0.12) 9px
    ),
    repeating-linear-gradient(
      calc(var(--seed) * 1.3deg + 90deg),
      transparent 0px,
      transparent 12px,
      hsla(calc(30 + var(--seed)), 15%, 35%, 0.08) 12px,
      hsla(calc(30 + var(--seed)), 15%, 35%, 0.08) 13px
    ),
    linear-gradient(
      calc(var(--seed) * 0.8deg + 135deg),
      hsla(calc(35 + var(--seed)), 15%, 25%, 0.6) 0%,
      hsla(calc(35 + var(--seed) * 0.5), 10%, 22%, 0.4) 50%,
      hsla(calc(30 + var(--seed) * 0.3), 12%, 20%, 0.6) 100%
    ),
    var(--darkgray);
}

.post-shelf-meta {
  padding-top: var(--space-xs);
}

.post-shelf-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-2xs);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--line-tight);
  color: var(--color-text);
}

.post-shelf-dot {
  display: inline-block;
  width: var(--size-status-dot);
  height: var(--size-status-dot);
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  top: -0.05em;
}

.post-shelf-desc {
  display: block;
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-meta);
  line-height: var(--line-tight);
  color: var(--color-text-secondary);
  margin-top: var(--space-3xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-shelf-see-all {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-muted);
  text-decoration: none;
  border-bottom: none;
  background-image: none;
  margin-top: var(--space-s);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--color-border);
  transition: color var(--duration-fast) ease;
}

.post-shelf-see-all:hover {
  color: var(--color-accent);
}

@media (prefers-reduced-motion: reduce) {
  .post-shelf-item {
    transition: none;
  }

  .post-shelf-item:hover {
    transform: none;
  }

  .post-shelf-see-all {
    transition: none;
  }
}
`

export default (() => PostIndex) satisfies QuartzComponentConstructor
