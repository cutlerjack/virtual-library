# Virtual Library Roadmap

## Vision
A calm, editorial library that makes reading the center of the experience. A unified, durable data model supports books + documents, with a world‑class reader, clean surfaces, and dependable offline storage.

## Milestones

### 1) Baseline audit (COMPLETED)
- [x] Map current data model (books, docs, reader state, notes/highlights)
- [x] Identify storage paths and duplication
- [x] List high‑risk areas and quick wins

**Audit notes (Jan 22, 2026)**\n
Current data/storage:\n
- Books: localStorage `virtual-library-books` (book objects + notes/quotes/reading logs)\n
- Shelves: localStorage `virtual-library-shelves`\n
- User data: localStorage `virtual-library-user`\n
- Documents: Tauri `Library/index.json` with `documents[]` (lastPage, lastLocation, progressPercent, notes/highlights)\n
- Spine library: localStorage `virtual-library-spine-library`\n
- Reader state is split between book data and document data (no unified model)\n
\n
High‑risk areas:\n
- `App.jsx` is a monolith (routing + data + UI) — brittle to scale\n
- Storage is split (localStorage vs `index.json`), no schema versioning/migrations\n
- Reader features are duplicated across PDF/EPUB with separate state\n
\n
Quick wins:\n
- Unify persistence behind a single data service\n
- Reduce top‑bar actions and hide advanced panels behind a Preferences drawer\n

### 2) Unified data model + migrations (COMPLETED)
- [x] Define `LibraryItem`, `ReadingState`, `Annotation` schema (versioned)
- [x] Build migration layer for existing localStorage + `index.json`
- [x] Create single persistence API (web + Tauri)

### 3) Architecture refactor (COMPLETED)
- [x] Split `App.jsx` into feature modules (Library + Reading Room views)
- [x] Create `store/` for central state + actions
- [x] Move data ops into `data/` services

### 4) Reader consolidation (PDF + EPUB) (COMPLETED)
- [x] Shared reader shell + controls
- [x] Unified annotations + progress
- [x] Focus mode + layout modes
- [x] Persist per‑document reader preferences (mode/layout/font size)
- [x] Performance fixes (render queue + adaptive scale + throttled scroll)

### 5) Library surface redesign (COMPLETED)
- [x] Simplify top bar actions
- [x] Introduce Continue Reading rail
- [x] Reduce panel stacking + visual noise (Insights toggle)

### 6) Reading Room redesign (COMPLETED)
- [x] Clean, clear import state + filters
- [x] Consistent visuals + search behavior

### 7) Polish + QA (COMPLETED)
- [x] Performance + caching (reader code-splitting, thumbnail caching)
- [x] Debounced persistence writes
- [x] Error handling + recovery
- [x] Regression checks (build passes)

### 8) Final verification (COMPLETED)
- [x] All 28 tests pass
- [x] Production build succeeds
- [x] App renders correctly (Library, Documents, navigation)
- [ ] Full end-to-end testing (import, read, annotate, resume, export) — requires Tauri desktop build
