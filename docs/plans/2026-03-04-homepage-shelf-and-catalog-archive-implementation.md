# Homepage Shelf & Catalog Archive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the sparse homepage post list with a visual "bookshelf" of curated covers, replace the card-grid archive with a dense typographic catalog, add a sway animation to the weathered note, and source real public domain cover images for all 13 seed posts.

**Architecture:** Two Quartz components rewritten (`PostIndex.tsx` → Shelf, `Archive.tsx` → Catalog), one component enhanced (`WeatheredNote.tsx` → sway animation), CSS overrides updated, 7 placeholder SVGs replaced with 13 public domain JPGs, and seed post frontmatter updated.

**Tech Stack:** Quartz v4, Preact JSX (`.tsx`), SCSS, static site generation. Build: `npx quartz build`. Dev: `npx quartz build --serve` (port 8080).

---

### Task 1: Source and download 13 public domain cover images

**Files:**
- Create: `quartz/static/covers/on-armadillos.jpg`
- Create: `quartz/static/covers/on-cathedrals.jpg`
- Create: `quartz/static/covers/on-soil.jpg`
- Create: `quartz/static/covers/on-clocks.jpg`
- Create: `quartz/static/covers/on-bridges.jpg`
- Create: `quartz/static/covers/on-mycorrhizae.jpg`
- Create: `quartz/static/covers/on-cartography.jpg`
- Create: `quartz/static/covers/on-whittling.jpg`
- Create: `quartz/static/covers/on-typewriters.jpg`
- Create: `quartz/static/covers/on-migration.jpg`
- Create: `quartz/static/covers/on-fermentation.jpg`
- Create: `quartz/static/covers/on-lighthouses.jpg`
- Create: `quartz/static/covers/on-stone-walls.jpg`
- Create: `quartz/static/covers/on-tides.jpg`
- Remove: `quartz/static/covers/bridges.svg`
- Remove: `quartz/static/covers/cartography.svg`
- Remove: `quartz/static/covers/cathedrals.svg`
- Remove: `quartz/static/covers/fermentation.svg`
- Remove: `quartz/static/covers/lighthouses.svg`
- Remove: `quartz/static/covers/soil.svg`
- Remove: `quartz/static/covers/typewriters.svg`

**Step 1: Find and download public domain images**

Search Wikimedia Commons, Biodiversity Heritage Library, Internet Archive, and Rawpixel public domain collections for vintage illustrations matching each post topic. Target: engravings, natural history plates, architectural drawings, nautical charts, diagrams. Each image should feel like an artifact from an old book or catalog.

| Post | Search terms | Image direction |
|------|-------------|-----------------|
| on-armadillos | "armadillo engraving", "dasypus illustration vintage" | Natural history plate |
| on-cathedrals | "gothic cathedral elevation drawing", "cathedral architectural plate" | Architectural elevation |
| on-soil | "soil cross section diagram vintage", "earth strata illustration" | Geological cross-section |
| on-clocks | "clock mechanism engraving", "horology plate" | Mechanical diagram |
| on-bridges | "bridge engineering drawing vintage", "bridge elevation engraving" | Engineering drawing |
| on-mycorrhizae | "fungi illustration vintage", "mycorrhiza botanical plate" | Botanical illustration |
| on-cartography | "antique map fragment", "old cartography illustration" | Map fragment |
| on-whittling | "woodworking tools engraving", "whittling knife illustration" | Tool catalog illustration |
| on-typewriters | "typewriter patent drawing", "typewriter vintage advertisement" | Patent/mechanical drawing |
| on-migration | "bird migration illustration", "arctic tern engraving" | Natural history plate |
| on-fermentation | "fermentation vessel engraving", "brewing illustration vintage" | Process illustration |
| on-lighthouses | "lighthouse engraving", "lighthouse architectural drawing" | Nautical/architectural |
| on-stone-walls | "dry stone wall illustration", "masonry engraving" | Construction illustration |
| on-tides | "tidal chart vintage", "ocean tides diagram" | Scientific diagram |

