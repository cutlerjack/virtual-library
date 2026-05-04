import React from 'react'

function ContinueReadingSection({
  continueReadingDocs,
  onNavigateToDocuments,
  onReadDocument,
}) {
  if (continueReadingDocs.length === 0) return null

  return (
    <section className="continue-reading">
      <div className="continue-reading-header">
        <div>
          <div className="continue-reading-eyebrow">Reading Room</div>
          <h3 className="continue-reading-title">Keep active documents in reach without letting them replace the shelf.</h3>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onNavigateToDocuments}
        >
          Open Reading Room
        </button>
      </div>
      <div className="continue-reading-grid">
        {continueReadingDocs.map((doc) => (
          <div key={doc.id} className="continue-reading-card">
            <div className="continue-reading-cover">
              {doc.thumbnail ? (
                <img src={doc.thumbnail} alt={doc.title} />
              ) : (
                <div className="continue-reading-placeholder">{doc.type.toUpperCase()}</div>
              )}
            </div>
            <div className="continue-reading-card-title">{doc.title}</div>
            {doc.type === 'pdf' && doc.pageCount && (
              <div className="continue-reading-progress">
                <div className="continue-reading-progress-track">
                  <div
                    className="continue-reading-progress-fill"
                    style={{ width: `${Math.round(((doc.lastPage || 0) / doc.pageCount) * 100)}%` }}
                  />
                </div>
                <span>{Math.round(((doc.lastPage || 0) / doc.pageCount) * 100)}%</span>
              </div>
            )}
            {typeof doc.progressPercent === 'number' && (doc.type === 'epub' || doc.type === 'article') && (
              <div className="continue-reading-progress">
                <div className="continue-reading-progress-track">
                  <div
                    className="continue-reading-progress-fill"
                    style={{ width: `${Math.round(doc.progressPercent)}%` }}
                  />
                </div>
                <span>{Math.round(doc.progressPercent)}%</span>
              </div>
            )}
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => onReadDocument(doc, { resume: true })}
            >
              Resume
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ContinueReadingSection
