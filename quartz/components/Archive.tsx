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
        !slug.startsWith("reading/") &&
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

  // Sort years descending (for catalogue view)
  const years = Array.from(byYear.keys()).sort((a, b) => b - a)

  // Chronological order for timeline (oldest → newest, left → right)
  const timelineYears = years.slice().reverse()

  // Most recent post date for "Last surveyed" stamp
  const latestDate = posts[0]?.dates ? getDate(cfg, posts[0]) : null
  const lastSurveyed = latestDate
    ? `${latestDate.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][latestDate.getMonth()]} ${latestDate.getFullYear()}`
    : null

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  const formatDate = (d: Date) => {
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  }

  const getExcerpt = (post: (typeof posts)[0]) => {
    const desc = post.frontmatter?.description as string | undefined
    if (desc) return desc.length > 160 ? desc.slice(0, 160) : desc
    let text = post.description ?? ""
    text = text.replace(/\[\^[\w-]+\]/g, "")
    text = text.replace(/\.(\d+)\s/g, ". ")
    text = text.replace(/\s+/g, " ").trim()
    if (text.length > 160) return text.slice(0, 160)
    return text
  }

  // Compute accession numbers: SC-{year}-{padded index within year}
  const accessionMap = new Map<string, string>()
  for (const [year, yearPosts] of byYear.entries()) {
    yearPosts.forEach((post, idx) => {
      const slug = post.slug ?? ""
      const yr = year === 0 ? "XXXX" : String(year)
      const num = String(idx + 1).padStart(3, "0")
      accessionMap.set(slug, `SC-${yr}-${num}`)
    })
  }

  // ── Timeline helpers ──

  const getWordCount = (post: (typeof posts)[0]) => {
    const text = (post as any).text
    if (!text) return 500
    return text.split(/\s+/).length
  }

  const wordCounts = posts.map(getWordCount)
  const maxWords = Math.max(...wordCounts, 1)
  const minStem = 30
  const maxStem = 95

  // Deterministic hue from tag name (warm range 25°–75°)
  function tagHue(tag: string): number {
    let h = 0
    for (let i = 0; i < tag.length; i++) h = ((h << 5) - h + tag.charCodeAt(i)) | 0
    return 25 + (Math.abs(h) % 50)
  }

  return (
    <div class="archive">
      {/* ── Header row: title + view toggle ── */}
      <div class="archive-top-row">
        <div>
          <h3 class="archive-header" id="archive-heading">Catalogue</h3>
          <p class="archive-count">{posts.length} specimens catalogued.</p>
        </div>
        <div class="archive-view-toggle" role="tablist" aria-label="View mode">
          <button
            class="archive-view-btn active"
            data-view="catalogue"
            role="tab"
            aria-selected="true"
            aria-controls="archive-panel-catalogue"
          >
            Catalogue
          </button>
          <button
            class="archive-view-btn"
            data-view="survey"
            role="tab"
            aria-selected="false"
            aria-controls="archive-panel-survey"
          >
            Survey
          </button>
        </div>
      </div>

      {/* ── Search (catalogue view only) ── */}
      <div class="archive-search" id="archive-search-section">
        <label class="archive-search-label" for="archive-filter">
          Search catalogue
        </label>
        <input
          type="text"
          id="archive-filter"
          class="archive-search-input"
          placeholder="Filter by title, tag, accession no. ..."
          autocomplete="off"
          spellcheck={false}
        />
      </div>
      <div class="archive-no-results" aria-live="polite" style={{ display: "none" }}>
        <p class="archive-no-results-text">No specimens match the current query.</p>
        <p class="archive-no-results-hint">Try a different term or clear the search field.</p>
      </div>

      {/* ── Catalogue view (existing) ── */}
      <div class="archive-catalogue" id="archive-panel-catalogue" role="tabpanel">
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
                  const accession = accessionMap.get(post.slug ?? "") ?? ""

                  return (
                    <a
                      href={href}
                      class="internal archive-entry"
                      data-title={title.toLowerCase()}
                      data-tags={tags.map((t) => t.toLowerCase()).join(" ")}
                      data-desc={(excerpt ?? "").toLowerCase()}
                      data-accession={accession.toLowerCase()}
                    >
                      {cover && (
                        <div class="archive-entry-thumb">
                          <img src={cover} alt="" loading="lazy" decoding="async" />
                        </div>
                      )}
                      <div class="archive-entry-body">
                        <div class="archive-entry-title">
                          <span>{title}</span>
                          {status && (
                            <span
                              class="archive-entry-dot"
                              role="img"
                              aria-label={`Status: ${status}`}
                              title={status}
                              style={{
                                backgroundColor:
                                  status === "in-progress" ? "var(--color-status-active)" : "var(--color-status-complete)",
                              }}
                            />
                          )}
                        </div>
                        {excerpt && (
                          <p class="archive-entry-desc">{excerpt}</p>
                        )}
                        <div class="archive-entry-meta">
                          {accession && (
                            <span class="archive-entry-accession">{accession}</span>
                          )}
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

      {/* ── Survey / Timeline view ── */}
      <div class="archive-timeline" id="archive-panel-survey" role="tabpanel" style={{ display: "none" }}>
        <div class="timeline-track" role="list" aria-label="Posts arranged chronologically">
          {timelineYears.map((year) => {
            // Within each year, reverse to chronological (oldest first)
            const yearPosts = byYear.get(year)!.slice().reverse()
            return (
              <>
                <div class="timeline-marker" aria-hidden="true">
                  <span class="timeline-marker-line" />
                  <span class="timeline-marker-year">{year === 0 ? "?" : year}</span>
                </div>
                {yearPosts.map((post) => {
                  const title = post.frontmatter?.title ?? ""
                  const date = post.dates ? getDate(cfg, post)! : null
                  const href = resolveRelative(fileData.slug!, post.slug!)
                  const tags = (post.frontmatter?.tags as string[]) ?? []
                  const status = post.frontmatter?.status as string | undefined
                  const wc = getWordCount(post)
                  const stemH = Math.round(minStem + (wc / maxWords) * (maxStem - minStem))
                  const primaryTag = tags[0] ?? ""
                  const hue = primaryTag ? tagHue(primaryTag) : 40
                  const month = date ? months[date.getMonth()] : "?"

                  return (
                    <a
                      href={href}
                      class="internal timeline-point"
                      role="listitem"
                      aria-label={`${title}, ${month} ${year}`}
                    >
                      <span class="timeline-point-label">{title}</span>
                      <span
                        class={`timeline-point-bud${status === "in-progress" ? " timeline-point-bud--active" : ""}`}
                        style={{ backgroundColor: `hsla(${hue}, 35%, 45%, 0.85)` }}
                      />
                      <span class="timeline-point-stem" style={{ height: stemH + "px" }} />
                      <span class="timeline-point-date">{month}</span>
                    </a>
                  )
                })}
              </>
            )
          })}
        </div>
      </div>

      {/* ── Last surveyed stamp ── */}
      {lastSurveyed && (
        <p class="archive-stamp" aria-label={`Catalogue last updated ${lastSurveyed}`}>
          Last surveyed {lastSurveyed}
        </p>
      )}
    </div>
  )
}