Download each as JPG. Crop to roughly 2:3 tall aspect ratio (like a book cover). Optimize to ~100-200KB. Save to `quartz/static/covers/` with slug-matching filename.

**Step 2: Remove old SVG placeholders**

```bash
rm quartz/static/covers/bridges.svg quartz/static/covers/cartography.svg quartz/static/covers/cathedrals.svg quartz/static/covers/fermentation.svg quartz/static/covers/lighthouses.svg quartz/static/covers/soil.svg quartz/static/covers/typewriters.svg
```

**Step 3: Commit**

```bash
git add quartz/static/covers/
git commit -m "art: replace SVG placeholders with public domain cover illustrations

Source vintage engravings and illustrations from public domain
collections for all 13 seed posts. Remove solid-color SVG placeholders."
```

---

### Task 2: Update seed post frontmatter

**Files:**
- Modify: all 13 files in `content/posts/on-*.md`

**Step 1: Update cover paths and add featured field**

For each of the 13 seed posts, update the `cover` frontmatter field to point to the new `.jpg` file, and add `featured: true` to 8 posts chosen for range.

Featured posts (chosen for topic diversity):
- `on-armadillos.md` — animals
- `on-cathedrals.md` — engineering/history
- `on-soil.md` — ecology
- `on-cartography.md` — history/craft
- `on-fermentation.md` — craft/systems
- `on-lighthouses.md` — engineering
- `on-migration.md` — animals/systems
- `on-typewriters.md` — craft/engineering

Example frontmatter change for a featured post (`on-armadillos.md`):
```yaml
# Before:
cover: /static/covers/armadillos.svg

# After:
cover: /static/covers/on-armadillos.jpg
featured: true
```

Example for a non-featured post (`on-clocks.md`):
```yaml
# Before (no cover field):
title: On Clocks

# After:
cover: /static/covers/on-clocks.jpg
# (no featured field — defaults to not shown on shelf)
```

Posts that previously had no `cover` field (on-clocks, on-mycorrhizae, on-whittling, on-migration, on-stone-walls, on-tides) get a new `cover` line added.

**Step 2: Commit**

```bash
git add content/posts/
git commit -m "content: update cover paths to JPG and mark featured posts

Update all 13 seed posts to reference new public domain JPG covers.
Mark 8 posts as featured for homepage shelf display."
```

---

### Task 3: Rewrite PostIndex.tsx as the Shelf

**Files:**
- Modify: `quartz/components/PostIndex.tsx`

**Step 1: Rewrite the component**

Replace the current chronological 3-post list with a visual bookshelf grid. The component:

- Filters `allFiles` to posts with `featured: true` frontmatter
- Falls back to latest 8 posts if no featured posts exist
- Renders a 3-column CSS grid (2-col on mobile) of cover images
- Each item: cover image (tall, ~2:3 ratio), title below, one-line description, status dot
- `See all writing →` link at bottom

Key implementation details:
- Read `featured` from `post.frontmatter?.featured`
- Read `cover` from `post.frontmatter?.cover`
- Read `description` from `post.frontmatter?.description` (hand-written annotation)
- Use `resolveRelative` for links (same as current)
- The grid uses `aspect-ratio: 2/3` on cover containers
- Cover images use `object-fit: cover` and `loading="lazy"`
- Keep the same "WRITING" monospace header style

CSS embedded in component (same pattern as current):
- `.post-shelf` container
- `.post-shelf-grid` — 3-column grid, gap 1.5rem, 2-col under 640px
- `.post-shelf-item` — link wrapping cover + text
- `.post-shelf-cover` — aspect-ratio 2/3, overflow hidden, border 1px solid var(--lightgray)
- `.post-shelf-cover img` — object-fit cover, width/height 100%
- `.post-shelf-title` — EB Garamond, 0.95rem
- `.post-shelf-desc` — EB Garamond italic, 0.82rem, color var(--darkgray), 1 line max
- `.post-shelf-dot` — same 5px status dot as current
- Hover: translateY(-3px), shadow increase on `.post-shelf-item`
- Dark mode: darken cover images slightly with opacity 0.9

