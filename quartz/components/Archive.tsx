import { resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { getDate } from "./Date"

const Archive: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
  if (fileData.slug !== "archive") return null

  // Filter to real content posts
  const posts = allFiles
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

  if (posts.length === 0) return null

  // Group by year
  const byYear = new Map<number, typeof posts>()
  for (const post of posts) {
    const date = post.dates ? getDate(cfg, post) : null
    const year = date ? date.getFullYear() : 0
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(post)
  }

  // Sort years descending
  const years = Array.from(byYear.keys()).sort((a, b) => b - a)

  const formatDate = (d: Date) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  }

  const getExcerpt = (post: (typeof posts)[0]) => {
    const desc = post.frontmatter?.description as string | undefined
    if (desc) return desc.length > 140 ? desc.slice(0, 137) + "…" : desc
    const text = post.description ?? ""
    if (text.length > 140) return text.slice(0, 137) + "…"
    return text
  }

  return (
    <div class="archive">
      <h3 class="archive-header">Archive</h3>
      {years.map((year) => {
        const yearPosts = byYear.get(year)!
        return (
          <section class="archive-year-section">
            <h4 class="archive-year">{year === 0 ? "Undated" : year}</h4>
            <div class="archive-grid">
              {yearPosts.map((post) => {
                const title = post.frontmatter?.title ?? ""
                const date = post.dates ? getDate(cfg, post)! : null
                const href = resolveRelative(fileData.slug!, post.slug!)
                const status = post.frontmatter?.status as string | undefined
                const tags = (post.frontmatter?.tags as string[]) ?? []
                const cover = post.frontmatter?.cover as string | undefined
                const excerpt = getExcerpt(post)

                return (
                  <a href={href} class="internal archive-card" data-has-cover={cover ? "true" : "false"}>
                    {cover && (
                      <div class="archive-card-cover">
                        <img src={cover} alt="" loading="lazy" />
                      </div>
                    )}
                    <div class="archive-card-body">
                      <div class="archive-card-title-row">
                        <span class="archive-card-title">{title}</span>
                        {status && (
                          <span
                            class="archive-card-dot"
                            style={{
                              backgroundColor:
                                status === "in-progress" ? "#c47a45" : "#5a8a5a",
                            }}
                          />
                        )}
                      </div>
                      {excerpt && (
                        <p class="archive-card-excerpt">{excerpt}</p>
                      )}
                      <div class="archive-card-meta">
                        {date && (
                          <span class="archive-card-date">{formatDate(date)}</span>
                        )}
                        {tags.length > 0 && (
                          <span class="archive-card-tags">
                            {tags.map((tag) => (
                              <span class="archive-card-tag">{tag}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

Archive.css = `
.archive {
  margin-top: 1rem;
}

.archive-header {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gray);
  border-bottom: 1px solid var(--lightgray);
  padding-bottom: 0.3rem;
  margin-bottom: 1.5rem;
  margin-top: 0;
}

.archive-year-section {
  margin-bottom: 2.5rem;
}

.archive-year {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--gray);
  margin: 0 0 1rem 0;
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.archive-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--lightgray);
  border-radius: 4px;
  overflow: hidden;
  text-decoration: none !important;
  background-image: none !important;
  color: var(--dark);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.archive-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  color: var(--dark);
}

[saved-theme="dark"] .archive-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.archive-card-cover {
  width: 100%;
  aspect-ratio: 1200 / 630;
  overflow: hidden;
  border-bottom: 1px solid var(--lightgray);
}

.archive-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.archive-card-body {
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.archive-card-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.archive-card-title {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--dark);
  line-height: 1.3;
}

.archive-card:hover .archive-card-title {
  color: var(--secondary);
}

.archive-card-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  top: -0.08em;
}

.archive-card-excerpt {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 0.88rem;
  color: var(--darkgray);
  line-height: 1.45;
  margin: 0;
}

.archive-card-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.archive-card-date {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--gray);
  letter-spacing: 0.02em;
}

.archive-card-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.archive-card-tag {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.58rem;
  font-weight: 500;
  color: var(--gray);
  background: var(--highlight);
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  letter-spacing: 0.02em;
}

@media (max-width: 640px) {
  .archive-grid {
    grid-template-columns: 1fr;
  }

  .archive-card-body {
    padding: 0.75rem 0.85rem;
  }
}
`

export default (() => Archive) satisfies QuartzComponentConstructor
