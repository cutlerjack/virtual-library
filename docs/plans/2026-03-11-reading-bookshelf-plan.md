# Reading Page & 3D Bookshelf — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/reading/` page with a 3D interactive bookshelf (matching adammaj.com/reading) and categorized book list, with individual review pages for each book.

**Architecture:** Single Quartz component (`Bookshelf.tsx`) with build-time HTML + `afterDOMLoaded` script for 3D interaction. Books are markdown files in `content/reading/` with frontmatter for metadata. Quartz's existing ContentPage emitter generates review pages automatically.

**Tech Stack:** Preact JSX (build-time), vanilla JS (afterDOMLoaded), SCSS, CSS 3D transforms, SVG filters

**Reference:** Adam Majmudar's Bookshelf component — https://github.com/adam-maj/adammaj.com/blob/main/components/Bookshelf.tsx

---

### Task 1: Content structure & sample book

**Files:**
- Create: `content/reading/index.md`
- Create: `content/reading/antifragile.md` (sample book)
- Create: `public/static/covers/books/` (directory)

**Step 1: Create the reading index page**

```markdown
// content/reading/index.md
---
title: Reading
---
```

**Step 2: Create a sample book review**

```markdown
// content/reading/antifragile.md
---
title: "Antifragile"
author: "Nassim Taleb"
rating: 8
category: "systems"
cover: /static/covers/books/antifragile.jpg
spineColor: "#D35D2D"
textColor: "#FFF"
---

In a world full of randomness and disorder, building things that benefit from volatility is the only way to ensure robustness. Taleb calls these things that gain from disorder _antifragile_.
```

**Step 3: Create the covers directory**

```bash
mkdir -p public/static/covers/books
```

You will need to manually add a cover image at `public/static/covers/books/antifragile.jpg`. For development, any ~300x450px image works.

**Step 4: Verify the sample book renders as a page**

```bash
npx quartz build 2>&1 | tail -5
```

Expected: Build succeeds. Check that `public/reading/antifragile/index.html` exists.

**Step 5: Commit**

```bash
git add content/reading/ public/static/covers/books/
git commit -m "content: add reading page structure and sample book"
```

---

### Task 2: Bookshelf component — build-time HTML

**Files:**
- Create: `quartz/components/Bookshelf.tsx`
- Modify: `quartz/components/index.ts`
- Modify: `quartz.layout.ts`

**Step 1: Create the Bookshelf component with build-time rendering**

Create `quartz/components/Bookshelf.tsx`. The component:
- Only renders when `fileData.slug` is `"reading"`, `"reading/"`, or `"reading/index"`
- Filters `allFiles` to find book files (slugs starting with `reading/` but not the index itself)
- Reads frontmatter: title, author, rating, category, cover, spineColor, textColor
- Extracts a text excerpt from each book's markdown body (first ~200 chars of `f.description` or plaintext)
- Groups books by `category`, sorts by rating descending within each group
- Renders:
  1. An SVG `<defs>` block with the paper texture filter (feTurbulence + feDiffuseLighting)
  2. The shelf container with left/right arrow buttons and a horizontal row of book buttons (each containing a spine div + cover div)
  3. A divider
  4. The categorized book list (cover thumbnail, title link, author, rating, excerpt)
  5. A `<script type="application/json" id="bookshelf-data">` with serialized book data for the afterDOMLoaded script

