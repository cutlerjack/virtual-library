# Virtual Library

Virtual Library is a desktop-first, local-first personal library cabinet for serious readers. The shelf is the primary navigation surface. Books, PDFs, EPUBs, and saved articles belong to one owned library, with local reading, annotations, study workflows, and backup/recovery built around that core.

## Current Product Shape

- `Library` is the shelf-first home route.
- `Reading Room` holds file-heavy workflows for PDFs, EPUBs, and articles.
- `Book Page` at `/book/:bookId` is the canonical book surface.
- `Insights` is secondary and should not compete with the shelf for the main experience.
- Tauri desktop is the real runtime. The web build exists as a degraded development shell.

## Stack

- React 18 + Vite 8
- React Router 7
- Tauri 1.x
- SQLite via `tauri-plugin-sql-api`
- PDF.js, EPUB.js, Tesseract.js
- Framer Motion, Recharts

## Key Paths

- [src/App.jsx](/Users/jack/projects/virtual-library/src/App.jsx): app shell, routing, top-level controllers
- [src/store/useLibraryStore.js](/Users/jack/projects/virtual-library/src/store/useLibraryStore.js): library state + persistence coordination
- [src/data/](/Users/jack/projects/virtual-library/src/data): schema, repositories, DB plumbing
- [src/features/library/LibraryView.jsx](/Users/jack/projects/virtual-library/src/features/library/LibraryView.jsx): shelf-first home surface
- [src/features/reading-room/ReadingRoomView.jsx](/Users/jack/projects/virtual-library/src/features/reading-room/ReadingRoomView.jsx): document vault surface
- [src/pages/BookPage.jsx](/Users/jack/projects/virtual-library/src/pages/BookPage.jsx): canonical book route
- [src-tauri/](/Users/jack/projects/virtual-library/src-tauri): desktop runtime config and native backup/restore commands

## Scripts

- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run test:desktop-e2e` (Linux CI only; launches the real Tauri app through WebDriver)
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Working Agreements

- Preserve the shelf as the product center.
- Prefer targeted repository writes over whole-library snapshot rewrites.
- Treat backup/restore, import, indexing, and recovery as trust-critical flows.
- Keep stats/ritual/scifi residue secondary and contained.
- Do not add AI or social/productized sharing work until the core product is stable.

## Trust-Critical Flows

- Desktop imports stage selected files under `.staging/imports`, process and sanitize the staged copy, then rename into `library/` only after extraction succeeds.
- Staging cleanup is routed through the native `remove_import_staging_file` command, which refuses paths outside the app-owned staging folder and rejects symlinked staging directories.
- Backup and snapshot export flush pending library writes and close the cached SQLite handle before invoking native archive creation.
- Active-library restore compares normalized and canonical paths before deciding whether to close the current SQLite handle, so trailing slashes and symlinked selections still take the safe path.
- Restore commits through native staging and preserves the previous target until validation has passed.
- The desktop filesystem allowlist is intentionally narrow; broad `fs-all` and shell-open capabilities are not part of the current runtime.

## Documentation Status

- [PRODUCT_DECISIONS.md](/Users/jack/projects/virtual-library/PRODUCT_DECISIONS.md) is the active product contract.
- [docs/desktop-hardening-runbook.md](/Users/jack/projects/virtual-library/docs/desktop-hardening-runbook.md) describes import, backup, restore, and verification behavior.
- [ROADMAP.md](/Users/jack/projects/virtual-library/ROADMAP.md), [AGENT_NOTES.md](/Users/jack/projects/virtual-library/AGENT_NOTES.md), and [PHASES_B_TO_E.md](/Users/jack/projects/virtual-library/PHASES_B_TO_E.md) are historical planning artifacts and should not be treated as the current source of truth.

## Desktop Smoke Coverage

- Playwright covers the degraded web shell.
- The desktop smoke harness is separate and Linux-only because upstream Tauri WebDriver automation is not available for local macOS runs.
- That harness launches the real Tauri window under an isolated temporary `HOME`, drives the real desktop import path through test-only dialog overrides, imports generated PDF and EPUB fixtures, opens article/PDF/EPUB readers, creates a snapshot, and verifies the snapshot file was written to the local library.
