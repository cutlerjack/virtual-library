# Product Quality Uplift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Virtual Library feel trustworthy, usable, and desktop-grade by fixing interaction correctness, aligning data semantics, restoring regression coverage, and simplifying the core reading workflow.

**Architecture:** Stabilize shared primitives before polishing feature screens. The modal system, stats aggregation, and test harnesses are cross-cutting surfaces, so they should be fixed first and then protected with browser-level coverage. Product polish should build on the existing Library, Reading Room, Book Page, and Insights routes rather than adding new top-level concepts.

**Tech Stack:** React 18, Vite, Tauri v1, Framer Motion, Vitest, Testing Library/JSDOM, Playwright, WebDriverIO/Tauri driver, local storage/web fallback, Tauri SQL-backed desktop storage.

---

## QA Findings This Plan Responds To

- In Safari/WebKit, Quick Add was exposed to accessibility but did not visibly render as a usable modal. Quick Add and Preferences also remained as ghost dialogs in the accessibility tree after closing or submitting.
- Insights reported `Pages read: 200` after only `10` pages had been logged for a 200-page book. The same screen exposed conflicting signals such as `10 pages recorded` and `0` yearly pages.
- `npm run test:e2e` failed all 5 tests because selectors and copy are stale relative to the current UI.
- The zero-rating state is accessible as `No rating`, but visually looks like a row of filled stars.
- The web shell had several usable flows, but the Tauri desktop app did not become controllable through Computer Use after `npm run tauri dev`, so desktop launchability and desktop-only flows need a dedicated verification path.

## Product Bar

The product should feel like a calm, reliable desktop library for someone who wants to collect books, read documents, capture notes, and revisit ideas. The app should optimize for:

- Trust: visible UI must match accessible UI, and stats must mean exactly what their labels say.
- Low-friction capture: adding a book, logging pages, saving a quote, and returning to the shelf should be obvious and fast.
- Desktop honesty: web-only limitations should be clear, while desktop builds should make file import, backup, restore, and reading feel first-class.
- Retrieval value: notes, quotes, reflections, and memories should be easy to rediscover from the shelf, book page, and Insights.
- Regression confidence: a broken modal, stale selector, or incorrect stat should fail a test before it reaches manual QA.

## File Map

- `src/components/DialogShell.jsx`: shared modal shell for Add, Preferences, Confirm, Book Details, and Exhibit dialogs.
- `src/components/useOverlayFocusTrap.js`: focus trap, Escape handling, scroll lock, and focus restoration.
- `src/components/AddBookModal.jsx`: search, manual, bulk, article, and migration add flow.
- `src/components/PreferencesPanel.jsx`: preferences modal and appearance/maintenance controls.
- `src/components/StarRating.jsx`: rating visual state and keyboard/a11y behavior.
- `src/components/StatsDashboard.jsx`: Insights metric presentation, goals, quests, exports, and charts.
- `src/utils/statsAggregation.js`: canonical stats computation.
- `src/store/libraryActions.js`: page logging, quote/reflection/memory actions, and activity updates.
- `src/store/__tests__/libraryActions.test.js`: action-level unit coverage.
- `src/utils/__tests__/statsAggregation.test.js`: stats semantic coverage.
- `src/features/__tests__/surfaceSmoke.test.jsx`: component-level smoke coverage for key surfaces.
- `e2e/app-smoke.spec.js`: user-level browser smoke tests.
- `playwright.config.js`: browser projects and e2e server configuration.
- `scripts/desktop-smoke.mjs`: desktop harness for Tauri-only behavior.
- `src-tauri/tauri.conf.json` and `src-tauri/src/*`: desktop runtime configuration and native commands.
- `src/styles/*.css` and `src/index.css`: visual system, layout, modal, route, and component polish.

## Phase 1: Restore Trust And Test Coverage

### Task 1: Repair E2E Smoke Tests Around Current UI

**Files:**
- Modify: `playwright.config.js`
- Modify: `e2e/app-smoke.spec.js`
- Test: `npm run test:e2e`

- [ ] Add named Playwright projects for Chromium and WebKit so modal behavior is covered in the WebKit engine that is closest to Tauri on macOS.

