import React from 'react'

function ReadingRoomRecentSection({
  recentDocuments,
  books,
  shelves,
  canRead,
  getProgressValue,
  statusInfo,
  onReadDocument,
}) {
  if (recentDocuments.length === 0) return null

  return (
    <div className="reading-room-recent">
      <div className="reading-room-section-title">Recently read</div>
      <div className="reading-room-recent-grid">
        {recentDocuments.map((doc) => {
          const status = statusInfo(doc)
          const progressValue = getProgressValue(doc)

          return (
            <div key={doc.id} className="reading-room-recent-card">
              <div className="reading-room-recent-title">{doc.title}</div>
              <div className="reading-room-recent-meta">
                {doc.type.toUpperCase()}
                {status && (
                  <span className={status.className}>{status.label}</span>
                )}
              </div>
              <DocumentTaxonomy doc={doc} shelves={shelves} books={books} />
              {progressValue !== null && (
                <div className="reading-room-progress">
                  <div className="reading-room-progress-track">
                    <div className="reading-room-progress-fill" style={{ width: `${progressValue}%` }} />
                  </div>
                  <span>{progressValue}%</span>
                </div>
              )}
              {canRead(doc) && (
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onReadDocument?.(doc, { resume: true })}
                >
                  Resume
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DocumentTaxonomy({ doc, shelves, books }) {
  const shelfNames = (doc.shelves || [])
    .map((shelfId) => shelves.find((shelf) => shelf.id === shelfId)?.name)
    .filter(Boolean)
  const linkedBook = books.find((book) => book.id === doc.linkedBookId) || null

  if (shelfNames.length === 0 && (!doc.tags || doc.tags.length === 0) && !doc.linkedBookId) {
    return <div className="reading-room-taxonomy-empty">No shelves or tags yet.</div>
  }

  return (
    <div className="reading-room-taxonomy">
      {linkedBook && (
        <span className="reading-room-taxonomy-chip linked">
          Book: {linkedBook.title}
        </span>
      )}
      {shelfNames.map((name) => (
        <span key={name} className="reading-room-taxonomy-chip shelf">{name}</span>
      ))}
      {(doc.tags || []).map((tag) => (
        <span key={tag} className="reading-room-taxonomy-chip tag">{tag}</span>
      ))}
    </div>
  )
}

export { DocumentTaxonomy }
export default ReadingRoomRecentSection
