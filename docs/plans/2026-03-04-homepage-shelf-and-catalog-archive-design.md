# Homepage Shelf & Catalog Archive — Design

**Date:** 2026-03-04
**Status:** Approved

## Problem

The homepage shows only 3 posts in a flat list — too sparse to convey the range or atmosphere of the site. The archive page uses a card grid with solid-color SVG placeholder covers that look like broken images and contradict the site's typographic, editorial identity. Neither page delivers on the original vision: "like stumbling into someone's study."

## Solution

Two complementary redesigns:

1. **Homepage — The Shelf:** A visual display of 6-8 curated posts as book covers in a grid, evoking a bookshelf or cabinet of curiosities. Public domain illustrations (engravings, natural history plates, architectural drawings) as cover art. Atmosphere and range at first glance.

2. **Archive — The Catalog:** A dense typographic index of every post, year-grouped, with small cover thumbnails alongside title + description + date + tags. Like a library catalog or Whole Earth Catalog entry listing. Complete and scannable.

## 1. Homepage: The Shelf

### Layout

- Weathered note at top (unchanged position, new sway animation)
- Below: 3-column grid of featured post covers (2 columns on mobile)
- Each entry: cover image in tall aspect ratio (~2:3, like a book), title below, one-line annotation below title, status dot
- `See all writing →` link at bottom, small monospace, linking to /archive

### Curation

- Posts selected via `featured: true` frontmatter field (not by recency)
- 6-8 posts chosen for range across topics — animals, engineering, ecology, craft, history, systems
- Order can be controlled by a `featured-order` field or by date within featured set

### Cover Images

- Public domain illustrations hand-picked per post from Biodiversity Heritage Library, Wikimedia Commons, Internet Archive, Flickr Commons
- Saved as `.jpg` in `quartz/static/covers/`
- Referenced via `cover: /static/covers/filename.jpg` frontmatter
- Tall aspect ratio crops (~2:3) to look like book covers standing on a shelf

### Hover

- Subtle lift (translateY -3px) and faint shadow increase
- Title color shifts to `var(--secondary)`
- Consistent with existing site hover language

### Mobile

- 2-column grid at 375px
- Smaller covers, same structure
- Touch targets are the full card area

### What It Replaces

- Current `PostIndex.tsx` component (3 chronological titles + "See all →")

## 2. Archive: The Catalog

### Layout

- Year-grouped sections (2026, 2025, 2024, ...)
- Each entry: horizontal row with small cover thumbnail (~80-100px, square or slightly tall) on the left, text block on the right
- Text block: title (EB Garamond, linked), one-line description, date (monospace) + tag pills
- Thin horizontal rules between entries
- Page header: small monospace "ARCHIVE" label

### Posts Without Covers

- No thumbnail rendered — text fills full width
- No placeholder or gap
- The entry looks like a pure text catalog listing

### Excerpt Sanitization

- Strip footnote reference syntax (`[^1]`, superscript numbers like `.1`) from auto-generated excerpts before truncating
- Current bug: "On Armadillos" shows `today.1 Few animals...` with leaked footnote markers

### What It Replaces

- Current `Archive.tsx` card grid with 2-column layout, rounded borders, and solid-color SVG covers

## 3. Weathered Note Sway Animation

### Animation

- Slow CSS animation: 8-12 second cycle
- Rotation oscillates between approximately -1.2deg and -0.4deg (currently static at -0.8deg)
- `ease-in-out` timing for natural pendulum feel

### Shadow

- Box-shadow shifts subtly with rotation to sell the 3D pinned-paper illusion
- Shadow offset and blur change slightly at animation keyframes

### Accessibility

- Entire animation disabled with `@media (prefers-reduced-motion: reduce)`
- Falls back to static rotation at -0.8deg (current behavior)

## 4. Cover Images

### Source

- Public domain art, hand-picked per post topic
- Vintage engravings, natural history illustrations, architectural plates, nautical charts, old diagrams
- Authentic artifacts, not AI-generated or stock

### Seed Post Covers (all 13)

| Post | Cover Direction |
|------|----------------|
| On Armadillos | Natural history engraving of an armadillo |
| On Cathedrals | Architectural plate or Gothic elevation drawing |
| On Soil | Cross-section diagram of earth/soil layers |
| On Clocks | Mechanical clock diagram or horological plate |
| On Bridges | Engineering drawing of a bridge |
| On Mycorrhizae | Botanical illustration of fungi or root systems |
| On Cartography | Fragment of an antique map |
| On Whittling | Woodworking tools illustration or woodcut |
| On Typewriters | Vintage typewriter advertisement or patent drawing |
| On Migration | Bird illustration or migration route map |
| On Fermentation | Botanical illustration of grain, grapes, or microbes |
| On Lighthouses | Nautical chart or lighthouse architectural drawing |
| On Stone Walls | Stone masonry illustration or dry-wall construction diagram |
| On Tides | Tidal chart or ocean diagram |

### File Convention

- Location: `quartz/static/covers/`
- Format: `.jpg`, optimized for web (~100-200KB each)
- Naming: matches post slug (e.g., `on-armadillos.jpg`)

### Cleanup

- Remove 7 existing solid-color SVG placeholders from `quartz/static/covers/`
- Update `cover` frontmatter fields in all 13 seed posts

## 5. Bug Fix: Excerpt Footnote Leak

The `getExcerpt` function in `Archive.tsx` (and any new excerpt logic) must strip footnote reference patterns before truncating. Patterns to strip:

- `[^N]` (markdown footnote references)
- Rendered superscript number artifacts in `post.description`

## Files Changed

| File | Change |
|------|--------|
| `PostIndex.tsx` | Rewrite: flat list → Shelf grid with covers |
| `Archive.tsx` | Rewrite: card grid → Catalog rows with thumbnails |
| `WeatheredNote.tsx` | Add sway animation + shadow keyframes |
| `custom.scss` | Update archive page overrides for new layout |
| `quartz/static/covers/*.svg` | Remove 7 SVG placeholders |
| `quartz/static/covers/*.jpg` | Add 13 public domain cover images |
| `content/posts/*.md` | Update `cover` fields, add `featured: true` to 6-8 posts |

## Non-Goals

- No search/filter on archive (premature at this scale)
- No pagination
- No changes to individual post pages, garden, about, or random
- No changes to TagGarden or tag pages
- Cover images are not required for future posts — both components degrade gracefully without them