Expected config shape:

```js
projects: [
  { name: 'chromium', use: { browserName: 'chromium' } },
  { name: 'webkit', use: { browserName: 'webkit' } },
],
```

- [ ] Replace stale `Add to Library` header selectors with the current accessible control. Prefer `page.getByRole('button', { name: /add a book|quick add/i })` so the test is tied to the current aria-label and visible text.
- [ ] Replace stale empty-state assertions. The current empty library heading is `Build the shelf from here`, not `Your library awaits`.
- [ ] Replace stale Insights copy assertions with stable route signals: heading `A private reading room for notes, patterns, and recommendations.` and visible `Reading Ledger`.
- [ ] Fix the maintenance route strict-mode failure by scoping `Desktop Only` to the hero/status element or asserting the exact count intentionally.
- [ ] Add a regression that opens Quick Add, checks the modal is visible, presses Escape, and asserts there are no dialogs or `[aria-modal="true"]` nodes left.
- [ ] Add the same Quick Add open/close test under the WebKit project.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:e2e -- --project=chromium`.
- [ ] Run `npm run test:e2e -- --project=webkit`.

**Acceptance criteria:**
- Chromium and WebKit e2e projects pass locally.
- The failed selectors from the Computer Use run are gone.
- The test suite would catch the ghost-dialog and invisible-dialog regressions if they reappear in browser automation.

### Task 2: Fix Dialog Visibility, Unmounting, And Focus Behavior

**Files:**
- Modify: `src/components/DialogShell.jsx`
- Modify: `src/components/useOverlayFocusTrap.js`
- Modify if needed: `src/components/AddBookModal.jsx`
- Modify if needed: `src/components/PreferencesPanel.jsx`
- Modify: `src/features/__tests__/surfaceSmoke.test.jsx`
- Test: `src/features/__tests__/surfaceSmoke.test.jsx`
- Test: `e2e/app-smoke.spec.js`

- [ ] Move shared dialogs into a React portal mounted under `document.body` so route layout, stacking context, and parent transforms cannot hide the overlay.
- [ ] Keep `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` on the panel, not the backdrop.
- [ ] Add a stable close button accessible name and test it: `Close Add to Library`, `Close Preferences`.
- [ ] Ensure `useOverlayFocusTrap` restores focus only if the previous active element is still connected to the document.
- [ ] Ensure focusable detection ignores invisible elements, not just disabled or `aria-hidden` elements. Use `offsetParent`, `getClientRects().length`, or computed style checks.
- [ ] Add a component test with a parent wrapper that opens `AddBookModal`, submits a manual book, and verifies the dialog unmounts after `onClose`.
- [ ] Add a component test with a parent wrapper that opens `PreferencesPanel`, clicks close, and verifies `queryByRole('dialog', { name: 'Preferences' })` is null.
- [ ] Run `npm test -- --run src/features/__tests__/surfaceSmoke.test.jsx`.
- [ ] Run `npm run test:e2e -- --project=webkit`.

**Acceptance criteria:**
- Quick Add is visibly rendered and keyboard-focusable in WebKit.
- Closing or submitting a dialog removes it from both visible UI and the accessibility tree.
- Body scroll lock is restored after every close path.

### Task 3: Correct Reading Metrics And Labels

**Files:**
- Modify: `src/utils/statsAggregation.js`
- Modify: `src/components/StatsDashboard.jsx`
- Modify: `src/utils/__tests__/statsAggregation.test.js`
- Modify if needed: `src/store/libraryActions.js`
- Test: `src/utils/__tests__/statsAggregation.test.js`

- [ ] Define canonical metric names in `computeLibraryStats`: `totalPagesCataloged`, `pagesLoggedAllTime`, `pagesLoggedThisYear`, `pagesFinishedThisYear`, and `finishedBooksThisYear`.
- [ ] Use `book.pagesRead` and `book.readingLogs` for logged reading progress.
- [ ] Use `book.pageCount` only for cataloged pages or finished-book pages, never for a label that says pages read unless the book is marked finished.
- [ ] Rename the dashboard label from `Pages read` to either `Pages logged` or `Cataloged pages`, depending on the metric chosen for that card.
- [ ] Update share-card/export values so the chronicle uses the same metric as the visible dashboard.
- [ ] Add a test case with one 200-page book and one 10-page log. Expected: logged pages is `10`, cataloged pages is `200`, finished pages is `0` until `dateFinished` is set.
- [ ] Add a test case with the same book marked finished. Expected: finished pages is `200`, logged pages remains `10` unless another log exists.
- [ ] Run `npm test -- --run src/utils/__tests__/statsAggregation.test.js`.
- [ ] Run `npm test -- --run src/features/__tests__/surfaceSmoke.test.jsx`.

**Acceptance criteria:**
- Insights no longer contradicts the Book Page or Today Panel.
- A user can infer exactly what each number means from its label.
- Page-count metadata never masquerades as reading activity.

### Task 4: Fix Rating Visual Semantics

**Files:**
- Modify: `src/components/StarRating.jsx`
- Modify or create: `src/features/__tests__/surfaceSmoke.test.jsx`

- [ ] Change the unrated star visual from filled brown stars to an outline, muted glyph, or empty-state text that cannot be mistaken for a 5-star rating.
- [ ] Preserve keyboard behavior: Arrow keys change by half-star, Home clears, End sets max, Delete/Backspace/`c` clears.
- [ ] Add a test that renders rating `0`, asserts `aria-valuetext` is `No rating`, and asserts the clear button is absent.
- [ ] Add a test that renders rating `8`, asserts `aria-valuetext` is `4 out of 5 stars`, and asserts clear is available.
- [ ] Run `npm test -- --run src/features/__tests__/surfaceSmoke.test.jsx`.

**Acceptance criteria:**
- The visual zero state clearly communicates unrated.
- Accessibility and visuals tell the same story.

## Phase 2: Simplify The Core Workflow

### Task 5: Make Add To Library A Single Fast, Reliable Funnel

**Files:**
- Modify: `src/components/AddBookModal.jsx`
- Modify: `src/components/add-book/ManualEntryMode.jsx`
- Modify: `src/components/add-book/BulkImportMode.jsx`
- Modify: `src/hooks/useBookSearch.js`
- Modify: `e2e/app-smoke.spec.js`

- [ ] Make Manual entry the fallback path obvious from every search failure. The existing `Add manually instead` control is good; ensure it is keyboard reachable and prefills the failed search query.
- [ ] Add a visible success state after manual add: title added, shelf count updated, modal closed.
- [ ] Make desktop-only Article and Migrate tabs visibly disabled in the web shell instead of clickable tabs that lead to disabled controls.
- [ ] Add a lightweight network/search failure state that gives the user a manual-entry escape hatch without implying their library is broken.
- [ ] Add e2e coverage for: search no-results -> manual prefill -> add book -> modal gone -> new book visible.
- [ ] Add e2e coverage for web shell Article tab: user can see why it is desktop-only and cannot submit.

**Acceptance criteria:**
- A user who cannot find a book by search can still add it in under 30 seconds.
- Desktop-only modes do not feel broken in the web shell.

### Task 6: Improve The Book Page As The Reading Workbench

**Files:**
- Modify: `src/pages/BookPage.jsx`
- Modify: `src/pages/book-page/*`
- Modify: `src/store/libraryActions.js`
- Modify: `src/store/__tests__/libraryActions.test.js`
- Modify: `e2e/app-smoke.spec.js`

- [ ] Keep the current successful flow: page logging, notes, quotes, reflections, and memories all worked in manual QA.
- [ ] Add inline confirmation for each saved capture so the user knows whether the action persisted.
- [ ] Clamp `pagesRead` to `pageCount` when `pageCount` exists, or show an explicit overage state if the product wants to allow rereads.
- [ ] Add an Undo action for the most recent page log entry.
- [ ] Make Reading Trail entries visually distinct by type: note, quote, reflection, memory, document highlight.
- [ ] Add e2e coverage for logging pages, saving a note, saving a quote, and seeing all three in Reading Trail.

**Acceptance criteria:**
- The book page feels like a reliable workbench, not a form collection.
- Page progress cannot silently become nonsensical.

### Task 7: Make Insights A Review Surface, Not A Confusing Dashboard

**Files:**
- Modify: `src/features/insights/InsightsView.jsx`
- Modify: `src/components/StatsDashboard.jsx`
- Modify: `src/components/TodayPanel.jsx`
- Modify: `src/components/MemoryResurface.jsx`
- Modify: `src/components/RecommendationsPanel.jsx`
- Modify: `src/components/TimelineShelf.jsx`
- Modify: `src/styles/insights.css`

- [ ] Reorder Insights around user intent: `Today`, `Reading Ledger`, `Saved Ideas`, `Recommendations`, `Timeline`.
- [ ] Make the first visible metrics match high-confidence data only: books cataloged, pages logged, quotes saved, finished this year.
- [ ] Move gamified language such as levels, quests, and achievements behind an optional collapsed section unless the user has configured it.
- [ ] Add empty states that suggest the next useful action: log pages, capture quote, finish a book, or import documents.
- [ ] Ensure all cards have consistent heading scale and do not compete with the page hero.

**Acceptance criteria:**
- Insights helps the user decide what to read, review, or update next.
- Low-confidence metrics no longer dominate the page.

## Phase 3: Desktop-Grade Product Reliability

### Task 8: Make Tauri Launch And Desktop Smoke Testing Reliable

**Files:**
- Modify: `scripts/desktop-smoke.mjs`
- Modify if needed: `src-tauri/tauri.conf.json`
- Modify if needed: `src-tauri/src/main.rs`
- Modify if needed: `src-tauri/src/lib.rs`
- Modify: `package.json`

- [ ] Add a macOS-friendly desktop launch smoke command that verifies the app process and window title exist, even if full Tauri WebDriver automation remains Linux-only.
- [ ] Add logging around app startup so a failed window launch is diagnosable from terminal output.
- [ ] Add a `test:desktop-launch` script that runs a minimal launch, waits for the app process/window, then exits cleanly.
- [ ] Keep `test:desktop-e2e` as the deeper Linux/WebDriver path.
- [ ] Update `npm run verify` to run `test:desktop-launch` on macOS and `test:desktop-e2e` on supported CI environments.
- [ ] Run `npm run tauri dev` and confirm the `Virtual Library` window appears locally.
- [ ] Run the new `npm run test:desktop-launch`.

**Acceptance criteria:**
- A developer can tell whether the desktop app actually launched.
- Desktop launch failure is no longer silent.
- Desktop-only product claims have a local verification path.

### Task 9: Harden Reading Room Import And Web/Desktop Boundary

**Files:**
- Modify: `src/features/reading-room/ReadingRoomView.jsx`
- Modify: `src/components/reading-room/*`
- Modify: `src/hooks/useTauriOperations.js`
- Modify: `src/hooks/tauri/*`
- Modify: `e2e/app-smoke.spec.js`
- Modify: `scripts/desktop-smoke.mjs`

- [ ] Keep the web shell honest: import controls should be disabled with a short reason, not half-active.
- [ ] In desktop, make Import Files expose clear progress, success, and failure states.
- [ ] Add retry affordances for failed ingestion jobs.
- [ ] Add empty-state copy that explains supported file types without sending users to preferences.
- [ ] Add desktop smoke coverage for importing PDF and EPUB fixtures, opening each reader, and closing with Escape.

**Acceptance criteria:**
- Reading Room is understandable in web and functional in desktop.
- Failed imports tell users what happened and what they can do next.

## Phase 4: Product Uplevel

### Task 10: Establish A Small, Consistent Design System

**Files:**
- Modify: `src/index.css`
- Modify: `src/styles/*.css`
- Modify: shared buttons, tabs, dialog, cards, toolbar components as needed

- [ ] Define canonical button variants: primary, secondary, ghost, icon.
- [ ] Define canonical segmented controls for route tabs, shelf sort, add modes, and reading filters.
- [ ] Define canonical dialog sizes and body spacing.
- [ ] Replace visible text-only controls with icons where the meaning is standard and already supported by the app's icon set.
- [ ] Tighten cards to utilitarian surfaces: no nested card-on-card layouts, no oversized headings inside compact panels.
- [ ] Audit mobile and narrow desktop widths for text overflow in header, shelf controls, dialogs, and Insights cards.
- [ ] Run browser screenshots for desktop and mobile widths after changes.

**Acceptance criteria:**
- The app feels intentionally designed across screens, not assembled from unrelated panels.
- Dense information remains scannable.

### Task 11: Turn Saved Ideas Into A Strong Retrieval Loop

**Files:**
- Modify: `src/components/AnnotationsHub.jsx`
- Modify: `src/pages/book-page/BookPageReadingTrailSection.jsx`
- Modify: `src/store/librarySelectors.js`
- Modify: `src/features/insights/InsightsView.jsx`
- Modify: `src/components/MemoryResurface.jsx`

- [ ] Add filters for note, quote, reflection, memory, and highlight in the annotation hub.
- [ ] Add source chips that link back to the exact book or document.
- [ ] Add a `Review later` or `Pin to study stack` affordance directly on quote/reflection/memory entries.
- [ ] Ensure the same entry has one stable identity across Book Page, Annotations Hub, and Insights.
- [ ] Add tests for annotation sorting and stable ids in `src/store/__tests__/librarySelectors.test.js`.

**Acceptance criteria:**
- Saving ideas creates future value, not just more stored text.
- Users can reliably get from an idea back to its source.

### Task 12: Add Product Quality Gates To The Default Workflow

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/*`
- Create if absent: `docs/qa-checklist.md`

- [ ] Split verification into explicit local commands: `verify:unit`, `verify:web`, `verify:desktop`, and `verify`.
- [ ] Keep `verify` strict enough to catch the modal, stats, and route regressions from this QA run.
- [ ] Add a short QA checklist covering: Quick Add, manual add, Escape close, page log, quote save, Insights stats, Reading Room web boundary, Preferences close, desktop launch.
- [ ] Ensure CI runs unit tests, build, and Chromium e2e at minimum.
- [ ] Add WebKit e2e to CI if runtime cost is acceptable; otherwise keep it as a required local pre-release command.

**Acceptance criteria:**
- Future visual and interaction regressions have a standard catch path.
- A new contributor can run one command and understand whether the app is shippable.

## Suggested Execution Order

1. Task 1: E2E baseline.
2. Task 2: Dialog system.
3. Task 3: Stats semantics.
4. Task 4: Rating visual semantics.
5. Task 8: Desktop launch smoke.
6. Task 5: Add funnel polish.
7. Task 6: Book Page workbench polish.
8. Task 9: Reading Room boundary and import reliability.
9. Task 7: Insights simplification.
10. Task 10: Design system consolidation.
11. Task 11: Retrieval loop.
12. Task 12: Quality gates and docs.

This order removes trust-breaking bugs before visual polish. It also makes the automated suite useful before the larger product changes land.

## Release Gates

Before calling the uplift complete:

- `npm test` passes.
- `npm run build` passes.
- `npm run test:e2e -- --project=chromium` passes.
- `npm run test:e2e -- --project=webkit` passes or has a documented blocker.
- `npm run check:native` passes.
- `npm run test:native` passes.
- Desktop launch smoke passes on macOS.
- Manual Computer Use spot-check passes: Quick Add, Preferences, Book Page page log, quote/reflection/memory save, Insights stats, Reading Room route.

## Risk Register

- WebKit modal behavior is the highest risk because it can make the app look broken in the desktop runtime even when Chromium appears fine.
- Stats changes may expose older stored data with incomplete `pagesRead` or `readingLogs`; tests should include legacy book objects.
- Tauri desktop automation is platform-sensitive. Keep macOS launch smoke separate from Linux WebDriver e2e so one blocker does not erase all desktop confidence.
- Design polish should not introduce a new information architecture. The current top-level routes are enough: Library, Reading Room, Insights, Maintenance.

## Definition Of Done

The uplift is done when a new user can launch the desktop app, add a book manually, log reading, save an idea, find that idea again, and trust the Insights numbers, with the whole path covered by automated tests and one manual WebKit/Desktop verification pass.