**Step 2: Build and verify**

```bash
npx quartz build
```

Expected: builds successfully with 0 errors.

**Step 3: Commit**

```bash
git add quartz/components/PostIndex.tsx
git commit -m "feat: rewrite homepage post index as visual bookshelf

Replace the 3-post chronological list with a 3-column grid of
featured post covers. Each entry shows a public domain illustration
cover, title, one-line description, and status dot."
```

---

### Task 4: Rewrite Archive.tsx as the Catalog

**Files:**
- Modify: `quartz/components/Archive.tsx`

**Step 1: Rewrite the component**

Replace the card grid with a dense typographic catalog. The component:

- Keeps year-grouping logic (identical to current)
- Each entry becomes a horizontal row: small thumbnail left (~80-100px), text right
- Text block: title (linked), one-line description, date + tag pills
- Posts without covers: no thumbnail, text fills full width
- Excerpt sanitization: strip footnote markers before truncating

Key implementation details:

Excerpt sanitization — update `getExcerpt` function:
```tsx
const getExcerpt = (post: (typeof posts)[0]) => {
  const desc = post.frontmatter?.description as string | undefined
  if (desc) return desc.length > 140 ? desc.slice(0, 137) + "..." : desc
  let text = post.description ?? ""
  // Strip footnote reference markers (e.g. ".1 " or "[^1]")
  text = text.replace(/\[\^[\w-]+\]/g, "")
  text = text.replace(/\.(\d+)\s/g, ". ")
  text = text.replace(/\s+/g, " ").trim()
  if (text.length > 140) return text.slice(0, 137) + "..."
  return text
}
```

CSS embedded in component:
- `.archive` container with margin-top
- `.archive-header` — same monospace uppercase label style as current
- `.archive-year-section` — margin-bottom 2rem
- `.archive-year` — same monospace year label style
- `.archive-entry` — flex row, gap 1rem, padding 0.6rem 0, border-bottom 1px dotted var(--lightgray)
- `.archive-entry-thumb` — width 80px, flex-shrink 0, aspect-ratio 2/3, overflow hidden, border 1px solid var(--lightgray)
- `.archive-entry-thumb img` — object-fit cover, 100% width and height
- `.archive-entry-body` — flex 1, min-width 0
- `.archive-entry-title` — EB Garamond, 1rem, link styled, with status dot
- `.archive-entry-desc` — EB Garamond, 0.85rem, color var(--darkgray), single line, truncate with ellipsis
- `.archive-entry-meta` — flex row, monospace date + tag pills (same as current tag style)
- Hover: title shifts to var(--secondary), slight translateX(2px) like homepage list
- Mobile (under 640px): thumbnail shrinks to 60px or hides entirely

**Step 2: Build and verify**

```bash
npx quartz build
```

Expected: builds successfully.

**Step 3: Commit**

```bash
git add quartz/components/Archive.tsx
git commit -m "feat: rewrite archive as dense typographic catalog

Replace card grid with horizontal catalog entries. Each entry shows
a small cover thumbnail alongside title, description, date, and tags.
Fix footnote marker leak in auto-generated excerpts."
```

---

### Task 5: Add sway animation to WeatheredNote

**Files:**
- Modify: `quartz/components/WeatheredNote.tsx`

**Step 1: Add CSS keyframes and update styles**

Add a `note-sway` keyframes animation to the `.weathered-note` CSS. The animation:
- Oscillates rotation between approximately -1.2deg and -0.4deg
- 10-second cycle, ease-in-out
- Shadow shifts subtly with the rotation

```css
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
```

