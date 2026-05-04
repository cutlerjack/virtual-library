import React from 'react'

function ReadingRoomOverview({
  isDesktop,
  busy,
  booksCount,
  documentsCount,
  libraryPath,
  lastRescanAt,
  vaultError,
  onImport,
  onNavigateToLibrary,
}) {
  return (
    <>
      <div className="reading-room-header">
        <div>
          <div className="reading-room-eyebrow">Reading Room</div>
          <h3 className="reading-room-title">Documents use the same organization system as your shelves.</h3>
          <p className="reading-room-subtitle">
            PDFs, EPUBs, and articles can sit on shared shelves, carry shared tags,
            and appear in the same library search as your books.
          </p>
        </div>
        <div className="reading-room-actions">
          <button className="btn-primary text-xs px-3 py-2" onClick={onImport} disabled={busy || !isDesktop}>
            {busy ? 'Importing...' : 'Import Files'}
          </button>
          <button className="btn-secondary text-xs px-3 py-2" onClick={onNavigateToLibrary}>
            Return to Shelf
          </button>
        </div>
      </div>

      {!isDesktop && (
        <div className="reading-room-alert">
          The desktop vault is available in the Tauri app. Run the desktop build to import files.
        </div>
      )}

      {vaultError && (
        <div className="reading-room-alert">
          {vaultError}
        </div>
      )}

      <div className="reading-room-bridge">
        <div>
          <div className="reading-room-section-title">Shared Library Model</div>
          <p className="reading-room-bridge-copy">
            {booksCount} books and {documentsCount} documents share shelves, tags, search,
            annotations, and backups in one owned library.
          </p>
        </div>
      </div>

      {libraryPath && (
        <div className="reading-room-path">
          <span>Library folder</span>
          <span className="reading-room-path-value">{libraryPath}</span>
        </div>
      )}
      <div className="reading-room-path">
        <span>Last scan</span>
        <span className="reading-room-path-value">
          {lastRescanAt ? new Date(lastRescanAt).toLocaleString() : 'Never'}
        </span>
      </div>
    </>
  )
}

export default ReadingRoomOverview
