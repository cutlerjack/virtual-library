import React from 'react'
import { DocumentTaxonomy } from './ReadingRoomRecentSection'

function ReadingRoomDocumentResults({
  viewMode,
  documents,
  emptyStateMessage = 'No documents match the current filters.',
  books,
  shelves,
  sortedBooks,
  editingDocId,
  draftTag,
  relationSuggestionsByDocId,
  canRead,
  getProgressValue,
  statusInfo,
  onToggleEditing,
  onDraftTagChange,
  onReadDocument,
  onUpdateDocument,
  onOpenBook,
  onToggleShelf,
  onAddTag,
  onRemoveTag,
  onAcceptSuggestedBook,
  onDismissSuggestedBook,
  onRestoreDismissedBook,
}) {
  if (viewMode === 'grid') {
    return (
      <div className="reading-room-grid">
        {documents.length === 0 ? (
          <div className="reading-room-empty">{emptyStateMessage}</div>
        ) : (
          documents.map((doc) => (
            <ReadingRoomDocumentCard
              key={doc.id}
              doc={doc}
              books={books}
              shelves={shelves}
              sortedBooks={sortedBooks}
              isEditing={editingDocId === doc.id}
              draftTag={draftTag}
              suggestionState={relationSuggestionsByDocId.get(doc.id) || {}}
              canRead={canRead}
              getProgressValue={getProgressValue}
              statusInfo={statusInfo}
              onToggleEditing={onToggleEditing}
              onDraftTagChange={onDraftTagChange}
              onReadDocument={onReadDocument}
              onUpdateDocument={onUpdateDocument}
              onOpenBook={onOpenBook}
              onToggleShelf={onToggleShelf}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              onAcceptSuggestedBook={onAcceptSuggestedBook}
              onDismissSuggestedBook={onDismissSuggestedBook}
              onRestoreDismissedBook={onRestoreDismissedBook}
            />
          ))
        )}
      </div>
    )
  }

  return (
    <div className="reading-room-list">
      {documents.length === 0 ? (
        <div className="reading-room-empty">{emptyStateMessage}</div>
      ) : (
        documents.map((doc) => (
          <ReadingRoomDocumentListItem
            key={doc.id}
            doc={doc}
            books={books}
            shelves={shelves}
            sortedBooks={sortedBooks}
            isEditing={editingDocId === doc.id}
            draftTag={draftTag}
            suggestionState={relationSuggestionsByDocId.get(doc.id) || {}}
            canRead={canRead}
            getProgressValue={getProgressValue}
            statusInfo={statusInfo}
            onToggleEditing={onToggleEditing}
            onDraftTagChange={onDraftTagChange}
            onReadDocument={onReadDocument}
            onUpdateDocument={onUpdateDocument}
            onOpenBook={onOpenBook}
            onToggleShelf={onToggleShelf}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onAcceptSuggestedBook={onAcceptSuggestedBook}
            onDismissSuggestedBook={onDismissSuggestedBook}
            onRestoreDismissedBook={onRestoreDismissedBook}
          />
        ))
      )}
    </div>
  )
}

function ReadingRoomDocumentCard(props) {
  const {
    doc,
    books,
    shelves,
    sortedBooks,
    isEditing,
    draftTag,
    suggestionState,
    canRead,
    getProgressValue,
    statusInfo,
    onToggleEditing,
    onDraftTagChange,
    onReadDocument,
    onUpdateDocument,
    onOpenBook,
    onToggleShelf,
    onAddTag,
    onRemoveTag,
    onAcceptSuggestedBook,
    onDismissSuggestedBook,
    onRestoreDismissedBook,
  } = props

  const status = statusInfo(doc)
  const progressValue = getProgressValue(doc)
  const suggestion = suggestionState.active || null
  const dismissedSuggestion = suggestionState.dismissed || null

  return (
    <div className="reading-room-card">
      <div className="reading-room-card-cover">
        {doc.thumbnail ? (
          <img src={doc.thumbnail} alt={doc.title} />
        ) : (
          <div className="reading-room-card-placeholder">{doc.type.toUpperCase()}</div>
        )}
      </div>
      <div className="reading-room-card-title">{doc.title}</div>
      <div className="reading-room-card-meta">
        {doc.type.toUpperCase()}
        {status && (
          <span className={status.className}>{status.label}</span>
        )}
      </div>
      <DocumentTaxonomy doc={doc} shelves={shelves} books={books} />
      <DocumentSuggestionState
        doc={doc}
        suggestion={suggestion}
        dismissedSuggestion={dismissedSuggestion}
        onAcceptSuggestedBook={onAcceptSuggestedBook}
        onDismissSuggestedBook={onDismissSuggestedBook}
        onRestoreDismissedBook={onRestoreDismissedBook}
      />
      {progressValue !== null && (
        <div className="reading-room-progress">
          <div className="reading-room-progress-track">
            <div className="reading-room-progress-fill" style={{ width: `${progressValue}%` }} />
          </div>
          <span>{progressValue}%</span>
        </div>
      )}
      <ReadingRoomDocumentActions
        doc={doc}
        isEditing={isEditing}
        canRead={canRead}
        onToggleEditing={onToggleEditing}
        onReadDocument={onReadDocument}
        onOpenBook={onOpenBook}
      />
      {isEditing && (
        <DocumentOrganizationEditor
          doc={doc}
          books={sortedBooks}
          shelves={shelves}
          draftTag={draftTag}
          onDraftTagChange={onDraftTagChange}
          onToggleShelf={onToggleShelf}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onUpdateDocument={onUpdateDocument}
          onOpenBook={onOpenBook}
        />
      )}
    </div>
  )
}