Archive.css = `
/* ═══════════════════════════════════════════
   ARCHIVE — Shared
   ═══════════════════════════════════════════ */
.archive {
  margin-top: 1rem;
}

/* ── Top row: header + view toggle ── */
.archive-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0;
}

.archive-header {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-2xs);
  margin-bottom: var(--space-2xs);
  margin-top: 0;
}

.archive-count {
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-meta);
  color: var(--color-text-muted);
  margin: 0 0 var(--space-l) 0;
}

/* ── View toggle ── */
.archive-view-toggle {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.archive-view-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--color-text-muted);
  background: none;
  border: 1px solid var(--color-border);
  padding: var(--space-2xs) var(--space-xs);
  cursor: pointer;
  transition: color var(--duration-fast) ease, background-color var(--duration-fast) ease, border-color var(--duration-fast) ease;
  line-height: 1.2;
}

.archive-view-btn:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  border-right: none;
}

.archive-view-btn:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.archive-view-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.archive-view-btn.active {
  color: var(--color-text);
  background-color: var(--color-highlight);
  border-color: var(--color-text-muted);
  font-weight: 600;
}

[saved-theme="dark"] .archive-view-btn.active {
  background-color: rgba(255, 255, 255, 0.06);
  color: var(--light);
}

/* ═══════════════════════════════════════════
   CATALOGUE VIEW
   ═══════════════════════════════════════════ */
.archive-year-section {
  margin-bottom: var(--space-xl);
}

.archive-year {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-s) 0;
  padding-bottom: var(--space-3xs);
  border-bottom: 1px solid var(--color-border);
}

.archive-entries {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.archive-entry {
  display: flex;
  flex-direction: row;
  gap: var(--space-m);
  padding: var(--space-xs) var(--space-s);
  text-decoration: none;
  background-image: none;
  color: var(--dark);
  position: relative;
  background-color: transparent;
  transition: background-color var(--duration-fast) ease, padding var(--duration-fast) ease;
}

/* Ruled notebook lines on each entry */
.archive-entry::before {
  content: "";
  position: absolute;
  top: 0;
  left: var(--space-s);
  right: var(--space-s);
  bottom: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent calc(1.4rem - 1px),
    var(--lightgray) calc(1.4rem - 1px),
    var(--lightgray) 1.4rem
  );
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.archive-entry:hover::before {
  opacity: 0.35;
}

.archive-entry:hover {
  background-color: var(--highlight);
  padding: var(--space-s) var(--space-s);
}

.archive-entry:hover .archive-entry-title span:first-child {
  color: var(--secondary);
  transform: translateX(2px);
}

/* Left ruled margin line */
.archive-entry::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--secondary);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.archive-entry:hover::after {
  opacity: 0.5;
}

.archive-entry-thumb {
  width: 72px;
  flex-shrink: 0;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  background: var(--lightgray);
  position: relative;
  z-index: 1;
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
  gap: 0.15rem;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.archive-entry-title {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.archive-entry-title span:first-child {
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
  line-height: var(--line-tight);
  transition: color var(--duration-fast) ease, transform var(--duration-fast) ease;
  display: inline-block;
}

.archive-entry-dot {
  display: inline-block;
  width: var(--size-status-dot);
  height: var(--size-status-dot);
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  top: -0.08em;
}

.archive-entry-desc {
  font-family: var(--font-body);
  font-size: var(--text-meta);
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archive-entry-meta {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
  margin-top: var(--space-3xs);
}

.archive-entry-accession {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 400;
  color: var(--color-text-muted);
  letter-spacing: var(--tracking-wide);
  opacity: 0.45;
}

.archive-entry-date {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.archive-entry-tags {
  display: flex;
  gap: var(--space-2xs);
  flex-wrap: wrap;
}

.archive-entry-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--gray);
  letter-spacing: 0.02em;
}

.archive-entry-tag::before {
  content: "#";
}

[saved-theme="dark"] .archive-entry:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

@media (max-width: 640px) {
  .archive-entry-thumb {
    width: 56px;
  }

  .archive-entry {
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .archive-entry-title span:first-child {
    transition: none;
  }

  .archive-entry:hover .archive-entry-title span:first-child {
    transform: none;
  }

  .archive-entry::before,
  .archive-entry::after {
    transition: none;
  }

  .archive-entry {
    transition: none;
  }
}

/* ── Search / filter ── */
.archive-search {
  margin-bottom: var(--space-l);
}

.archive-search-label {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2xs);
}

.archive-search-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-mono);
  font-size: var(--text-meta);
  color: var(--color-text);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-2xs) 0;
  outline: none;
  transition: border-color var(--duration-fast) ease;
}

.archive-search-input::placeholder {
  color: var(--gray);
  opacity: 0.5;
  font-style: italic;
}

.archive-search-input:focus {
  border-bottom-color: var(--secondary);
}

[saved-theme="dark"] .archive-search-input {
  color: var(--light);
}

/* ── Empty state ── */
.archive-no-results {
  text-align: center;
  padding: 2.5rem 1rem;
}

.archive-no-results-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gray);
  margin: 0 0 0.3rem 0;
}

.archive-no-results-hint {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--gray);
  opacity: 0.7;
  margin: 0;
}

@media (max-width: 640px) {
  .archive-search-input {
    font-size: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .archive-search-input {
    transition: none;
  }
}

/* ── Last surveyed stamp ── */
.archive-stamp {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gray);
  opacity: 0.5;
  text-align: right;
  margin: 2.5rem 0 0 0;
  padding-top: 0.8rem;
  border-top: 1px solid var(--lightgray);
  transform: rotate(-0.5deg);
}

/* ═══════════════════════════════════════════
   SURVEY / TIMELINE VIEW
   ═══════════════════════════════════════════ */

/* ── Horizontal track (desktop) ── */
.timeline-track {
  display: flex;
  align-items: flex-end;
  gap: 0;
  overflow-x: auto;
  overflow-y: visible;
  padding: 3.5rem 1.5rem 0.5rem;
  position: relative;
  min-height: 120px;
  scrollbar-width: thin;
  scrollbar-color: var(--lightgray) transparent;
}

.timeline-track::-webkit-scrollbar {
  height: 4px;
}

.timeline-track::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-track::-webkit-scrollbar-thumb {
  background: var(--lightgray);
  border-radius: 2px;
}

/* Horizontal baseline */
.timeline-track::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 1.6rem;
  height: 1px;
  background: var(--lightgray);
  z-index: 0;
  pointer-events: none;
}

/* ── Year markers ── */
.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
  flex-shrink: 0;
  padding: 0 0.4rem;
  position: relative;
  z-index: 1;
}

.timeline-marker-line {
  display: block;
  width: 1px;
  height: 110px;
  background: var(--lightgray);
  opacity: 0.5;
}

.timeline-marker-year {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--gray);
  padding-top: 0.25rem;
  white-space: nowrap;
}

/* ── Timeline points ── */
.timeline-point {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 65px;
  flex-shrink: 0;
  padding: 0 0.3rem;
  text-decoration: none;
  background-image: none;
  color: var(--dark);
  position: relative;
  z-index: 1;
  cursor: pointer;
}

/* Rotated title label */
.timeline-point-label {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--darkgray);
  white-space: nowrap;
  transform: rotate(-55deg);
  transform-origin: bottom center;
  margin-bottom: 0.4rem;
  transition: color 0.15s ease;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-point:hover .timeline-point-label,
.timeline-point:focus-visible .timeline-point-label {
  color: var(--secondary);
}

/* Bud (colored circle) */
.timeline-point-bud {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  z-index: 2;
}

.timeline-point:hover .timeline-point-bud,
.timeline-point:focus-visible .timeline-point-bud {
  transform: scale(1.5);
  box-shadow: 0 0 0 2px var(--highlight);
}

/* In-progress buds breathe */
.timeline-point-bud--active {
  animation: timeline-breathe 4s ease-in-out infinite;
}

@keyframes timeline-breathe {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

/* Vertical stem */
.timeline-point-stem {
  display: block;
  width: 1px;
  /* height set inline */
  background: var(--lightgray);
  flex-shrink: 0;
  transition: background-color 0.15s ease;
}

.timeline-point:hover .timeline-point-stem,
.timeline-point:focus-visible .timeline-point-stem {
  background: var(--secondary);
  opacity: 0.6;
}

/* Date below baseline */
.timeline-point-date {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 500;
  color: var(--gray);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding-top: 0.35rem;
  line-height: 1;
}

/* ── Dark mode ── */
[saved-theme="dark"] .timeline-track::before {
  background: rgba(255, 255, 255, 0.08);
}

[saved-theme="dark"] .timeline-marker-line {
  background: rgba(255, 255, 255, 0.08);
}

[saved-theme="dark"] .timeline-point-stem {
  background: rgba(255, 255, 255, 0.1);
}

[saved-theme="dark"] .timeline-point:hover .timeline-point-bud {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
}

/* ── Mobile: vertical timeline ── */
@media (max-width: 640px) {
  .archive-top-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .timeline-track {
    flex-direction: column;
    align-items: stretch;
    overflow-x: visible;
    padding: 0.5rem 0 0.5rem 2rem;
    min-height: auto;
    border-left: 1px solid var(--lightgray);
    margin-left: 0.5rem;
  }

  .timeline-track::before {
    display: none;
  }

  .timeline-marker {
    flex-direction: row;
    min-width: auto;
    padding: 0.75rem 0;
    margin-left: -2rem;
    padding-left: 0;
  }

  .timeline-marker-line {
    display: none;
  }

  .timeline-marker-year {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--darkgray);
    padding: 0;
    border-bottom: 1px solid var(--lightgray);
    padding-bottom: 0.2rem;
    width: calc(100% + 2rem);
  }

  .timeline-point {
    flex-direction: row;
    min-width: auto;
    padding: 0.6rem 0;
    gap: 0.6rem;
    margin-left: -0.55rem;
  }

  .timeline-point-label {
    transform: none;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--dark);
    order: 2;
    margin-bottom: 0;
    max-width: none;
    overflow: visible;
  }

  .timeline-point-bud {
    order: 1;
    width: 9px;
    height: 9px;
    flex-shrink: 0;
  }

  .timeline-point-stem {
    display: none;
  }

  .timeline-point-date {
    order: 3;
    margin-left: auto;
    padding-top: 0;
    font-size: 0.55rem;
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .timeline-point-bud {
    transition: none;
  }

  .timeline-point-bud--active {
    animation: none;
    opacity: 1;
  }

  .timeline-point-label {
    transition: none;
  }

  .timeline-point-stem {
    transition: none;
  }

  .archive-view-btn {
    transition: none;
  }
}
`

