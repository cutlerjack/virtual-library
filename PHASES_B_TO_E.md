# Virtual Library: Phase B → E Roadmap

> Archived forward-looking roadmap from an earlier product phase. Some goals here have since shipped, moved, or been intentionally dropped. Do not use this as the current implementation guide.

**Baseline**: Phase A complete. React Router v7 + reading status + Open Library API + App.jsx decomposition are all done. BookPage exists at `/book/:bookId` but is read-only. There is a hover pull animation (CSS) but no click animation, no carousel, no Markdown notes, no Obsidian/Kindle integration, no semantic search, no CI.

---

## Phase B: Shelf Animation + Carousel + Book Page Polish

**Goal**: The book-browsing experience should feel alive and intentional. Clicking a book is a gesture — it should feel like you're pulling it from the shelf. The library surface should have horizontal rails for quick access to active/recent books. The book detail page should be editable and visually excellent.

### B1 — Pull-from-shelf click animation

**Current state**: Hover fires a CSS 3D tilt (`translateZ(26px) rotateY(-10deg)`) via `is-hovered` class. Click fires `onClick` immediately with no animation.

**Goal**: Clicking a book spine triggers a more dramatic pull-forward animation, then navigates. Feels like you physically removed the book from the shelf.

**Implementation**:

`BookSpine.jsx` — Add a `clicked` state:
```jsx
const [clicked, setClicked] = useState(false)

const handleClick = () => {
  setClicked(true)
  // onTransitionEnd fires onClick (navigate/open)
}
```

New CSS class `.book-scene.is-clicked`:
```css
.book-scene.is-clicked {
  transform: translateZ(80px) translateX(24px) rotateY(-18deg) scale(1.08);
  transition: 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); /* springy overshoot */
}
```

Use `onTransitionEnd` to call the parent `onClick` after the pull animation completes (~250ms). Reset `clicked` state after navigation.

**Files modified**: `BookSpine.jsx`, `src/index.css`

---

### B2 — Horizontal carousel rails

**Goal**: Two horizontal scroll rails appear above the main bookshelf: "Continue Reading" and "Recently Added." Each shows book covers (front-face), truncated title/author, and scrolls horizontally. Clicking opens the book page.

**Current state**: Nothing. LibraryView uses vertical Bookshelf rows only.

**New component**: `src/components/BookCarousel.jsx`
```jsx
// Props: title, books, onBookClick
// Renders: section header + horizontal scroll strip of BookCoverCard items
```

**New component**: `src/components/BookCoverCard.jsx`
A front-facing card (not 3D spine). Shows:
- Cover image (or colored placeholder with title initials)
- Title (2-line clamp)
- Author (1-line, muted)
- Status badge (optional — "Reading" pill)
- Subtle hover scale (`scale(1.04)`) + shadow lift

**Data sources** (via selectors):
- "Continue Reading": books with `status === 'reading'`, sorted by `lastTouched` desc, limit 8. (Extend existing `selectContinueReadingDocs` or add a new `selectContinueReadingBooks`.)
- "Recently Added": books sorted by `addedAt` desc, limit 10

**LibraryView.jsx changes**: Render the two carousels above the `<Bookshelf>` component, beneath the Insights banner. Conditionally hide "Continue Reading" rail if no in-progress books.

**Styling**: Horizontal scroll with `overflow-x: auto`, `scroll-snap-type: x mandatory`, `scroll-behavior: smooth`. Hide scrollbar on desktop. Cards are `scroll-snap-align: start`.

**Files created**: `BookCarousel.jsx`, `BookCoverCard.jsx`
**Files modified**: `LibraryView.jsx`, `librarySelectors.js`, `src/index.css`

---

### B3 — Book page redesign + inline editing

**Current state**: `BookPage.jsx` is read-only. No inline editing. No related books. Plain layout.

**Goal**: BookPage becomes the primary interaction surface for a book. Inline editing, better visual design, and a "You might also like" section.

