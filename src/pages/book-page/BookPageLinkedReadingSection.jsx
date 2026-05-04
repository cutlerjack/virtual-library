import React from 'react'
import { Link } from 'react-router-dom'

function BookPageLinkedReadingSection({
  linkedDocuments,
  suggestedDocuments,
  dismissedSuggestedDocuments,
  attachableDocuments,
  orderedAttachableDocuments,
  documentToAttachId,
  onDocumentToAttachChange,
  onAttachDocument,
  onAcceptSuggestedDocument,
  onDismissSuggestion,
  onRestoreSuggestion,
  onReadDocument,
  onDetachDocument,
  onNavigateToDocuments,
}) {
  return (
    <section className="book-page-section book-page-section-wide">
      <div className="book-page-section-head">
        <h2 className="book-page-section-title">Linked Reading</h2>
        <div className="book-page-section-actions">
          <Link to="/documents" className="btn-secondary text-xs px-3 py-2">
            Open Reading Room
          </Link>
        </div>
      </div>
      <div className="book-page-linker">
        <div className="book-page-linker-copy">
          Attach PDFs, EPUBs, and saved articles directly to this volume so the shelf and the Reading Room stop behaving like separate products.
        </div>
        {suggestedDocuments.length > 0 && (
          <div className="book-page-suggested-docs">
            {suggestedDocuments.map((match) => (
              <div key={match.doc.id} className="book-page-suggested-doc">
                <div>
                  <div className="book-page-suggested-doc-title">{match.doc.title}</div>
                  <div className="book-page-suggested-doc-meta">
                    {match.reasons.join(' · ')}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onAcceptSuggestedDocument(match.doc)}
                >
                  Attach Match
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onDismissSuggestion(match.doc)}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}
        {dismissedSuggestedDocuments.length > 0 && (
          <div className="book-page-dismissed-docs">
            {dismissedSuggestedDocuments.map((match) => (
              <div key={match.doc.id} className="book-page-dismissed-doc">
                <div>
                  <div className="book-page-suggested-doc-title">{match.doc.title}</div>
                  <div className="book-page-suggested-doc-meta">
                    Suggestion dismissed. {match.reasons.join(' · ')}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onRestoreSuggestion(match.doc)}
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="book-page-linker-controls">
          <select
            value={documentToAttachId}
            onChange={(event) => onDocumentToAttachChange(event.target.value)}
            disabled={attachableDocuments.length === 0}
          >
            {attachableDocuments.length === 0 ? (
              <option value="">No unlinked documents available</option>
            ) : (
              orderedAttachableDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {suggestedDocuments.some((match) => match.doc.id === doc.id) ? 'Suggested · ' : ''}
                  {doc.title} {doc.author ? `· ${doc.author}` : ''}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            className="btn-primary text-xs px-3 py-2"
            onClick={onAttachDocument}
            disabled={!documentToAttachId}
          >
            Attach
          </button>
          <button
            type="button"
            className="btn-secondary text-xs px-3 py-2"
            onClick={onNavigateToDocuments}
          >
            Manage All Documents
          </button>
        </div>
      </div>
      {linkedDocuments.length > 0 ? (
        <div className="book-page-linked-docs">
          {linkedDocuments.map((doc) => (
            <div key={doc.id} className="book-page-linked-doc">
              <div>
                <div className="book-page-linked-doc-title">{doc.title}</div>
                <div className="book-page-linked-doc-meta">
                  {doc.type.toUpperCase()}
                  {doc.lastOpened && <span> · Opened {new Date(doc.lastOpened).toLocaleDateString()}</span>}
                  {typeof doc.progressPercent === 'number' && <span> · {Math.round(doc.progressPercent)}%</span>}
                  {doc.type === 'pdf' && doc.pageCount && doc.lastPage && <span> · Page {doc.lastPage} of {doc.pageCount}</span>}
                </div>
              </div>
              <div className="book-page-linked-doc-actions">
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onReadDocument?.(doc)}
                >
                  Read
                </button>
                {doc.lastOpened && (
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onReadDocument?.(doc, { resume: true })}
                  >
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onDetachDocument(doc.id)}
                >
                  Detach
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="book-page-empty-section">
          No PDFs, EPUBs, or articles are attached to this book yet.
        </div>
      )}
    </section>
  )
}

export default BookPageLinkedReadingSection