```tsx
import { resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface BookMeta {
  title: string
  author: string
  rating: number
  category: string
  cover: string
  spineColor: string
  textColor: string
  href: string
  slug: string
  excerpt: string
}

const Bookshelf: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const slug = fileData.slug ?? ""
  const isReadingIndex =
    slug === "reading" || slug === "reading/" || slug === "reading/index"
  if (!isReadingIndex) return null

  // Find all book files (in reading/ folder, not the index itself)
  const bookFiles = allFiles.filter((f) => {
    const s = f.slug ?? ""
    return s.startsWith("reading/") && s !== "reading/" && s !== "reading/index"
  })

  // Build book metadata
  const books: BookMeta[] = bookFiles
    .map((f) => {
      const fm = f.frontmatter ?? {}
      return {
        title: (fm.title as string) ?? "Untitled",
        author: (fm.author as string) ?? "",
        rating: (fm.rating as number) ?? 0,
        category: (fm.category as string) ?? "uncategorized",
        cover: (fm.cover as string) ?? "",
        spineColor: (fm.spineColor as string) ?? "#5a5a5a",
        textColor: (fm.textColor as string) ?? "#fff",
        href: resolveRelative(fileData.slug!, f.slug!),
        slug: f.slug!,
        excerpt: (f.description ?? "").slice(0, 200),
      }
    })
    .sort((a, b) => b.rating - a.rating)

  if (books.length === 0) return null

  // Group by category
  const categoryOrder: string[] = []
  const byCategory = new Map<string, BookMeta[]>()
  for (const book of books) {
    if (!byCategory.has(book.category)) {
      byCategory.set(book.category, [])
      categoryOrder.push(book.category)
    }
    byCategory.get(book.category)!.push(book)
  }

  return (
    <div class="bookshelf-wrap">
      {/* SVG paper texture filter */}
      <svg class="bookshelf-svg-defs" aria-hidden="true">
        <defs>
          <filter id="paper" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="8"
              result="noise"
            />
            <feDiffuseLighting
              in="noise"
              lightingColor="white"
              surfaceScale="1"
              result="diffLight"
            >
              <feDistantLight azimuth="45" elevation="35" />
            </feDiffuseLighting>
          </filter>
        </defs>
      </svg>

      {/* 3D Bookshelf */}
      <div class="bookshelf-container">
        <div class="bookshelf-arrow bookshelf-arrow-left" aria-label="Scroll left">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6L8 10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>
        <div class="bookshelf-viewport">
          <div class="bookshelf-track">
            {books.map((book) => (
              <button
                class="bookshelf-book"
                data-slug={book.slug}
                data-href={book.href}
              >
                <div
                  class="bookshelf-spine"
                  style={{
                    backgroundColor: book.spineColor,
                    color: book.textColor,
                  }}
                >
                  <span class="bookshelf-spine-texture" />
                  <span class="bookshelf-spine-title">{book.title}</span>
                </div>
                <div class="bookshelf-cover">
                  <span class="bookshelf-cover-texture" />
                  <span class="bookshelf-cover-edges" />
                  {book.cover && (
                    <img
                      src={book.cover}
                      alt={book.title}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div class="bookshelf-arrow bookshelf-arrow-right" aria-label="Scroll right">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>
      </div>

      {/* Book list grouped by category */}
      <hr class="bookshelf-divider" />
      <div class="bookshelf-list">
        {categoryOrder.map((cat) => (
          <div class="bookshelf-category">
            <h3 class="bookshelf-category-header">{cat}</h3>
            {byCategory.get(cat)!.map((book, i) => (
              <div class="bookshelf-entry">
                {i > 0 && <hr class="bookshelf-entry-rule" />}
                <a href={book.href} class="internal bookshelf-entry-link">
                  <div class="bookshelf-entry-cover">
                    {book.cover && (
                      <img
                        src={book.cover}
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div class="bookshelf-entry-meta">
                    <span class="bookshelf-entry-title">{book.title}</span>
                    <span class="bookshelf-entry-author">
                      {book.author} &middot; {book.rating}/10
                    </span>
                    {book.excerpt && (
                      <span class="bookshelf-entry-excerpt">{book.excerpt}</span>
                    )}
                  </div>
                </a>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Data for afterDOMLoaded script */}
      <script
        type="application/json"
        id="bookshelf-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(books) }}
      />
    </div>
  )
}

export default (() => Bookshelf) satisfies QuartzComponentConstructor
```

**Step 2: Register the component**

Modify `quartz/components/index.ts`:
- Add import: `import Bookshelf from "./Bookshelf"` (after line 38, with Archive/Frontispiece)
- Add to exports: `Bookshelf,` (after line 79, with Archive/Frontispiece)

**Step 3: Add to layout**

Modify `quartz.layout.ts` — add `Component.Bookshelf()` to `defaultContentPageLayout.beforeBody`, after `Component.Archive()` (line 28):

```typescript
Component.Archive(),
Component.Bookshelf(),
```

**Step 4: Verify build**

