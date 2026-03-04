# Archive Page & Garden Rename — Design

## Goal

Add a card-based browsable archive page at `/archive` and rename the tags nav link to "garden," making the site easier to browse as content grows.

## Architecture

Two new primitives: an `Archive.tsx` Quartz component rendering year-grouped post cards, and a `content/archive.md` stub to trigger it. The homepage PostIndex gets capped to the latest 3 posts with a link to the full archive. Navigation gains an "archive" link and renames "tags" to "garden."

## Changes

### 1. Archive Page (`/archive`)

- **New component:** `quartz/components/Archive.tsx`
- **Trigger:** `content/archive.md` (minimal frontmatter stub)
- **Layout:** Year-grouped sections (2026, 2025, …), each containing a responsive card grid (2 columns desktop, 1 column mobile)
- **Card contents:**
  - Cover image at top if `cover` frontmatter field exists (omitted if absent — no placeholder)
  - Title in EB Garamond, linked, with inline status dot (amber=in-progress, green=finished)
  - Date in monospace ("Mar 2026") and tags as small pills
  - One-line excerpt from `description` frontmatter or first ~120 chars of content
- **Card hover:** Slight lift + faint shadow, matching existing site hover language
- **Card border:** Thin `var(--lightgray)` border
- **Page header:** Small monospace "ARCHIVE" label in the same style as homepage "WRITING"
- **No `<h1>` title** — hidden like the tags page

### 2. Navigation Updates (`CustomHeader.tsx`)

- Add "archive" link pointing to `/archive`
- Rename "tags" link text to "garden" (URL stays `/tags`)
- New nav order: `about · archive · garden · random`

### 3. Homepage PostIndex Cap

- Show only the latest 3 posts (currently shows all)
- Add "See all →" link at bottom pointing to `/archive`

### 4. Cover Image Convention

- Optional `cover` frontmatter field on posts: `cover: /static/covers/filename.jpg`
- Archive component renders the image if present, omits image area if absent
- No mandatory cover — graceful degradation

### 5. Seed Content (12-14 fake posts)

- Spread across 2024, 2025, 2026
- Varied tags: animals, evolution, engineering, history, philosophy, craft, systems
- Mix of `in-progress` and `finished` statuses
- Short content (1-2 paragraphs each)
- ~Half have `cover` fields pointing to placeholder SVGs

### 6. Placeholder Cover SVGs

- Generated solid-color SVG rectangles in `/static/covers/`
- Muted, earthy tones matching site palette (rusts, greens, navy, warm grays)
- Used by seed posts to test card layout with/without images

## Non-Goals

- No search/filter on the archive page (premature with <20 posts)
- No pagination (unnecessary at this scale)
- No changes to individual tag pages or TagGarden canvas
- No changes to the TagContent component