**Visual design**:
- **Hero section**: Full-width banner with book cover on the left (large, drop shadow), title/author/metadata on the right. Background: linear gradient from `spineColor` → page background.
- **Metadata row**: Status badge, rating stars, page count, publish year, ISBN — all inline.
- **Reading progress**: Full-width progress bar (if pagesRead set).
- **Content sections**: Tabbed or accordion — Notes, Quotes, Reflections, Memories, Reading Log.

**Inline editing**:
- Title, author, notes: click-to-edit (input swap on click)
- Status: clickable badge cycles through statuses
- Rating: StarRating already supports `onChange`
- Tags, shelves: add/remove chips inline
- All edits call `onUpdate` immediately (autosave pattern — no save button)
- "Edit details" button at top right opens BookModal for fields not inline-editable (cover, ISBN, dates, spine)

**Related books section** (below content):
- "More by [Author]": other books in library by same author
- "In the same genre": books sharing the most common tag
- Both sections use `BookCoverCard` (reusing B2 component) in a small horizontal strip
- Hidden if no related books exist

**Files modified**: `BookPage.jsx`, `src/index.css`

---

### B — Verification

1. `npm test` — all tests pass
2. `npm run build` — succeeds
3. Click a book spine → pull animation fires → book page opens
4. Library shows Continue Reading + Recently Added carousels
5. Book page has hero, inline editing, related books

**PR scope**: B1–B3 as one PR — "Phase B: Shelf animation, carousels, book page redesign"

---

## Phase C: Markdown Notes + Passage Linking + Obsidian Export + Kindle Import

**Goal**: The notes system becomes genuinely useful for serious readers. Notes support Markdown. Quotes carry page references. Export to Obsidian. Import Kindle highlights.

### C1 — Markdown notes editor

**Current state**: `book.notes` is a plain string in a `<textarea>`.

**Goal**: Split-pane Markdown editor — raw input on left, rendered preview on right. Togglable (Edit | Preview | Split). Mobile defaults to full-screen edit.

**Implementation**: Custom lightweight approach using `marked` (~5KB gzipped) rather than a heavy editor package.

**New component**: `src/components/MarkdownEditor.jsx`
```jsx
// Props: value, onChange, placeholder
// State: mode ('edit' | 'preview' | 'split')
// Renders: toolbar (mode toggle, bold/italic/list helpers), editor pane, preview pane
```

**New utility**: `src/utils/markdown.js` — thin wrapper around `marked` with safe HTML rendering options.

**Data model**: No change. `notes` stays a plain string (Markdown is plain text; backwards-compatible).

**Files created**: `MarkdownEditor.jsx`, `src/utils/markdown.js`
**Files modified**: BookModal notes tab, `BookPage.jsx`, `package.json` (add `marked`)

---

### C2 — Passage linking on quotes

**Current state**: `quotes: [{ text, createdAt }]` — no location info.

**Goal**: Each quote optionally carries a page number or location. Stored as `{ text, page, createdAt }`. Displayed as "p. 47" badge.

**Schema change**: Backwards-compatible — `page` is optional. Existing quotes without `page` render with no badge.

**QuotesTab.jsx changes**:
- Add a small optional "Page #" input next to the textarea
- Display `p. {page}` badge in the rendered quote list when page is set

**Files modified**: `QuotesTab.jsx`, `BookPage.jsx`, `documentUtils.js`

---

### C3 — Obsidian export

**Goal**: Export books as Obsidian-compatible `.md` files with YAML frontmatter, notes, quotes, reflections, and memories. Delivered as a `.zip`.

**Output format per book**:
```markdown
---
title: "The Name of the Wind"
author: "Patrick Rothfuss"
isbn: "978-0756404741"
status: read
rating: 9
tags: [fantasy, adventure]
shelves: [favorites]
dateStarted: 2024-03-01
dateFinished: 2024-05-15
pageCount: 662
---

## Notes

[book.notes content]

## Quotes

> "Words are pale shadows of forgotten names."
> — p. 47

## Reflections

**2024-05-15**: This book changed how I think about unreliable narrators.

## Memories

### Finished on the train to Portland
*2024-05-15*
The moment I closed the last page...
```

