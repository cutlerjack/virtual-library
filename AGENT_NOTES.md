# Virtual Library - Agent Notes

> Archived historical notes. This file describes an earlier product direction and should not be treated as the current source of truth. See [README.md](/Users/jack/projects/virtual-library/README.md) and [PRODUCT_DECISIONS.md](/Users/jack/projects/virtual-library/PRODUCT_DECISIONS.md) for the active product contract.

## Context
- Project: `/Users/jack/projects/virtual-library`
- Goal: premium, photorealistic bookshelf UI with customizable spines, sci‑fi theme toggle, stats dashboard, and ritual/archivist flows.

## Major Features Added
- **3D Bookshelf visuals**: improved spines, textures, hover pull‑out, and alignment. Spine textures include leather, paper, newsprint, smooth.
- **Spine photos**: per‑book spine image support; photo spines override text and textures.
- **Spine Library** (local): ISBN‑indexed spine image library stored in localStorage; auto‑applies matching spines.
- **Spine Library panel** in Customize: browse, crop, remove, refresh.
- **Crop editor**: drag‑to‑crop + zoom; clamped offsets; saves crop to library and propagates to matching ISBN books.
- **Bulk Import correction**: “Change” button per result with alternate search + “Use” selection.
- **Export**: Customize → “Export books + notes” downloads JSON of books, ratings, notes, quotes, tags, shelves, etc.
- **Rating system**: now 0–10 (half‑stars). Migration doubles old ratings once and stores `ratingScale: 10` in user data.
- **Archivist Notes**: dismissible and persistent; dismissed IDs stored in localStorage.
- **Stats dashboard**: full‑screen ritual/quests/achievements; sci‑fi theme styling; artifacts export as SVG.

## New/Updated Components
- `src/components/SpineLibraryPanel.jsx` (new)
- `src/components/TodayPanel.jsx`
- `src/components/MemoryResurface.jsx`
- `src/components/RecommendationsPanel.jsx`
- `src/components/StatsDashboard.jsx`
- `src/components/BookSpine.jsx` (photo spines, crop vars, half‑star cover rating)
- `src/components/BookModal.jsx` (ISBN, spine image, apply/save to library)
- `src/components/AddBookModal.jsx` (ISBN field; bulk import correction UI)

## Storage + Utils
- `src/utils/storage.js`
  - Added spine library storage, ISBN normalize/convert, add/update/remove.
  - `ratingScale: 10` in `defaultUserData`.
- `src/utils/recommendations.js`
  - Updated for 10‑point ratings.

## Notable UX/Style Changes
- Custom scrollbars, hover lifts, and focus states.
- Sci‑fi theme overrides for dashboard/buttons/shelf.
- Spine photo CSS uses crop variables (`--spine-zoom`, `--spine-offset-x/y`).

## Key Behaviors
- **Auto‑apply spine**: when adding a book with ISBN, library spine auto‑applies.
- **Crop propagation**: saving a crop updates all matching ISBN books.
- **Dismissed Archivist Notes**: stored under `virtual-library-archivist-dismissed` in localStorage.

## Current To‑Do / Potential Follow‑Ups
- Optional: “Clear all Archivist Notes” button.
- Optional: CSV export in addition to JSON.
- Optional: spine library management improvements (bulk delete, search, tags).
