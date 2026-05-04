import React from 'react'

function formatStudyDeskStatus(volume) {
  if (volume.status === 'complete' && volume.completedAt) {
    return `Session complete ${new Date(volume.completedAt).toLocaleDateString()}`
  }
  if (volume.status === 'active' && volume.startedAt) {
    return `Session active since ${new Date(volume.startedAt).toLocaleDateString()}`
  }
  return 'Ready to start'
}

function StudyDeskSection({ studyVolumes, onOpenBook }) {
  if (studyVolumes.length === 0) return null

  return (
    <section className="study-desk">
      <div className="study-desk-header">
        <div>
          <div className="study-desk-eyebrow">Study Desk</div>
          <h3 className="study-desk-title">Reopen the books where you have pinned what matters.</h3>
        </div>
      </div>
      <div className="study-desk-grid">
        {studyVolumes.map(({ book, count, status, completedCount, remainingCount, startedAt, completedAt, reviewedThisSessionCount, latestEntry, latestSavedAt }) => (
          <button
            key={book.id}
            type="button"
            className={`study-desk-card study-desk-card-${status}`}
            onClick={() => onOpenBook?.(book.id)}
          >
            <div className="study-desk-card-top">
              <span className="study-desk-card-count">{count} saved</span>
              <span className="study-desk-card-date">
                {new Date(latestSavedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="study-desk-card-title">{book.title}</div>
            <div className="study-desk-card-meta">
              {latestEntry?.format === 'book' ? 'Pinned from the volume itself' : `Pinned from ${latestEntry?.itemTitle}`}
            </div>
            <div className="study-desk-card-session">
              {formatStudyDeskStatus({ status, startedAt, completedAt })}
            </div>
            <div className="study-desk-card-status">
              <span>{remainingCount} active</span>
              <span>{completedCount} complete</span>
              {startedAt && <span>{reviewedThisSessionCount} reviewed</span>}
            </div>
            {(latestEntry?.note || latestEntry?.text) && (
              <div className="study-desk-card-preview">
                {latestEntry.note || latestEntry.text}
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

export default StudyDeskSection