**New utility**: `src/utils/obsidianExport.js`
- `bookToObsidianMarkdown(book)` → string
- `exportLibraryToObsidian(books)` → Map<filename, content>

**UI entry point**: PreferencesPanel "Export" section → "Export to Obsidian (ZIP)" button.

**Files created**: `src/utils/obsidianExport.js`, `src/utils/__tests__/obsidianExport.test.js`
**Files modified**: `PreferencesPanel.jsx`, `package.json` (add `jszip` ~25KB gzipped)

---

### C4 — Kindle highlights import

**Goal**: Parse `My Clippings.txt` from Kindle and import highlighted passages as quotes (with location) into matching library books.

**Format of `My Clippings.txt`**:
```
The Name of the Wind (Patrick Rothfuss)
- Your Highlight on Location 847-849 | Added on Sunday, March 3, 2024 8:14 PM

Words are pale shadows of forgotten names.
==========
```

**New utility**: `src/utils/kindleImport.js`
- `parseKindleClippings(text)` → `[{ bookTitle, author, location, text, date }]`
- `matchClippingsToLibrary(clippings, books)` → `Map<bookId, clipping[]>` (fuzzy match by title)

**New component**: `src/components/add-book/KindleImportMode.jsx`

**Import flow**:
1. Upload `My Clippings.txt` via file picker
2. Parse + fuzzy-match to library books (show match count per book)
3. Review screen: table of clips per book with checkboxes
4. "Import N quotes" — fires `addQuote` for each selected clip
5. Summary: "Imported 47 quotes across 12 books"

**Files created**: `KindleImportMode.jsx`, `src/utils/kindleImport.js`, `src/utils/__tests__/kindleImport.test.js`
**Files modified**: `AddBookModal.jsx` (add "Kindle" tab)

---

### C — Verification

1. `npm test` — all tests pass (including obsidianExport and kindleImport tests)
2. `npm run build` — succeeds
3. Notes tab has Markdown editor with live preview
4. Quotes show page number badge
5. Obsidian ZIP exports valid `.md` files
6. Kindle import parses and matches highlights correctly

**PR scope**:
- PR1: Markdown editor + passage linking (C1–C2)
- PR2: Obsidian export + Kindle import (C3–C4)

---

## Phase D: Semantic Search + AI Recommendations

**Goal**: Make the library searchable by meaning. Get recommendations that understand taste. Both features degrade gracefully (rule-based fallback when no API key configured).

### D1 — Semantic search via Claude API

**Current state**: FTS5 full-text (desktop) or substring match (web). Searches literal terms only.

**Goal**: Natural language queries. "Books about complicated families" returns relevant books even if that phrase doesn't appear literally in any note.

**Architecture**: Use Claude API (claude-haiku-4-5 for cost efficiency) rather than local embeddings. No WASM bundle, no embedding storage, better semantic reasoning, simpler maintenance.

**New utility**: `src/utils/semanticSearch.js`
```js
export async function semanticSearch(query, books, apiKey) {
  const bookSummaries = books.map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    tags: b.tags,
    notes: b.notes?.slice(0, 500),
    quotes: (b.quotes || []).slice(0, 3).map(q => q.text || q),
  }))

  // Sends query + book summaries to Claude
  // Returns: [{ id, relevance: 1-10, reason: string }]
}
```

**UI integration**: `GlobalSearch.jsx` — "Semantic" toggle button. When enabled, calls `semanticSearch()`. Shows "Searching with AI..." loading state. Results display Claude's `reason` as a tooltip/badge.

**API key storage**: PreferencesPanel → "AI Features" section → Anthropic API key input (stored in localStorage). No key = features hidden.