```bash
npx quartz build 2>&1 | tail -5
```

Expected: Build succeeds with no errors.

**Step 5: Commit**

```bash
git add quartz/components/Bookshelf.tsx quartz/components/index.ts quartz.layout.ts
git commit -m "feat: add Bookshelf component with build-time HTML rendering"
```

---

### Task 3: Exclude reading/ from PostIndex, Archive, and TagGarden filters

Books in `content/reading/` should not appear in the homepage shelf, archive catalogue, or tag garden.

**Files:**
- Modify: `quartz/components/PostIndex.tsx:14-21` (content filter)
- Modify: `quartz/components/Archive.tsx:9-16` (content filter)
- Modify: `quartz/components/TagGarden.tsx:15-24` (content filter)

**Step 1: Add reading/ exclusion to all three components**

In each file, find the `allFiles.filter` or `contentFiles` filter block and add:

```typescript
!slug.startsWith("reading/") &&
slug !== "reading" &&
```

PostIndex.tsx — after `!slug.startsWith("tags/") &&` (line 20), add:
```typescript
        !slug.startsWith("reading/") &&
```

Archive.tsx — after `!slug.startsWith("tags/") &&` (same pattern), add:
```typescript
        !slug.startsWith("reading/") &&
```

TagGarden.tsx — after `!slug.startsWith("tags/")` (line 22), add:
```typescript
      && !slug.startsWith("reading/")
```

**Step 2: Verify build**

```bash
npx quartz build 2>&1 | tail -5
```

Expected: Build succeeds. The sample book should not appear on homepage or archive.

**Step 3: Commit**

```bash
git add quartz/components/PostIndex.tsx quartz/components/Archive.tsx quartz/components/TagGarden.tsx
git commit -m "fix: exclude reading/ content from post index, archive, and tag garden"
```

---

### Task 4: Add "reading" to navigation

**Files:**
- Modify: `quartz/components/CustomHeader.tsx:19-24` (nav links)
- Modify: `quartz/components/CustomHeader.tsx:36-46` (coordinate map in afterDOMLoaded)

**Step 1: Add the nav link**

In `CustomHeader.tsx`, add to the `<nav class="site-nav">` block (after the "archive" link, line 21):

```tsx
<a href={`${baseDir}/reading`}>reading</a>
```

**Step 2: Add coordinate label**

In the `afterDOMLoaded` script's map object (around line 38), add:

```javascript
'reading': 'library',
```

And add a prefix match (after the tags line, around line 44):

```javascript
if (!label && slug.startsWith('reading')) label = 'library';
```

**Step 3: Add reading to the nav active-link matching**

The existing code at lines 50-63 already handles prefix matching generically, so `/reading/antifragile` will match the `reading` nav link. No changes needed here.

**Step 4: Verify build and dev server**

```bash
npx quartz build 2>&1 | tail -5
```

Start dev server and verify the "reading" link appears in the header and navigates to `/reading/`.

**Step 5: Commit**

```bash
git add quartz/components/CustomHeader.tsx
git commit -m "feat: add reading link to site navigation"
```

---

### Task 5: Bookshelf SCSS — shelf layout & 3D book styles

**Files:**
- Modify: `quartz/styles/custom.scss` (append new section)

**Step 1: Add bookshelf styles**

