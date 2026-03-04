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
    if (desc) return desc.length > 140 ? desc.slice(0, 137) + "..." : desc
    let text = post.description ?? ""
    // Strip footnote reference markers (e.g. "[^1]")
    text = text.replace(/\[\^[\w-]+\]/g, "")
    // Strip leaked footnote patterns (e.g. ".1 ")
    text = text.replace(/\.(\d+)\s/g, ". ")
    text = text.replace(/\s+/g, " ").trim()
    if (text.length > 140) return text.slice(0, 137) + "..."
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
            <div class="archive-entries">
              {yearPosts.map((post) => {
                const title = post.frontmatter?.title ?? ""
                const date = post.dates ? getDate(cfg, post)! : null
                const href = resolveRelative(fileData.slug!, post.slug!)
                const status = post.frontmatter?.status as string | undefined
                const tags = (post.frontmatter?.tags as string[]) ?? []
                const cover = post.frontmatter?.cover as string | undefined
                const excerpt = getExcerpt(post)

                return (
                  <a href={href} class="internal archive-entry">
                    {cover && (
                      <div class="archive-entry-thumb">
                        <img src={cover} alt="" loading="lazy" />
                      </div>
                    )}
                    <div class="archive-entry-body">
                      <div class="archive-entry-title">
                        <span>{title}</span>
                        {status && (
                          <span
                            class="archive-entry-dot"
                            style={{
                              backgroundColor:
                                status === "in-progress" ? "#c47a45" : "#5a8a5a",
                            }}
                          />
                        )}
                      </div>
                      {excerpt && (
                        <p class="archive-entry-desc">{excerpt}</p>
                      )}
                      <div class="archive-entry-meta">
                        {date && (
                          <span class="archive-entry-date">{formatDate(date)}</span>
                        )}
                        {tags.length > 0 && (
                          <span class="archive-entry-tags">
                            {tags.map((tag) => (
                              <span class="archive-entry-tag">{tag}</span>
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
  margin-bottom: 2rem;
}

.archive-year {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--gray);
  margin: 0 0 1rem 0;
}

.archive-entries {
  display: flex;
  flex-direction: column;
}

.archive-entry {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px dotted var(--lightgray);
  text-decoration: none !important;
  background-image: none !important;
  color: var(--dark);
  transition: color 0.15s ease;
}

.archive-entry:hover {
  color: var(--dark);
}

.archive-entry:hover .archive-entry-title span:first-child {
  color: var(--secondary);
  transform: translateX(2px);
}

.archive-entry-thumb {
  width: 80px;
  flex-shrink: 0;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border: 1px solid var(--lightgray);
}

.archive-entry-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.archive-entry-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  justify-content: center;
}

.archive-entry-title {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.archive-entry-title span:first-child {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark);
  line-height: 1.3;
  transition: color 0.15s ease, transform 0.15s ease;
  display: inline-block;
}

.archive-entry-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  top: -0.08em;
}

.archive-entry-desc {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 0.85rem;
  color: var(--darkgray);
  line-height: 1.4;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archive-entry-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.1rem;
}

.archive-entry-date {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--gray);
  letter-spacing: 0.02em;
}

.archive-entry-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.archive-entry-tag {
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
  .archive-entry-thumb {
    width: 60px;
  }

  .archive-entry {
    gap: 0.75rem;
  }
}
`

export default (() => Archive) satisfies QuartzComponentConstructor