Update `.weathered-note`:
- Replace `transform: rotate(-0.8deg)` with `animation: note-sway 10s ease-in-out infinite`
- Keep the existing `:hover` override (which sets its own transform)

Update dark mode shadow values in the keyframes:
```css
[saved-theme="dark"] .weathered-note {
  animation: note-sway-dark 10s ease-in-out infinite;
}
```

Add `@media (prefers-reduced-motion: reduce)` that disables the animation and falls back to static `transform: rotate(-0.8deg)`.

Update the mobile media query to use a subtler version (smaller rotation range, e.g. -0.6deg to -0.2deg).

**Step 2: Verify hover still overrides sway**

The existing `:hover` rule sets `transform: rotate(-0.3deg) translateY(-2px)`. Ensure this still works — hover should pause/override the sway. May need `animation-play-state: paused` on hover.

**Step 3: Build and verify**

```bash
npx quartz build
```

**Step 4: Commit**

```bash
git add quartz/components/WeatheredNote.tsx
git commit -m "feat: add gentle sway animation to weathered note

The pinned note now rocks slowly between -1.1deg and -0.5deg over
a 10-second cycle, with shadow shifting to sell the 3D paper effect.
Pauses on hover. Respects prefers-reduced-motion."
```

---

### Task 6: Update custom.scss archive overrides

**Files:**
- Modify: `quartz/styles/custom.scss`

**Step 1: Verify archive overrides still apply**

The existing `body[data-slug="archive"]` rules in `custom.scss` (hide title, hide content-meta, collapse article, hide hr) should still work with the new catalog component. Verify no new overrides are needed.

The archive CSS that lived in the old `Archive.tsx` component (card grid styles) will be gone — replaced by the new catalog styles in the rewritten component. No `custom.scss` changes should be needed unless the new catalog layout conflicts with existing rules.

**Step 2: Build and verify visually**

```bash
npx quartz build --serve
```

Check in browser:
- Homepage: shelf grid with 8 covers, weathered note swaying
- Archive: catalog entries with thumbnails, year-grouped
- Garden: unchanged
- Article pages: unchanged
- Dark mode: both pages look good

**Step 3: Commit (if changes needed)**

```bash
git add quartz/styles/custom.scss
git commit -m "style: update archive page overrides for catalog layout"
```

---

### Task 7: Full build and visual verification

**Step 1: Clean build**

```bash
npx quartz build
```

Expected: no errors, all 18+ files processed.

**Step 2: Serve and verify each page**

```bash
npx quartz build --serve
```

Verify:
- [ ] Homepage: weathered note sways gently, 8 featured covers in 3-col grid, "See all writing →" link works
- [ ] Homepage dark mode: covers slightly dimmed, note sway works, shadows appropriate
- [ ] Homepage mobile (375px): 2-col grid, covers still visible, note smaller
- [ ] Archive: year-grouped catalog entries with thumbnails, all 14 posts listed
- [ ] Archive: entries without covers fill text full-width (verify by temporarily removing a cover)
- [ ] Archive: excerpts don't show footnote markers (check "On Armadillos")
- [ ] Archive dark mode: clean, readable
- [ ] SPA navigation: cursor trail persists, garden loads, transitions work
- [ ] Article pages: unchanged (drop cap, sidenotes, etc.)
- [ ] Garden: unchanged

**Step 3: Final commit if any fixes needed**

---

## Task Dependency Graph

```
Task 1 (covers) ──────┐
                       ├── Task 2 (frontmatter) ──┬── Task 3 (Shelf) ──┐
                       │                          │                    │
                       │                          └── Task 4 (Catalog)─┤
                       │                                               ├── Task 6 (CSS) ── Task 7 (verify)
Task 5 (sway) ────────────────────────────────────────────────────────┘
```

Tasks 1 and 5 are independent and can run in parallel. Tasks 3 and 4 can run in parallel after Task 2. Task 6 depends on 3+4. Task 7 is the final checkpoint.