function ReadingRoomDocumentListItem(props) {
  const {
    doc,
    books,
    shelves,
    sortedBooks,
    isEditing,
    draftTag,
    suggestionState,
    canRead,
    getProgressValue,
    statusInfo,
    onToggleEditing,
    onDraftTagChange,
    onReadDocument,
    onUpdateDocument,
    onOpenBook,
    onToggleShelf,
    onAddTag,
    onRemoveTag,
    onAcceptSuggestedBook,
    onDismissSuggestedBook,
    onRestoreDismissedBook,
  } = props

  const status = statusInfo(doc)
  const progressValue = getProgressValue(doc)
  const suggestion = suggestionState.active || null
  const dismissedSuggestion = suggestionState.dismissed || null

  return (
    <div className="reading-room-item-shell">
      <div className="reading-room-item">
        <div>
          <div className="reading-room-item-title">{doc.title}</div>
          <div className="reading-room-item-meta">
            {doc.type.toUpperCase()}
            {status && (
              <span className={status.className}>{status.label}</span>
            )}
          </div>
          <DocumentTaxonomy doc={doc} shelves={shelves} books={books} />
          <DocumentSuggestionState
            doc={doc}
            suggestion={suggestion}
            dismissedSuggestion={dismissedSuggestion}
            compact
            onAcceptSuggestedBook={onAcceptSuggestedBook}
            onDismissSuggestedBook={onDismissSuggestedBook}
            onRestoreDismissedBook={onRestoreDismissedBook}
          />
        </div>
        <div className="reading-room-item-actions">
          {progressValue !== null && (
            <div className="reading-room-progress small">
              <div className="reading-room-progress-track">
                <div className="reading-room-progress-fill" style={{ width: `${progressValue}%` }} />
              </div>
              <span>{progressValue}%</span>
            </div>
          )}
          <ReadingRoomDocumentActions
            doc={doc}
            isEditing={isEditing}
            canRead={canRead}
            onToggleEditing={onToggleEditing}
            onReadDocument={onReadDocument}
            onOpenBook={onOpenBook}
          />
        </div>
      </div>
      {isEditing && (
        <DocumentOrganizationEditor
          doc={doc}
          books={sortedBooks}
          shelves={shelves}
          draftTag={draftTag}
          onDraftTagChange={onDraftTagChange}
          onToggleShelf={onToggleShelf}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onUpdateDocument={onUpdateDocument}
          onOpenBook={onOpenBook}
        />
      )}
    </div>
  )
}

function ReadingRoomDocumentActions({
  doc,
  isEditing,
  canRead,
  onToggleEditing,
  onReadDocument,
  onOpenBook,
}) {
  return (
    <>
      {canRead(doc) && (
        <>
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
        </>
      )}
      <button
        type="button"
        className="btn-secondary text-xs px-3 py-2"
        onClick={() => onToggleEditing(doc.id)}
      >
        {isEditing ? 'Hide Organization' : 'Organize'}
      </button>
      {doc.linkedBookId && (
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={() => onOpenBook?.(doc.linkedBookId)}
        >
          Open Linked Book
        </button>
      )}
    </>
  )
}

