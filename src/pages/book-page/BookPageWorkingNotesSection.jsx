import React from 'react'

function BookPageWorkingNotesSection({
  notesDraft,
  savedNotes,
  onNotesChange,
  onSaveNotes,
}) {
  return (
    <section className="book-page-section book-page-section-wide">
      <div className="book-page-section-head">
        <h2 className="book-page-section-title">Working Notes</h2>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onSaveNotes}
          disabled={notesDraft === savedNotes}
        >
          Save Notes
        </button>
      </div>
      <textarea
        className="book-page-textarea"
        value={notesDraft}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Capture what matters about this book."
      />
    </section>
  )
}

export default BookPageWorkingNotesSection
