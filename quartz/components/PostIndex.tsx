import { resolveRelative } from "../util/path"
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
                  <div class="post-shelf-cover-placeholder" />
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
                          status === "in-progress" ? "#c47a45" : "#5a8a5a",
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
  margin-top: 1rem;
}

.post-shelf-header {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gray);
  border-bottom: 1px solid var(--lightgray);
  padding-bottom: 0.3rem;
  margin-bottom: 0.6rem;
  margin-top: 0;
}

.post-shelf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
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
  background-image: none !important;
  color: var(--dark);
  border-bottom: none !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-radius: 4px;
}

.post-shelf-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

[saved-theme="dark"] .post-shelf-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.post-shelf-cover {
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: 3px;
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
  background: linear-gradient(135deg, var(--highlight) 0%, var(--lightgray) 100%);
}

.post-shelf-meta {
  padding-top: 0.45rem;
}

.post-shelf-title {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-family: "EB Garamond", Georgia, serif;
  font-size: 0.95rem;
  line-height: 1.3;
  color: var(--dark);
}

.post-shelf-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  top: -0.05em;
}

.post-shelf-desc {
  display: block;
  font-family: "EB Garamond", Georgia, serif;
  font-style: italic;
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--darkgray);
  margin-top: 0.15rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-shelf-see-all {
  display: block;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--gray);
  text-decoration: none;
  border-bottom: none !important;
  background-image: none !important;
  margin-top: 0.8rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--lightgray);
  transition: color 0.15s;
}

.post-shelf-see-all:hover {
  color: var(--secondary);
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
