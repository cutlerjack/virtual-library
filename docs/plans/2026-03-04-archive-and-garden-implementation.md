# Archive Page & Garden Rename — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a card-based `/archive` page with year-grouped posts, rename the "tags" nav to "garden," cap the homepage to 3 recent posts, and seed 12-14 fake articles.

**Architecture:** A new `Archive.tsx` Quartz component renders at `/archive`, triggered by a content stub. It reads `allFiles`, filters to real posts, groups by year, and renders responsive cards with optional cover images. Navigation and PostIndex get small modifications. Seed posts populate `content/posts/` with placeholder SVG covers in `static/covers/`.

**Tech Stack:** Quartz v4, Preact (JSX), SCSS, TypeScript

---

### Task 1: Seed Content — Create 13 Fake Posts

Create 13 short markdown posts in `content/posts/` spread across 2024–2026 with varied tags, statuses, and some with cover images. This gives the archive real data to render.

**Files:**
- Create: `content/posts/on-cathedrals.md`
- Create: `content/posts/on-soil.md`
- Create: `content/posts/on-clocks.md`
- Create: `content/posts/on-bridges.md`
- Create: `content/posts/on-mycorrhizae.md`
- Create: `content/posts/on-cartography.md`
- Create: `content/posts/on-whittling.md`
- Create: `content/posts/on-typewriters.md`
- Create: `content/posts/on-migration.md`
- Create: `content/posts/on-fermentation.md`
- Create: `content/posts/on-lighthouses.md`
- Create: `content/posts/on-stone-walls.md`
- Create: `content/posts/on-tides.md`

**Step 1: Create all 13 post files**

Each post should follow this frontmatter pattern (vary the fields as listed below):

```markdown
---
title: On Cathedrals
date: 2026-02-18
status: in-progress
confidence: likely
tags:
  - engineering
  - history
cover: /static/covers/cathedrals.svg
---

Content paragraph here.
```

Post schedule (title, date, status, tags, cover yes/no):

| Title | Date | Status | Tags | Cover |
|---|---|---|---|---|
| On Cathedrals | 2026-02-18 | in-progress | engineering, history | yes |
| On Soil | 2026-01-10 | finished | systems, ecology | yes |
| On Clocks | 2025-11-22 | finished | engineering, craft | no |
| On Bridges | 2025-09-05 | in-progress | engineering, history | yes |
| On Mycorrhizae | 2025-07-14 | finished | ecology, systems | no |
| On Cartography | 2025-05-30 | finished | history, craft | yes |
| On Whittling | 2025-03-12 | in-progress | craft | no |
| On Typewriters | 2025-01-08 | finished | craft, engineering | yes |
| On Migration | 2024-11-19 | finished | animals, systems | no |
| On Fermentation | 2024-09-03 | finished | craft, systems | yes |
| On Lighthouses | 2024-07-21 | in-progress | engineering, history | yes |
| On Stone Walls | 2024-05-14 | finished | craft, history | no |
| On Tides | 2024-03-02 | finished | systems, ecology | no |

Each post body should be 2-3 sentences — enough to generate a description excerpt. Example:

```markdown
---
title: On Cathedrals
date: 2026-02-18
status: in-progress
confidence: likely
tags:
  - engineering
  - history
cover: /static/covers/cathedrals.svg
---

A cathedral is a bet placed across generations. The builders who laid the foundation at Chartres knew they would never see the spires. That kind of patience is almost incomprehensible now, but the stones are still standing.
```

Write unique, thoughtful content for each — these should feel like real posts on this site, not lorem ipsum.

**Step 2: Commit**

```bash
git add content/posts/
git commit -m "content: seed 13 posts for archive testing"
```

---

### Task 2: Placeholder Cover SVGs

Create 7 simple SVG files in `static/covers/` — one for each post that has `cover: yes` in the table above. Each SVG is a solid-color rectangle with muted earthy tones.

**Files:**
- Create: `static/covers/cathedrals.svg`
- Create: `static/covers/soil.svg`
- Create: `static/covers/bridges.svg`
- Create: `static/covers/cartography.svg`
- Create: `static/covers/typewriters.svg`
- Create: `static/covers/fermentation.svg`
- Create: `static/covers/lighthouses.svg`

