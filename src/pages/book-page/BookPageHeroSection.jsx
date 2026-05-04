import React from 'react'
import BookCoverArt from '../../components/BookCoverArt'
import StarRating from '../../components/StarRating'

function BookPageHeroSection({
  book,
  shelfNames,
  readingProgress,
  statusLabels,
  statusOptions,
  pagesDraft,
  onPagesDraftChange,
  onStatusChange,
  onRatingChange,
  onDateChange,
  onLogPages,
  onUndoLastPageLog,
  onOpenDetails,
  onRequestDelete,
}) {
  const hasReadingLogs = (book.readingLogs || []).length > 0

  return (
    <section className="book-page-card">
      <div className="book-page-hero">
        <div className="book-page-cover-column">
          <div className="book-page-cover">
            <BookCoverArt book={book} alt={book.title} variant="page" />
          </div>
        </div>

        <div className="book-page-header">
          <div className="book-page-kicker">Library Volume</div>
          <div className="book-page-title-row">
            <div>
              <h1 className="book-page-title">{book.title}</h1>
              <p className="book-page-author">by {book.author}</p>
            </div>
            <div className="book-page-header-actions">
              <button
                type="button"
                className="btn-secondary text-xs px-3 py-2"
                onClick={onOpenDetails}
              >
                Edit Library Details
              </button>
              <button
                type="button"
                className="btn-secondary text-xs px-3 py-2 book-page-danger"
                onClick={onRequestDelete}
              >
                Remove from Library
              </button>
            </div>
          </div>

          <div className="book-page-status-row">
            {book.status && (
              <span className="book-page-status" data-status={book.status}>
                {statusLabels[book.status] || book.status}
              </span>
            )}
            <div className="book-page-rating">
              <StarRating rating={book.rating} onRate={onRatingChange} size="lg" />
            </div>
          </div>

          <div className="book-page-meta">
            {book.pageCount && <span>{book.pageCount} pages</span>}
            {book.publishedDate && <span>Published {book.publishedDate}</span>}
            {book.isbn && <span>ISBN {book.isbn}</span>}
            {book.dateStarted && <span>Started {new Date(book.dateStarted).toLocaleDateString()}</span>}
            {book.dateFinished && <span>Finished {new Date(book.dateFinished).toLocaleDateString()}</span>}
          </div>

          {readingProgress !== null && (
            <div className="book-page-progress">
              <div className="book-page-progress-bar">
                <div className="book-page-progress-fill" style={{ width: `${readingProgress}%` }} />
              </div>
              <span className="book-page-progress-text">
                {readingProgress}% complete ({book.pagesRead} / {book.pageCount} pages)
              </span>
            </div>
          )}

          {shelfNames.length > 0 && (
            <div className="book-page-shelves">
              {shelfNames.map((name) => (
                <span key={name} className="book-page-shelf-tag">{name}</span>
              ))}
            </div>
          )}

          {book.tags?.length > 0 && (
            <div className="book-page-tags">
              {book.tags.map((tag) => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}
        </div>

        <aside className="book-page-quick-actions">
          <div className="book-page-panel">
            <div className="book-page-panel-title">Reading State</div>
            <label className="book-page-field">
              Status
              <select
                value={book.status || 'to-read'}
                onChange={(event) => onStatusChange(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="book-page-field-row">
              <label className="book-page-field">
                Started
                <input
                  type="date"
                  value={book.dateStarted || ''}
                  onChange={(event) => onDateChange('dateStarted', event.target.value)}
                />
              </label>
              <label className="book-page-field">
                Finished
                <input
                  type="date"
                  value={book.dateFinished || ''}
                  onChange={(event) => onDateChange('dateFinished', event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="book-page-panel">
            <div className="book-page-panel-title">Log Reading</div>
            <div className="book-page-pages-input">
              <input
                type="number"
                min="1"
                value={pagesDraft}
                onChange={(event) => onPagesDraftChange(event.target.value)}
                placeholder="Pages"
              />
              <button type="button" className="btn-primary text-xs px-3 py-2" onClick={() => onLogPages(pagesDraft)}>
                Save
              </button>
            </div>
            <div className="book-page-quick-buttons">
              {[10, 25, 50].map((pages) => (
                <button
                  key={pages}
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onLogPages(pages)}
                >
                  +{pages} pages
                </button>
              ))}
            </div>
            <div className="book-page-progress-note">
              {book.pagesRead
                ? `${book.pagesRead} pages logged so far.`
                : 'No reading sessions logged yet.'}
            </div>
            {hasReadingLogs && (
              <button
                type="button"
                className="btn-secondary text-xs px-3 py-2"
                onClick={onUndoLastPageLog}
              >
                Undo last log
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

export default BookPageHeroSection
