# Reading Page & 3D Bookshelf — Design

## Overview

A new `/reading/` page featuring a 3D interactive bookshelf (inspired by adammaj.com/reading) and a categorized book list. Each book has a full review page at `/reading/[slug]/`.

## Architecture: Single-component with afterDOMLoaded

One `Bookshelf.tsx` Quartz component following the TagGarden/Archive pattern:
- Build-time HTML rendering with conditional display (only on `reading` index)
- Book data serialized as JSON in a `<script type="application/json">` element
- All interactivity (3D transforms, scroll, click-to-open) in an `afterDOMLoaded` script
- Review pages generated automatically by Quartz's ContentPage emitter

## Content Structure

```
content/
└── reading/
    ├── index.md              # Reading page (minimal, component renders)
    ├── antifragile.md        # Book review
    ├── a-brief-history-of-time.md
    └── ...

public/static/covers/books/   # Cover images
```

### Book Frontmatter

```yaml
---
title: "Antifragile"
author: "Nassim Taleb"
rating: 8
category: "systems"
cover: /static/covers/books/antifragile.jpg
spineColor: "#D35D2D"
textColor: "#FFF"
---

Review body in markdown.
```

- `rating`: 1-10, used for ordering within categories
- `category`: single string for grouping (e.g., "systems", "fiction", "history")
- `cover`: local path to cover image
- `spineColor` / `textColor`: manually extracted from cover art

## Page Layout

### 3D Bookshelf (top)

Horizontal scrollable shelf of book spines:
- Each book is a button containing a spine div + cover div
- Default: only spines visible (cover rotated to `rotateY(89deg)`)
- Click: spine swings open (`rotateY(-60deg)`), cover reveals (`rotateY(30deg)`)
- One book open at a time
- Left/right arrow buttons for scrolling (hover-to-scroll on desktop, touch on mobile)
- Auto-scroll to center opened book
- Paper texture via SVG `feTurbulence` filter overlay
- Page-edge gradient on cover left edge

### Book List (below divider)

Grouped by `category`, sorted by rating within each group:
- Category headers: uppercase, letter-spaced (matching site conventions)
- Each entry: cover thumbnail, title (link to review), author, rating, excerpt
- Thin dividers between entries

## 3D Interaction Details

Matches Adam Majmudar's Bookshelf.tsx behavior:

- **Spine dimensions:** ~42px wide, 220px tall
- **Open animation:** `transition: all 500ms ease` on all transforms
- **Spine open:** `rotateY(-60deg)` with `transform-origin: right`
- **Cover reveal:** `rotateY(89deg)` → `rotateY(30deg)` with `transform-origin: left`
- **Perspective:** `perspective: 1000px` on each book button
- **Paper texture:** shared SVG `<defs>` with `feTurbulence` + `feDiffuseLighting`, applied at 40% opacity
- **Page edges:** linear-gradient pseudo-element on cover left edge
- **Scroll:** interval-based (3px/10ms), arrow buttons show/hide at bounds
- **Deep-linking:** opening a book navigates to its review page; landing on a review auto-opens that book on shelf
- **URL sync:** click navigates via SPA to `/reading/[slug]`

## Theme & Accessibility

- Spine colors from frontmatter (work in both themes)
- Shelf background: transparent (topographic grain shows through)
- Arrow buttons, paper texture adapt via CSS custom properties
- `MutationObserver` on `saved-theme` for theme change refresh
- `prefers-reduced-motion`: disable open/close transitions, use instant state changes
- Print stylesheet: hide shelf, show book list only
- SPA cleanup via `window.addCleanup()`

## Files Changed

**New:**
- `quartz/components/Bookshelf.tsx`
- `content/reading/index.md`
- `public/static/covers/books/` (directory)

**Modified:**
- `quartz/components/index.ts` — export Bookshelf
- `quartz.layout.ts` — add Bookshelf to beforeBody
- `quartz/components/CustomHeader.tsx` — add "reading" nav link
- `quartz/styles/custom.scss` — shelf + book list styles

## Not Building (YAGNI)

- No search/filter on book list
- No "currently reading" / "to read" status
- No external API integration
- No visual star rating — just the number