**Step 1: Create the SVG files**

Each SVG should be a simple colored rectangle, 1200×630 (standard OG image ratio), with a single fill color. Use these colors:

| File | Color | Hex |
|---|---|---|
| cathedrals.svg | Warm stone gray | #8a7e6f |
| soil.svg | Rich earth brown | #5c4a3a |
| bridges.svg | Iron blue-gray | #4a5568 |
| cartography.svg | Parchment tan | #b8a88a |
| typewriters.svg | Ink charcoal | #3a3a3a |
| fermentation.svg | Amber honey | #a0722d |
| lighthouses.svg | Sea slate | #5a7a8a |

SVG template (change fill color per file):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#8a7e6f"/>
</svg>
```

**Step 2: Commit**

```bash
git add static/covers/
git commit -m "static: add placeholder cover SVGs for seed posts"
```

---

### Task 3: Archive Component

Create the `Archive.tsx` Quartz component — a card-based, year-grouped post index.

**Files:**
- Create: `quartz/components/Archive.tsx`
- Create: `content/archive.md`

**Step 1: Create `content/archive.md`**

```markdown
---
title: Archive
---
```

This minimal stub triggers the Archive component to render at `/archive`.

**Step 2: Create `quartz/components/Archive.tsx`**

The component should:
- Only render when `fileData.slug === "archive"` (return `null` otherwise)
- Filter `allFiles` to real content posts (same filter as PostIndex: exclude `index`, `about`, `random`, `archive`, `tags/*` slugs, require `frontmatter.title`)
- Sort posts by date descending
- Group by year
- Render year headings + a card grid under each

```tsx
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
```

**Step 3: Commit**

```bash
git add content/archive.md quartz/components/Archive.tsx
git commit -m "feat: add Archive component and content stub"
```

---

### Task 4: Register Archive Component

Wire the Archive component into Quartz's component index and layout.

**Files:**
- Modify: `quartz/components/index.ts`
- Modify: `quartz.layout.ts`

**Step 1: Add import and export to `quartz/components/index.ts`**

Add at the end of the import block (after line 37):

```typescript
import Archive from "./Archive"
```

Add `Archive` to the export block (after `TagGarden` on line 76):

```typescript
  Archive,
```

**Step 2: Add to layout in `quartz.layout.ts`**

The archive page uses `defaultContentPageLayout` (it's a single content page, not a list page). Add `Component.Archive()` to the `beforeBody` array, right after `Component.PostIndex()` (line 27):

```typescript
    Component.Archive(),
```

**Step 3: Commit**

```bash
git add quartz/components/index.ts quartz.layout.ts
git commit -m "feat: register Archive component in index and layout"
```

---

### Task 5: Archive Page CSS Integration

Add CSS rules to `custom.scss` for the archive page: hide the article title, hide the right sidebar, hide the drop cap, and hide the default content area.

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Add archive slug to right sidebar hiding rule**

On lines 88-92, the rule hides the right sidebar for certain pages. Add `body[data-slug="archive"]` to this list:

```scss
body[data-slug="index"] .page > #quartz-body > .right.sidebar,
body[data-slug="about"] .page > #quartz-body > .right.sidebar,
body[data-slug^="tags"] .page > #quartz-body > .right.sidebar,
body[data-slug="archive"] .page > #quartz-body > .right.sidebar,
body[data-slug="404"] .page > #quartz-body > .right.sidebar {
  display: none !important;
}
```

**Step 2: Hide the article title on the archive page**

Add after the tags/index title hiding block (after line 309):

```scss
// On the archive page, hide the default title — the component has its own header
body[data-slug="archive"] .article-title {
  display: none;
}
```

**Step 3: Hide content meta on the archive page**

Add to the content-meta hiding section (around line 327):

```scss
body[data-slug="archive"] .content-meta {
  display: none;
}
```

**Step 4: Hide the hr separator on the archive page**

Add `body[data-slug="archive"]` to the hr hiding rule (around line 339):

```scss
body[data-slug="index"] .center > hr,
body[data-slug^="tags"] .center > hr,
body[data-slug="archive"] .center > hr,
body[data-slug="404"] .center > hr {
  display: none;
}
```

**Step 5: Exclude archive page from drop cap**

Add `:not([data-slug="archive"])` to the drop cap exclusion selector on line 246:

```scss
body:not([data-slug="index"]):not([data-slug="about"]):not([data-slug^="tags"]):not([data-slug="random"]):not([data-slug="archive"]) {
```

**Step 6: Collapse the empty article on the archive page**

Add after the index article collapse rule (around line 336):

```scss
body[data-slug="archive"] article.popover-hint:empty,
body[data-slug="archive"] article.popover-hint {
  margin: 0;
  padding: 0;
  min-height: 0;
}
```

**Step 7: Commit**

```bash
git add quartz/styles/custom.scss
git commit -m "style: add archive page CSS overrides"
```

---

### Task 6: Navigation Updates

Rename "tags" to "garden" and add "archive" link in the header nav.

**Files:**
- Modify: `quartz/components/CustomHeader.tsx:14-17`

**Step 1: Update the nav links**

Change the `<nav>` section to:

```tsx
      <nav class="site-nav">
        <a href={`${baseDir}/about`}>about</a>
        <a href={`${baseDir}/archive`}>archive</a>
        <a href={`${baseDir}/tags`}>garden</a>
        <a href={`${baseDir}/random`}>random</a>
      </nav>
```

**Step 2: Commit**

```bash
git add quartz/components/CustomHeader.tsx
git commit -m "feat: add archive nav link, rename tags to garden"
```

---

### Task 7: Cap Homepage PostIndex to 3 Posts

Modify PostIndex to show only the latest 3 posts with a "See all →" link to `/archive`.

**Files:**
- Modify: `quartz/components/PostIndex.tsx`

**Step 1: Cap the posts list and add the link**

After sorting, slice to 3:

```typescript
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

  const posts = allPosts.slice(0, 3)
  const hasMore = allPosts.length > 3
```

Then after the closing `</ul>`, before the closing `</div>`, add:

```tsx
      {hasMore && (
        <a href={resolveRelative(fileData.slug!, "archive" as any)} class="internal post-index-see-all">
          See all →
        </a>
      )}
```

Add CSS for the "See all" link at the end of the existing `PostIndex.css` string (before the closing backtick):

```css
.post-index-see-all {
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

.post-index-see-all:hover {
  color: var(--secondary);
}
```

Also add `"archive"` to the slug exclusion filter (it's already there above but make sure the existing filter matches).

**Step 2: Commit**

```bash
git add quartz/components/PostIndex.tsx
git commit -m "feat: cap homepage post list to 3, add See all link"
```

---

### Task 8: Build & Visual Verification

Build the site and verify everything works.

**Step 1: Build the site**

```bash
npx quartz build --serve
```

Expected: Build succeeds with no errors. Site available at `http://localhost:8080`.

**Step 2: Verify the archive page**

Navigate to `http://localhost:8080/archive`. Expected:
- "ARCHIVE" monospace header at top
- Year sections: 2026, 2025, 2024
- 2-column card grid under each year
- Cards with covers show the colored SVG image
- Cards without covers show title directly
- Each card: title, status dot, excerpt, date, tag pills
- Hover: card lifts, subtle shadow

**Step 3: Verify the homepage**

Navigate to `http://localhost:8080/`. Expected:
- PostIndex shows only 3 most recent posts
- "See all →" link appears below the list
- Clicking it navigates to `/archive`

**Step 4: Verify navigation**

Check the header nav shows: `about · archive · garden · random`
- "archive" links to `/archive`
- "garden" links to `/tags` (the canvas garden)

**Step 5: Verify dark mode**

Toggle dark mode and check:
- Archive cards have appropriate border colors
- Cover images display correctly
- Card hover shadow works in dark mode

**Step 6: Verify mobile**

Resize to 375px width. Expected:
- Archive grid collapses to single column
- Cards remain readable
- Nav links still visible

**Step 7: Fix any issues found during verification**

If anything looks wrong — CSS conflicts, layout issues, missing data — fix them and commit.

**Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: visual polish from archive verification"
```