Append to `quartz/styles/custom.scss`. These styles cover:
- `.bookshelf-wrap` container
- `.bookshelf-svg-defs` hidden SVG
- `.bookshelf-container` with relative positioning for arrows
- `.bookshelf-viewport` with `overflow: hidden`
- `.bookshelf-track` as a flex row
- `.bookshelf-book` button reset, flex row, perspective, transition
- `.bookshelf-spine` with vertical text, paper texture overlay, transform-origin right
- `.bookshelf-cover` with transform-origin left, default `rotateY(89deg)`, page-edge gradient
- `.bookshelf-book.open .bookshelf-spine` → `rotateY(-60deg)`
- `.bookshelf-book.open .bookshelf-cover` → `rotateY(30deg)`
- `.bookshelf-book.open` width expansion
- Arrow button styles, hover states
- All transitions: `all 500ms ease` (matching Adam's timing)

```scss
/* ── Bookshelf (3D reading shelf) ── */

.bookshelf-svg-defs {
  position: absolute;
  inset: 0;
  visibility: hidden;
  width: 0;
  height: 0;
}

.bookshelf-wrap {
  margin-bottom: 2rem;
}

.bookshelf-container {
  position: relative;
  padding: 0 36px;
}

.bookshelf-viewport {
  overflow: hidden;
}

.bookshelf-track {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bookshelf-book {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  outline: none;
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  perspective: 1000px;
  -webkit-perspective: 1000px;
  gap: 0;
  transition: all 500ms ease;
  will-change: auto;
  width: 42px; /* spine only */
}

.bookshelf-book.open {
  width: 210px; /* spine + cover */
}

$shelf-spine-width: 42px;
$shelf-cover-width: 168px; /* spine * 4 */
$shelf-height: 220px;

.bookshelf-spine {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: $shelf-spine-width;
  height: $shelf-height;
  flex-shrink: 0;
  transform-origin: right;
  transform-style: preserve-3d;
  transform: rotateY(0deg);
  transition: all 500ms ease;
  will-change: auto;
  filter: brightness(0.8) contrast(2);
  position: relative;
  overflow: hidden;
}

.bookshelf-book.open .bookshelf-spine {
  transform: rotateY(-60deg);
}

.bookshelf-spine-texture {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.4;
  filter: url(#paper);
}

.bookshelf-spine-title {
  margin-top: 12px;
  font-family: "DM Sans", var(--font-body), sans-serif;
  font-size: 0.7rem;
  font-weight: 500;
  writing-mode: vertical-rl;
  user-select: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  max-height: calc(#{$shelf-height} - 24px);
  position: relative;
  z-index: 1;
}

.bookshelf-cover {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  transform-origin: left;
  transform-style: preserve-3d;
  transform: rotateY(88.8deg);
  transition: all 500ms ease;
  will-change: auto;
  filter: brightness(0.8) contrast(2);
  width: $shelf-cover-width;
  height: $shelf-height;
}

.bookshelf-book.open .bookshelf-cover {
  transform: rotateY(30deg);
}

.bookshelf-cover img {
  width: $shelf-cover-width;
  height: $shelf-height;
  object-fit: cover;
  display: block;
}

.bookshelf-cover-texture {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.4;
  filter: url(#paper);
}

.bookshelf-cover-edges {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 2px,
    rgba(255, 255, 255, 0.5) 3px,
    rgba(255, 255, 255, 0.25) 4px,
    rgba(255, 255, 255, 0.25) 6px,
    transparent 7px,
    transparent 9px,
    rgba(255, 255, 255, 0.25) 9px,
    transparent 12px
  );
}

/* Arrow buttons */
.bookshelf-arrow {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  cursor: pointer;
  color: var(--gray);
  border-radius: var(--radius-sm);
  z-index: 5;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.bookshelf-arrow:hover {
  background: color-mix(in srgb, var(--lightgray) 50%, transparent);
  color: var(--dark);
}

.bookshelf-arrow-left {
  left: 0;
}

.bookshelf-arrow-right {
  right: 0;
}

.bookshelf-arrow[data-hidden="true"] {
  display: none;
}

/* ── Bookshelf list (below shelf) ── */

.bookshelf-divider {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid var(--lightgray);
}

/* Override the article hr asterism for bookshelf divider */
.bookshelf-divider::after {
  content: none;
}

.bookshelf-category-header {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 2rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--lightgray);
}

.bookshelf-entry-rule {
  margin: 0;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--lightgray) 50%, transparent);
}

.bookshelf-entry-rule::after {
  content: none;
}

.bookshelf-entry-link {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1rem 0;
  text-decoration: none;
  color: inherit;
  transition: transform var(--duration-fast);
}

.bookshelf-entry-link:hover {
  transform: translateY(-0.5px);
}

.bookshelf-entry-cover {
  flex-shrink: 0;
  width: 80px;
}

.bookshelf-entry-cover img {
  width: 100%;
  height: auto;
  border: 1px solid var(--lightgray);
  border-radius: var(--radius-sm);
}

.bookshelf-entry-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
  min-width: 0;
}

.bookshelf-entry-title {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark);
}

.bookshelf-entry-author {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gray);
}

.bookshelf-entry-excerpt {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 640px) {
  .bookshelf-container {
    padding: 0 28px;
  }

  .bookshelf-entry-cover {
    width: 60px;
  }

  .bookshelf-entry-link {
    gap: 1rem;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .bookshelf-book,
  .bookshelf-spine,
  .bookshelf-cover {
    transition: none;
  }
}

/* Print */
@media print {
  .bookshelf-container,
  .bookshelf-svg-defs {
    display: none;
  }
}
```

**Step 2: Verify build and visual appearance**

```bash
npx quartz build 2>&1 | tail -5
```

Start dev server, navigate to `/reading/`, verify the shelf renders with at least the sample book spine visible. The 3D interaction won't work yet (that's the next task), but the static layout and styles should be visible.