Archive.afterDOMLoaded = `
document.addEventListener("nav", function() {
  // ── View toggle ──
  var btns = document.querySelectorAll(".archive-view-btn");
  var catalogue = document.getElementById("archive-panel-catalogue");
  var survey = document.getElementById("archive-panel-survey");
  var searchSection = document.getElementById("archive-search-section");
  var heading = document.getElementById("archive-heading");
  var noResults = document.querySelector(".archive-no-results");

  if (!btns.length || !catalogue || !survey) return;

  function switchView(view) {
    btns.forEach(function(b) {
      var isActive = b.getAttribute("data-view") === view;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (view === "catalogue") {
      catalogue.style.display = "";
      survey.style.display = "none";
      if (searchSection) searchSection.style.display = "";
      if (heading) heading.textContent = "Catalogue";
    } else {
      catalogue.style.display = "none";
      survey.style.display = "";
      if (searchSection) searchSection.style.display = "none";
      if (noResults) noResults.style.display = "none";
      if (heading) heading.textContent = "Field Survey";
    }
  }

  function handleBtnClick(e) {
    var view = e.currentTarget.getAttribute("data-view");
    if (view) switchView(view);
  }

  btns.forEach(function(btn) {
    btn.addEventListener("click", handleBtnClick);
  });

  // ── Search / filter (catalogue view) ──
  var input = document.getElementById("archive-filter");
  if (!input) return;

  var entries = document.querySelectorAll(".archive-entry");
  var sections = document.querySelectorAll(".archive-year-section");

  function filterEntries() {
    var raw = input.value.trim().toLowerCase();
    var terms = raw ? raw.split(/\\s+/) : [];

    var anyVisible = false;

    entries.forEach(function(entry) {
      if (terms.length === 0) {
        entry.style.display = "";
        anyVisible = true;
        return;
      }

      var title = entry.getAttribute("data-title") || "";
      var tags = entry.getAttribute("data-tags") || "";
      var desc = entry.getAttribute("data-desc") || "";
      var accession = entry.getAttribute("data-accession") || "";
      var haystack = title + " " + tags + " " + desc + " " + accession;

      var match = terms.every(function(term) {
        return haystack.indexOf(term) !== -1;
      });

      entry.style.display = match ? "" : "none";
      if (match) anyVisible = true;
    });

    // Hide year sections where all entries are hidden
    sections.forEach(function(section) {
      var sectionEntries = section.querySelectorAll(".archive-entry");
      var hasVisible = false;
      sectionEntries.forEach(function(e) {
        if (e.style.display !== "none") hasVisible = true;
      });
      section.style.display = hasVisible ? "" : "none";
    });

    // Show/hide empty state
    if (noResults) {
      noResults.style.display = (terms.length > 0 && !anyVisible) ? "" : "none";
    }
  }

  var searchDebounce = null;
  function debouncedFilter() {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(filterEntries, 150);
  }
  input.addEventListener("input", debouncedFilter);

  window.addCleanup(function() {
    btns.forEach(function(btn) {
      btn.removeEventListener("click", handleBtnClick);
    });
    input.removeEventListener("input", debouncedFilter);
    if (searchDebounce) clearTimeout(searchDebounce);
  });
});
`

export default (() => Archive) satisfies QuartzComponentConstructor
