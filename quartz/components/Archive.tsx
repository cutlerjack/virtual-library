import { resolveRelative } from "../util/path"
import { isContentPost } from "../util/posts"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { getDate } from "./Date"
import archiveStyle from "./styles/archive.scss"

const Archive: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
  if (fileData.slug !== "archive") return null

  // Filter to real content posts
  const posts = allFiles
    .filter((f) => isContentPost(f) && f.frontmatter?.title)
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

  // Compute accession numbers: SC-{year}-{day-of-year} (matches ContentMeta.tsx)
  const accessionMap = new Map<string, string>()
  for (const [year, yearPosts] of byYear.entries()) {
    yearPosts.forEach((post) => {
      const slug = post.slug ?? ""
      const yr = year === 0 ? "XXXX" : String(year)
      const postDate = post.dates ? getDate(cfg, post) : null
      if (postDate) {
        const startOfYear = new Date(postDate.getFullYear(), 0, 1)
        const dayOfYear = Math.floor((postDate.getTime() - startOfYear.getTime()) / 86400000) + 1
        accessionMap.set(slug, `SC-${yr}-${String(dayOfYear).padStart(3, "0")}`)
      } else {
        accessionMap.set(slug, `SC-${yr}-001`)
      }
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

Archive.css = archiveStyle

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