**Cost control**: Cache results in sessionStorage per query. Show cost estimate. Rate-limit to 10 semantic searches per minute.

**Files created**: `src/utils/semanticSearch.js`, `src/utils/__tests__/semanticSearch.test.js` (mocked API)
**Files modified**: `GlobalSearch.jsx`, `PreferencesPanel.jsx`

---

### D2 — AI recommendations via Claude

**Current state**: `recommendations.js` is rule-based (top-3 genres by frequency + favorite authors). Returns 3 generic suggestions.

**Goal**: Personalized recommendations that explain reasoning based on reading history, ratings, and notes. Feel like a knowledgeable friend who's read your library.

**Hybrid approach**: Rule-based stays as fallback. When API key configured, call Claude.

**Changes to `recommendations.js`**:
```js
export async function getAIRecommendations(books, apiKey) {
  const loved = books.filter(b => b.status === 'read' && b.rating >= 8)
  // Build profile: loved books, genres, recent reads
  // Call Claude with prompt: "Recommend 5 books for this reader with personalized reasoning"
  // Returns: [{ title, author, reason }]
}
```

**RecommendationsPanel.jsx changes**:
- "Get AI Picks" button (shown only when API key configured)
- Skeleton loading state while fetching
- Each recommendation shows cover (via `useBookSearch`), title, author, Claude's reasoning in a styled callout
- "Add to Library" button per recommendation
- Cache in `user.aiRecommendations: { results[], generatedAt }` with "Refresh" link showing age

**Files modified**: `recommendations.js`, `RecommendationsPanel.jsx`

---

### D — Verification

1. `npm test` — all tests pass (API calls mocked)
2. `npm run build` — succeeds
3. Without API key: AI features are hidden, app works normally
4. With API key: semantic search returns meaningful results; AI recs explain reasoning

**PR scope**: One PR — "Phase D: Semantic search + AI recommendations (optional API key)"

---

## Phase E: Public Bookshelf + Virtualization + Polish + CI

**Goal**: Production-grade quality. Handles 1000+ books without lag. Accessible and keyboard-navigable. CI pipeline. Optional public sharing.

### E1 — List virtualization

**Current state**: `Bookshelf.jsx` renders all shelf rows. `ReadingRoomView` renders all documents in a flat list.

**Goal**: Only render visible items. Library with 500 books should have ~30 DOM nodes, not 500.

**Implementation**: `@tanstack/react-virtual` (~5KB gzipped).

For `Bookshelf.jsx` (shelf rows): Row virtualizer. Each "item" is one shelf row (~10 books, ~220px tall). 500 books = ~50 rows → renders ~8 at a time.

For `ReadingRoomView` (document list): Window virtualizer. Each document row is ~72px. 200 docs → renders ~12.

**Files modified**: `Bookshelf.jsx`, `ReadingRoomView.jsx`, `package.json`

---

### E2 — Keyboard navigation

**Goal**: Full keyboard access to the library.

**Shortcuts**:
- `/` — focus search
- `Escape` — close modal / clear search
- `Arrow keys` — move focus between books (←→ within row, ↑↓ between rows)
- `Enter` — open focused book's detail page
- `E` — open BookModal for focused book
- `N` — jump to next unread book (first `to-read`)
- `?` — show shortcuts help overlay

**New hook**: `src/hooks/useKeyboardNav.js` — manages focused book index, handles arrow key events.
**New component**: `KeyboardShortcutsHelp.jsx` — modal listing all shortcuts.
**BookSpine.jsx**: Accept a `focused` prop that adds a visible focus ring.

**Files created**: `src/hooks/useKeyboardNav.js`, `KeyboardShortcutsHelp.jsx`
**Files modified**: `LibraryView.jsx`, `BookSpine.jsx`, `App.jsx`

---

### E3 — Public bookshelf export