**Step 3: Commit**

```bash
git add quartz/styles/custom.scss
git commit -m "style: add bookshelf shelf layout, 3D book transforms, and book list styles"
```

---

### Task 6: Bookshelf afterDOMLoaded — 3D interaction script

**Files:**
- Modify: `quartz/components/Bookshelf.tsx` (add afterDOMLoaded property)

**Step 1: Add the afterDOMLoaded script**

Add the `Bookshelf.afterDOMLoaded` property to `Bookshelf.tsx` (before the `export default` line). This is the core interaction script that handles:

1. **Scroll state** — `scrollX` variable, `boundedScroll()` and `boundedRelativeScroll()` helpers
2. **Arrow button scrolling** — mouseenter/touchstart starts interval (3px per 10ms), mouseleave/touchend clears it. Hide arrows at bounds.
3. **Click to open** — clicking a book toggles `.open` class, closes any previously open book, adjusts `scrollX` to center the opened book
4. **URL navigation** — opening a book navigates via `<a>` click or `history.pushState` to its review page
5. **Deep-linking** — on init, check `window.location.pathname` for a `/reading/[slug]` match, scroll to and open that book
6. **Transform application** — each book button's `transform: translateX(-${scrollX}px)` is applied inline, updated on scroll
7. **Viewport measurement** — calculate `booksInViewport` from container width / (spine width + gap)
8. **Theme observer** — MutationObserver on `document.documentElement` for `saved-theme` attribute changes (no color-dependent rendering in shelf, but useful for arrow hover styles)
9. **Cleanup** — `window.addCleanup()` to remove all listeners and intervals

