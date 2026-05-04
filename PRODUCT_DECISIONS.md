# Product Decisions

## North Star

Virtual Library is a desktop, local-first personal library cabinet for serious readers. The bookshelf is the primary navigation surface; books and documents belong to one owned library; reading, notes, and recovery features exist to deepen that library rather than compete with it.

## Primary User

- A single reader who wants to collect, revisit, and work with books, PDFs, EPUBs, and saved articles in one place.
- This product is private by default. It is not a collaborative workspace or a cloud-first service.

## Canonical Interaction Model

- Clicking a book from the shelf opens the route-backed book page at `/book/:bookId`.
- The book page is the primary working surface for a book.
- Secondary metadata editing happens in focused dialogs launched from the book page, not in a parallel modal-first book surface.

## Visible Product Structure

- `Library`: shelf-first browsing and curation for books.
- `Reading Room`: the document side of the same library for PDFs, EPUBs, and saved articles.
- Books and documents share one storage model, one search substrate, one annotation surface, and one backup story.
- Books and documents do not need identical visual representation. The shelf owns the emotional center; the reading room owns file-heavy workflows.

## Core Features

- Bookshelf browsing and route-backed book detail pages
- Local import and ownership of books and documents
- In-app reading for PDFs, EPUBs, and saved articles
- Notes, quotes, reflections, and reading progress
- Search, OCR-backed retrieval, and durable local storage
- Backup, snapshot, restore, and library maintenance

## Supporting Features

- Shelf appearance customization
- Spine library and exhibit curation
- Reading stats and ritual surfaces on the dedicated Insights route

## Parked Features

- Semantic search
- Cloud AI recommendations and synthesis
- Social or collaborative workflows
- Public profile or multi-user account systems

## Explicit Decisions

- Runtime priority: Tauri desktop first.
- AI is deferred until the shelf, book page, unified library model, and annotation workflows are coherent.
- The default voice should read as editorial and library-like, not game-like.
- Features that imply capabilities we do not actually ship should stay hidden.

## Active vs Dormant System Notes

- Active today:
  - local library persistence
  - document ingestion
  - OCR/indexing
  - reader state
  - backup/snapshot infrastructure
  - guarded desktop import staging and restore recovery
- Dormant or intentionally deferred:
  - semantic retrieval
  - graph-like annotation/link systems that are not surfaced meaningfully yet
  - public bookshelf and social residue from earlier pivots

## Reliability Contract

- Imports must not leave failed app-created files in the watched `library/` folder.
- Backup and snapshot creation must drain pending writes before native export.
- Restore must treat active-library replacement as a database-critical operation even when the selected path is only path-equivalent to the stored library path.
- Filesystem deletion must remain narrow and app-owned. User source files and final vault files are not removed as part of failed import recovery.

## Editing Rule of Thumb

When a new feature does not make the shelf, book page, reading room, or retained-value annotation loop better, it should probably wait.