**Goal**: Generate a shareable, self-contained HTML page of your read books. Can be hosted anywhere.

**New utility**: `src/utils/publicShelfExport.js`
- `buildPublicShelfHtml(books, user)` → HTML string
- Filters to `status === 'read'` books (or user-selected)
- Inline CSS — clean two-column cover grid (adammaj.com-inspired)
- Cover images inlined as base64 (optional, for full offline)
- Shows: cover, title, author, rating, tags, optional notes excerpt

**UI**: PreferencesPanel → "Share" section → "Export Public Bookshelf (HTML)" downloads `my-bookshelf.html`.

**Files created**: `src/utils/publicShelfExport.js`, `src/utils/__tests__/publicShelfExport.test.js`
**Files modified**: `PreferencesPanel.jsx`

---

### E4 — Accessibility audit

**Goal**: WCAG 2.1 AA compliance for all primary flows.

**Changes needed**:
- `aria-label` on all icon-only buttons (×, +, search icon, etc.)
- `role="dialog"` + `aria-labelledby` on all modals
- `role="list"` / `role="listitem"` on book shelves
- Focus trap inside open modals (Tab cycles within modal only)
- Verify color contrast ratios (muted text on page background — needs 4.5:1 for AA)
- `prefers-reduced-motion` check on BookSpine transitions
- Visible focus rings on all interactive elements

**Files modified**: `BookSpine.jsx`, `BookModal.jsx`, `AddBookModal.jsx`, `src/index.css` (and others as needed)

---

### E5 — CI pipeline

**Goal**: Every PR runs automated checks.

**New file**: `.github/workflows/ci.yml`
```yaml
name: CI
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --run
      - run: npm run build

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
```

**ESLint setup**: `eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`. Add `"lint": "eslint src"` to package.json scripts.

**Files created**: `.github/workflows/ci.yml`, `eslint.config.js`
**Files modified**: `package.json`

---

### E — Verification

1. `npm test` — all tests pass (~150+ total)
2. `npm run build` — succeeds
3. `npm run lint` — zero errors
4. Preview at 300+ books — smooth 60fps scroll, ~30 DOM nodes in DevTools
5. Keyboard nav works end-to-end
6. Public bookshelf HTML exports and opens offline
7. CI runs green on first PR

**PR scope**:
- PR1: Virtualization + keyboard nav (E1–E2)
- PR2: Public export + accessibility + CI (E3–E5)

---

## Summary Table

| Phase | Key Deliverables | New Files | New Dependencies |
|-------|-----------------|-----------|-----------------|
| B | Click animation, carousels, book page hero + inline editing | `BookCarousel`, `BookCoverCard` | — |
| C | Markdown editor, page-linked quotes, Obsidian export, Kindle import | `MarkdownEditor`, `KindleImportMode`, `obsidianExport`, `kindleImport` | `marked`, `jszip` |
| D | Semantic search (Claude), AI recommendations | `semanticSearch` | `@anthropic-ai/sdk` |
| E | Virtualization, keyboard nav, public export, a11y, CI | `useKeyboardNav`, `KeyboardShortcutsHelp`, `publicShelfExport`, `ci.yml` | `@tanstack/react-virtual`, ESLint |

**Total new runtime bundle additions**: ~50KB gzipped (C + D + E1 combined).

## Sequencing Notes

- **B before C**: The improved book page surface (B3) is where Markdown notes (C1) will live — better to polish the canvas first.
- **C before D**: Kindle import + Markdown notes populate the library with richer content, making semantic search and AI recommendations meaningfully better.
- **D is opt-in**: Both AI features require an Anthropic API key. The app is fully functional without Phase D — it's an enhancement layer, not core infrastructure.
- **E last**: Virtualization isn't urgent until the library grows large. CI is most valuable after the test suite is stable (post-C). Accessibility audit makes most sense after UI is finalized.
- **Each phase ships independently**: Every phase can be reviewed as its own PR and deployed without the next phase.
