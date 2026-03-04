import { resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { getDate } from "./Date"

const PostIndex: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
  // Only render on the index page
  if (fileData.slug !== "index") return null

  // Filter out non-content pages
  const posts = allFiles
    .filter((f) => {
      const slug = f.slug ?? ""
      return (
        slug !== "index" &&
        slug !== "about" &&
        slug !== "random" &&
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

  // Format date as "Mar 2026" style
  const formatDate = (d: Date) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div class="post-index">
      <h3 class="post-index-header">Writing</h3>
      <ul class="post-index-list">
        {posts.map((post) => {
          const title = post.frontmatter?.title ?? ""
          const date = post.dates ? getDate(cfg, post)! : null
          const href = resolveRelative(fileData.slug!, post.slug!)
          const status = post.frontmatter?.status as string | undefined

          return (
            <li class="post-index-item">
              <a href={href} class="internal post-index-title">
                {title}
              </a>
              {status && (
                <span
                  class="post-index-dot"
                  style={{
                    backgroundColor:
                      status === "in-progress" ? "#c47a45" : "#5a8a5a",
                  }}
                />
              )}
              <span class="post-index-leader" />
              {date && (
                <span class="post-index-date">{formatDate(date)}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

PostIndex.css = `
.post-index {
  margin-top: 1rem;
}

.post-index-header {
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

.post-index-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.post-index-item {
  display: flex;
  align-items: baseline;
  padding: 0.3rem 0.4rem;
  margin: 0 -0.4rem;
  line-height: 1.45;
  border-radius: 3px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.post-index-item:hover {
  background-color: rgba(0, 0, 0, 0.018);
  transform: translateX(2px);
}

[saved-theme="dark"] .post-index-item:hover {
  background-color: rgba(255, 255, 255, 0.025);
}

a.internal.post-index-title {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.05rem;
  color: var(--dark);
  text-decoration: none;
  border-bottom: none;
  flex-shrink: 0;
  transition: color 0.15s, letter-spacing 0.3s ease;
}

.post-index-item:hover a.internal.post-index-title {
  color: var(--secondary);
}

.post-index-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 0.4rem;
  position: relative;
  top: -0.08em;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.post-index-item:hover .post-index-dot {
  transform: scale(1.4);
  box-shadow: 0 0 4px rgba(196, 122, 69, 0.4);
}

.post-index-leader {
  flex: 1;
  border-bottom: 1px dotted var(--lightgray);
  margin: 0 0.5rem;
  position: relative;
  bottom: 0.2em;
  min-width: 1.5rem;
  transition: border-color 0.3s ease;
}

.post-index-item:hover .post-index-leader {
  border-bottom-color: var(--secondary);
  border-bottom-style: dotted;
}

.post-index-date {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--gray);
  flex-shrink: 0;
  letter-spacing: 0.02em;
  transition: color 0.2s ease;
}

.post-index-item:hover .post-index-date {
  color: var(--dark);
}

@media (max-width: 640px) {
  .post-index-item {
    flex-wrap: wrap;
    gap: 0.15rem;
  }

  .post-index-leader {
    display: none;
  }

  .post-index-date {
    width: 100%;
  }
}
`

export default (() => PostIndex) satisfies QuartzComponentConstructor