Key values (matching Adam's Bookshelf.tsx):
- Spine width: 42px (41.5 rounded)
- Cover width: 168px (spine * 4)
- Book width open: 210px (spine * 5)
- Book height: 220px
- Scroll speed: 3px per 10ms interval
- All transitions: `500ms ease`
- Spine open: `rotateY(-60deg)`
- Cover closed: `rotateY(88.8deg)`, open: `rotateY(30deg)`

```javascript
document.addEventListener("nav", function() {
  var dataEl = document.getElementById("bookshelf-data");
  if (!dataEl) return;
  var viewport = document.querySelector(".bookshelf-viewport");
  if (!viewport) return;
  var track = document.querySelector(".bookshelf-track");
  if (!track) return;
  var arrowLeft = document.querySelector(".bookshelf-arrow-left");
  var arrowRight = document.querySelector(".bookshelf-arrow-right");
  if (!arrowLeft || !arrowRight) return;

  var books;
  try { books = JSON.parse(dataEl.textContent || "[]"); } catch(e) { return; }
  if (!books.length) return;

  var bookEls = track.querySelectorAll(".bookshelf-book");
  if (!bookEls.length) return;

  var SPINE_W = 42;
  var COVER_W = SPINE_W * 4;
  var BOOK_W_OPEN = SPINE_W * 5;
  var GAP = 4;
  var SCROLL_SPEED = 3;
  var SCROLL_INTERVAL = 10;

  var scrollX = 0;
  var openIndex = -1;
  var isScrolling = false;
  var scrollInterval = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getBooksInViewport() {
    return viewport.getBoundingClientRect().width / (SPINE_W + GAP);
  }

  function getMaxScroll() {
    var booksInView = getBooksInViewport();
    var extra = openIndex > -1 ? COVER_W : 0;
    return Math.max(0, (SPINE_W + GAP) * (books.length - booksInView) + extra + 5);
  }

  function clampScroll(val) {
    return Math.max(0, Math.min(getMaxScroll(), val));
  }

  function applyScroll() {
    for (var i = 0; i < bookEls.length; i++) {
      bookEls[i].style.transform = "translateX(-" + scrollX + "px)";
      bookEls[i].style.transition = isScrolling
        ? "transform 100ms linear"
        : "all 500ms ease";
      if (reducedMotion) bookEls[i].style.transition = "none";
    }
    arrowLeft.setAttribute("data-hidden", scrollX <= 0 ? "true" : "false");
    arrowRight.setAttribute("data-hidden", scrollX >= getMaxScroll() ? "true" : "false");
  }

  function openBook(index) {
    if (openIndex === index) {
      // Close
      bookEls[index].classList.remove("open");
      openIndex = -1;
    } else {
      // Close previous
      if (openIndex > -1) bookEls[openIndex].classList.remove("open");
      // Open new
      bookEls[index].classList.add("open");
      openIndex = index;
      // Center the opened book
      var booksInView = getBooksInViewport();
      scrollX = clampScroll((index - (booksInView - 4.5) / 2) * (SPINE_W + GAP));
    }
    applyScroll();
  }

  // Click handlers
  function onBookClick(e) {
    var btn = e.currentTarget;
    var idx = Array.prototype.indexOf.call(bookEls, btn);
    if (idx === -1) return;
    openBook(idx);

    // Navigate to book review page
    if (openIndex === idx) {
      var href = btn.getAttribute("data-href");
      if (href) {
        // Use SPA navigation if available
        var link = document.createElement("a");
        link.href = href;
        link.classList.add("internal");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  for (var i = 0; i < bookEls.length; i++) {
    bookEls[i].addEventListener("click", onBookClick);
  }

  // Arrow scroll — desktop: mouseenter/mouseleave, mobile: touchstart/touchend
  var isMobile = "ontouchstart" in window;
  var startEvt = isMobile ? "touchstart" : "mouseenter";
  var stopEvt = isMobile ? "touchend" : "mouseleave";

  function startScrollRight() {
    isScrolling = true;
    scrollInterval = setInterval(function() {
      scrollX = clampScroll(scrollX + SCROLL_SPEED);
      applyScroll();
    }, SCROLL_INTERVAL);
  }

  function startScrollLeft() {
    isScrolling = true;
    scrollInterval = setInterval(function() {
      scrollX = clampScroll(scrollX - SCROLL_SPEED);
      applyScroll();
    }, SCROLL_INTERVAL);
  }

  function stopScroll() {
    isScrolling = false;
    if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
    applyScroll();
  }

  arrowRight.addEventListener(startEvt, startScrollRight);
  arrowRight.addEventListener(stopEvt, stopScroll);
  arrowLeft.addEventListener(startEvt, startScrollLeft);
  arrowLeft.addEventListener(stopEvt, stopScroll);

  // Deep-linking: if current URL matches a book, open it
  var currentPath = window.location.pathname.replace(/\/$/, "");
  for (var j = 0; j < books.length; j++) {
    var bookPath = "/" + books[j].slug.replace(/\/$/, "");
    if (currentPath === bookPath || currentPath.endsWith(bookPath)) {
      openBook(j);
      break;
    }
  }

  // Resize handler
  function onResize() {
    scrollX = clampScroll(scrollX);
    applyScroll();
  }
  window.addEventListener("resize", onResize);

  // Initial state
  applyScroll();

  // Cleanup on SPA navigation
  if (window.addCleanup) {
    window.addCleanup(function() {
      for (var k = 0; k < bookEls.length; k++) {
        bookEls[k].removeEventListener("click", onBookClick);
      }
      arrowRight.removeEventListener(startEvt, startScrollRight);
      arrowRight.removeEventListener(stopEvt, stopScroll);
      arrowLeft.removeEventListener(startEvt, startScrollLeft);
      arrowLeft.removeEventListener(stopEvt, stopScroll);
      window.removeEventListener("resize", onResize);
      stopScroll();
    });
  }
});
```

**Step 2: Verify build**

```bash
npx quartz build 2>&1 | tail -5
```

**Step 3: Test in dev server**

Start dev server, navigate to `/reading/`. Verify:
- Book spine is visible with colored background and vertical title
- Clicking the spine opens the cover with 3D animation
- Clicking again closes it
- Arrow buttons scroll if there are enough books
- Paper texture is visible on spine

**Step 4: Commit**

```bash
git add quartz/components/Bookshelf.tsx
git commit -m "feat: add 3D bookshelf interaction — click-to-open, scroll, deep-linking"
```

---

### Task 7: Add more sample books for testing

**Files:**
- Create: 3-5 additional book markdown files in `content/reading/`

**Step 1: Create additional sample books**

Create several books across different categories to test the shelf scrolling, categorized list, and various spine colors. Each needs:
- Frontmatter with title, author, rating, category, cover, spineColor, textColor
- A short paragraph of review text

You will need cover images for each at `public/static/covers/books/`. For development, placeholder images work.

Suggested books (to test variety):
- `content/reading/a-brief-history-of-time.md` — category: "science", spineColor: "#1a1a2e"
- `content/reading/blood-meridian.md` — category: "fiction", spineColor: "#8B0000"
- `content/reading/thinking-in-systems.md` — category: "systems", spineColor: "#2d5016"
- `content/reading/the-structure-of-scientific-revolutions.md` — category: "science", spineColor: "#4a3728"
- `content/reading/invisible-cities.md` — category: "fiction", spineColor: "#c4a35a"

**Step 2: Verify the shelf with multiple books**

```bash
npx quartz build 2>&1 | tail -5
```

Start dev server. Verify:
- Multiple spines visible on shelf
- Arrow buttons appear when books overflow viewport
- Category grouping works in the list below
- Scrolling through books works smoothly

**Step 3: Commit**

```bash
git add content/reading/ public/static/covers/books/
git commit -m "content: add sample books for bookshelf testing"
```

---

### Task 8: Visual polish & dark mode

**Files:**
- Modify: `quartz/styles/custom.scss` (dark mode additions, responsive tweaks)

**Step 1: Add dark mode adjustments**

Add to `custom.scss` within the existing `[saved-theme="dark"]` block (or after the bookshelf styles):

```scss
[saved-theme="dark"] {
  .bookshelf-arrow:hover {
    background: color-mix(in srgb, var(--lightgray) 20%, transparent);
  }

  .bookshelf-entry-cover img {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .bookshelf-cover-edges {
    opacity: 0.5;
  }
}
```

**Step 2: Add responsive adjustments for tablet**

```scss
@media (max-width: 768px) {
  .bookshelf-container {
    padding: 0 28px;
  }

  .bookshelf-entry-cover {
    width: 70px;
  }
}
```

**Step 3: Verify at multiple viewports and themes**

Check in dev server:
- Desktop 1280px light + dark
- Tablet 768px light + dark
- Mobile 375px light + dark

**Step 4: Commit**

```bash
git add quartz/styles/custom.scss
git commit -m "style: bookshelf dark mode and responsive polish"
```

---

### Task 9: Final verification & cleanup

**Files:**
- Potentially modify any files if issues are found

**Step 1: Full build check**

```bash
npx quartz build 2>&1 | tail -5
```

Expected: Clean build, no errors.

**Step 2: Verify all pages still work**

Navigate to each page and check for regressions:
- Homepage — books should NOT appear in the post shelf
- Archive — books should NOT appear in the catalogue
- Tags/Garden — books should NOT appear
- Reading index — shelf + list renders correctly
- Individual book review pages — content renders with proper layout
- 404 page — still works

**Step 3: Verify SPA navigation**

- Navigate from homepage → reading → a book review → back to reading
- Verify cleanup works (no duplicate listeners, no stale state)
- Verify deep-linking: directly load `/reading/antifragile` and check the shelf opens that book

**Step 4: Commit any fixes**

If any issues are found, fix and commit with descriptive messages.

**Step 5: Final commit (if clean)**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "feat: complete reading page with 3D bookshelf"
```
