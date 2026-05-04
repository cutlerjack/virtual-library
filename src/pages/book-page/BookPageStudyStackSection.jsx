import React from 'react'

function BookPageStudyStackSection({
  studyStack,
  studySession,
  studySessionLabel,
  primaryStudyActionLabel,
  studyNotesDrafts,
  onStudyNoteDraftChange,
  onLaunchStudySession,
  onRequestReset,
  onReviewStudyEntry,
  onMoveStudyEntry,
  onToggleStudyEntryComplete,
  onSaveStudyNote,
  onRemovePinnedEntry,
}) {
  return (
    <section className="book-page-section book-page-section-wide">
      <div className="book-page-section-head">
        <h2 className="book-page-section-title">Study Stack</h2>
        <div className="book-page-section-actions">
          <div className="book-page-study-summary">
            <div className="book-page-progress-note">
              Pin the passages, notes, and linked reading you want to keep close while working through this book.
            </div>
            <div className="book-page-study-status" data-status={studySession.status}>
              {studySessionLabel}
            </div>
            <div className="book-page-study-summary-meta">
              <span>{studySession.remainingCount} active</span>
              <span>{studySession.completedCount} complete</span>
              {studySession.startedAt && <span>{studySession.reviewedThisSessionCount} reviewed in session</span>}
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs px-3 py-2"
            onClick={onLaunchStudySession}
            disabled={studyStack.length === 0}
          >
            {primaryStudyActionLabel}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs px-3 py-2"
            onClick={onRequestReset}
            disabled={studyStack.length === 0 || studySession.completedCount === 0}
          >
            Reset Progress
          </button>
        </div>
      </div>
      <div className="book-page-stack">
        {studyStack.length > 0 ? (
          studyStack.map((entry, index) => (
            <div key={entry.id} className={`book-page-study-card ${entry.format === 'book' ? 'book' : 'document'} ${entry.completedAt ? 'completed' : ''}`}>
              <div className="book-page-study-card-meta">
                <span>{entry.type}</span>
                <span>{entry.format}</span>
                <span>{entry.itemTitle}</span>
                {entry.locationLabel && <span>{entry.locationLabel}</span>}
              </div>
              <div className="book-page-study-card-text">{entry.text}</div>
              <div className="book-page-study-note">
                <label className="book-page-field">
                  Why keep this close?
                  <textarea
                    className="book-page-textarea book-page-textarea-study"
                    value={studyNotesDrafts[entry.id] || ''}
                    onChange={(event) => onStudyNoteDraftChange(entry.id, event.target.value)}
                    placeholder="Optional private note for this saved entry."
                  />
                </label>
              </div>
              <div className="book-page-study-card-footer">
                <div className="book-page-study-card-date">
                  #{index + 1} in this working set · Saved {new Date(entry.savedAt || entry.createdAt || Date.now()).toLocaleDateString()}
                  {entry.lastReviewedAt && (
                    <span> · Reviewed {new Date(entry.lastReviewedAt).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="book-page-study-card-actions">
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onMoveStudyEntry(entry.id, -1)}
                    disabled={index === 0}
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onMoveStudyEntry(entry.id, 1)}
                    disabled={index === studyStack.length - 1}
                  >
                    Move Down
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onReviewStudyEntry(entry)}
                  >
                    {entry.format === 'book' ? 'Review' : 'Review Source'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onToggleStudyEntryComplete(entry.id)}
                  >
                    {entry.completedAt ? 'Mark Active' : 'Mark Done'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onSaveStudyNote(entry.id)}
                    disabled={(studyNotesDrafts[entry.id] || '') === (entry.note || '')}
                  >
                    Save Note
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onRemovePinnedEntry(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="book-page-empty-section">
            Nothing pinned yet. Use the reading trail below to keep important passages close.
          </div>
        )}
      </div>
    </section>
  )
}

export default BookPageStudyStackSection