function DocumentSuggestionState({
  doc,
  suggestion,
  dismissedSuggestion,
  compact = false,
  onAcceptSuggestedBook,
  onDismissSuggestedBook,
  onRestoreDismissedBook,
}) {
  if (!doc.linkedBookId && suggestion) {
    return (
      <DocumentSuggestion
        doc={doc}
        suggestion={suggestion}
        compact={compact}
        onAccept={() => onAcceptSuggestedBook(doc, suggestion.book.id)}
        onDismiss={() => onDismissSuggestedBook(doc, suggestion.book.id)}
      />
    )
  }

  if (!doc.linkedBookId && !suggestion && dismissedSuggestion) {
    return (
      <DismissedDocumentSuggestion
        suggestion={dismissedSuggestion}
        compact={compact}
        onUndo={() => onRestoreDismissedBook(doc, dismissedSuggestion.book.id)}
      />
    )
  }

  return null
}

function DocumentSuggestion({ suggestion, onAccept, onDismiss, compact = false }) {
  if (!suggestion?.book) return null

  return (
    <div className={`reading-room-suggestion ${compact ? 'compact' : ''}`}>
      <div className="reading-room-suggestion-copy">
        <strong>Likely match:</strong> {suggestion.book.title}
        {suggestion.reasons?.[0] && (
          <span>{suggestion.reasons[0]}</span>
        )}
      </div>
      <div className="reading-room-suggestion-actions">
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onDismiss}
        >
          Dismiss
        </button>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onAccept}
        >
          Attach
        </button>
      </div>
    </div>
  )
}

function DismissedDocumentSuggestion({ suggestion, onUndo, compact = false }) {
  if (!suggestion?.book) return null

  return (
    <div className={`reading-room-suggestion dismissed ${compact ? 'compact' : ''}`}>
      <div className="reading-room-suggestion-copy">
        <strong>Suggestion dismissed:</strong> {suggestion.book.title}
        {suggestion.reasons?.[0] && (
          <span>{suggestion.reasons[0]}</span>
        )}
      </div>
      <div className="reading-room-suggestion-actions">
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onUndo}
        >
          Undo
        </button>
      </div>
    </div>
  )
}

function DocumentOrganizationEditor({
  doc,
  books,
  shelves,
  draftTag,
  onDraftTagChange,
  onToggleShelf,
  onAddTag,
  onRemoveTag,
  onUpdateDocument,
  onOpenBook,
}) {
  const linkedBook = books.find((book) => book.id === doc.linkedBookId) || null

  return (
    <div className="reading-room-organizer">
      <div className="reading-room-organizer-title">Shared Organization</div>
      <div className="reading-room-organizer-group">
        <div className="reading-room-organizer-label">Attached Book</div>
        <div className="reading-room-organizer-input">
          <select
            value={doc.linkedBookId || ''}
            onChange={(event) => {
              const nextBookId = event.target.value || null
              onUpdateDocument?.(doc.id, {
                linkedBookId: nextBookId,
                dismissedBookIds: nextBookId
                  ? (doc.dismissedBookIds || []).filter((id) => id !== nextBookId)
                  : (doc.dismissedBookIds || []),
              })
            }}
          >
            <option value="">No linked book</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} {book.author ? `· ${book.author}` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => linkedBook && onOpenBook?.(linkedBook.id)}
            disabled={!linkedBook}
          >
            Open Book
          </button>
        </div>
      </div>
      <div className="reading-room-organizer-group">
        <div className="reading-room-organizer-label">Shelves</div>
        <div className="reading-room-chip-row">
          {shelves
            .filter((shelf) => shelf.id !== 'all')
            .map((shelf) => (
              <button
                key={shelf.id}
                type="button"
                className={`reading-room-chip ${(doc.shelves || []).includes(shelf.id) ? 'active' : ''}`}
                onClick={() => onToggleShelf(doc, shelf.id)}
              >
                {shelf.name}
              </button>
            ))}
        </div>
      </div>
      <div className="reading-room-organizer-group">
        <div className="reading-room-organizer-label">Tags</div>
        <div className="reading-room-taxonomy">
          {(doc.tags || []).map((tag) => (
            <button
              key={tag}
              type="button"
              className="reading-room-taxonomy-chip tag removable"
              onClick={() => onRemoveTag(doc, tag)}
            >
              {tag} ×
            </button>
          ))}
        </div>
        <div className="reading-room-organizer-input">
          <input
            type="text"
            value={draftTag}
            onChange={(event) => onDraftTagChange(event.target.value)}
            placeholder="Add tag"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onAddTag(doc)
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => onAddTag(doc)}
          >
            Add Tag
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReadingRoomDocumentResults
