import React from 'react'
import LibraryVaultPanel from '../../components/LibraryVaultPanel'
import IngestionQueuePanel from '../../components/IngestionQueuePanel'
import { isTauri } from '../../utils/tauri'

function ReadingRoomView({
  books,
  documents,
  shelves,
  allLibraryTags,
  libraryPath,
  onImport,
  onReadDocument,
  onUpdateDocument,
  onNavigateToLibrary,
  onOpenBook,
  vaultError,
  lastRescanAt,
  ingestJobs,
  ingestBusy,
  onRetryIngest,
  onCancelIngest,
  onRunAllOcr,
}) {
  const totalItems = books.length + documents.length
  const isDesktop = isTauri()

  return (
    <div className="documents-page">
      <section className="press-hero documents-hero">
        <div>
          <div className="press-hero-eyebrow">Reading Room</div>
          <h2 className="press-hero-title">Documents share the same catalog as your shelves.</h2>
          <p className="press-hero-lede">
            PDFs, EPUBs, and saved articles live in the Reading Room, but they use the same tags,
            shelves, search, and backups as the rest of the collection.
          </p>
        </div>
        <div className="press-hero-metrics">
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{totalItems}</div>
            <div className="press-hero-metric-label">Cataloged Items</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{books.length}</div>
            <div className="press-hero-metric-label">Books</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{documents.length}</div>
            <div className="press-hero-metric-label">Documents</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{shelves.filter((shelf) => shelf.id !== 'all').length}</div>
            <div className="press-hero-metric-label">Shelves in Use</div>
          </div>
        </div>
      </section>

      <IngestionQueuePanel
        jobs={ingestJobs}
        busy={ingestBusy}
        isDesktop={isDesktop}
        onRetry={onRetryIngest}
        onCancel={onCancelIngest}
        onRunAllOcr={onRunAllOcr}
      />

      <LibraryVaultPanel
        libraryPath={libraryPath}
        books={books}
        documents={documents}
        shelves={shelves}
        allLibraryTags={allLibraryTags}
        onImport={onImport}
        onReadDocument={onReadDocument}
        onUpdateDocument={onUpdateDocument}
        onNavigateToLibrary={onNavigateToLibrary}
        onOpenBook={onOpenBook}
        vaultError={vaultError}
        lastRescanAt={lastRescanAt}
      />
    </div>
  )
}

export default ReadingRoomView
