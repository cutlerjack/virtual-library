import React from 'react'
import { getStudyStackEntryKey } from '../../utils/studyStack'

function BookPageReadingTrailSection({
  readingTrail,
  pinnedTrailKeys,
  onOpenTrailEntry,
  onPinTrailEntry,
}) {
  return (
    <section className="book-page-section book-page-section-wide">
      <div className="book-page-section-head">
        <h2 className="book-page-section-title">Reading Trail</h2>
        <div className="book-page-progress-note">
          Notes, quotes, reflections, and linked-document highlights in one timeline.
        </div>
      </div>
      <div className="book-page-stack">
        {readingTrail.length > 0 ? (
          readingTrail.map((entry) => (
            <div key={entry.id} className={`book-page-activity ${entry.format === 'book' ? 'book' : 'document'}`}>
              <div className="book-page-activity-meta">
                <span>{entry.type}</span>
                <span>{entry.format}</span>
                <span>{entry.itemTitle}</span>
                {entry.locationLabel && <span>{entry.locationLabel}</span>}
              </div>
              <div className="book-page-activity-text">{entry.text}</div>
              <div className="book-page-activity-footer">
                <div className="book-page-activity-context">
                  {entry.format === 'book'
                    ? 'Captured directly on this volume.'
                    : `Captured in linked reading: ${entry.itemTitle}.`}
                </div>
                <div className="book-page-activity-actions">
                  {entry.format !== 'book' && (
                    <button
                      type="button"
                      className="btn-secondary text-xs px-3 py-2"
                      onClick={() => onOpenTrailEntry(entry)}
                    >
                      Open Source
                    </button>
                  )}
                  {pinnedTrailKeys.has(getStudyStackEntryKey(entry)) ? (
                    <span className="book-page-activity-state">Saved to Study Stack</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary text-xs px-3 py-2"
                      onClick={() => onPinTrailEntry(entry)}
                    >
                      Keep Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="book-page-empty-section">
            No notes, quotes, reflections, or linked-document highlights yet.
          </div>
        )}
      </div>
    </section>
  )
}

export default BookPageReadingTrailSection
