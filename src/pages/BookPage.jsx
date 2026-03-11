import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import StarRating from '../components/StarRating'
import { quoteText } from '../utils/documentUtils'

const STATUS_LABELS = {
  'to-read': 'To Read',
  reading: 'Reading',
  read: 'Read',
  dnf: 'Did Not Finish',
}

function BookPage({ books, shelves, allTags, onUpdate, onDelete, onLogPages, onAddQuote, onAddReflection }) {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId])

  if (!book) {
    return (
      <div className="book-page-empty">
        <h2>Book not found</h2>
        <p>This book may have been removed from your library.</p>
        <Link to="/" className="btn-secondary">Back to Library</Link>
      </div>
    )
  }

  const shelfNames = (book.shelves || [])
    .map((id) => shelves.find((s) => s.id === id)?.name)
    .filter(Boolean)

  const readingProgress = book.pagesRead && book.pageCount
    ? Math.round((book.pagesRead / book.pageCount) * 100)
    : null

  return (
    <div className="book-page">
      <nav className="book-page-nav">
        <Link to="/" className="book-page-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Library
        </Link>
      </nav>

      <div className="book-page-hero">
        {book.coverUrl && (
          <div className="book-page-cover">
            <img src={book.coverUrl} alt={book.title} />
          </div>
        )}

        <div className="book-page-header">
          <h1 className="book-page-title">{book.title}</h1>
          <p className="book-page-author">by {book.author}</p>

          {book.rating > 0 && (
            <div className="book-page-rating">
              <StarRating rating={book.rating} readonly />
            </div>
          )}

          {book.status && (
            <span className="book-page-status" data-status={book.status}>
              {STATUS_LABELS[book.status] || book.status}
            </span>
          )}

          <div className="book-page-meta">
            {book.pageCount && (
              <span>{book.pageCount} pages</span>
            )}
            {book.publishedDate && (
              <span>Published {book.publishedDate}</span>
            )}
            {book.isbn && (
              <span>ISBN {book.isbn}</span>
            )}
            {book.dateStarted && (
              <span>Started {new Date(book.dateStarted).toLocaleDateString()}</span>
            )}
            {book.dateFinished && (
              <span>Finished {new Date(book.dateFinished).toLocaleDateString()}</span>
            )}
          </div>

          {readingProgress !== null && (
            <div className="book-page-progress">
              <div className="book-page-progress-bar">
                <div className="book-page-progress-fill" style={{ width: `${readingProgress}%` }} />
              </div>
              <span className="book-page-progress-text">{readingProgress}% ({book.pagesRead} / {book.pageCount} pages)</span>
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
      </div>

      {book.notes && (
        <section className="book-page-section">
          <h2 className="book-page-section-title">Notes</h2>
          <div className="book-page-notes">{book.notes}</div>
        </section>
      )}

      {book.quotes?.length > 0 && (
        <section className="book-page-section">
          <h2 className="book-page-section-title">Quotes</h2>
          <div className="book-page-quotes">
            {book.quotes.map((quote, i) => (
              <blockquote key={i} className="book-page-quote">
                {quoteText(quote)}
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {book.reflections?.length > 0 && (
        <section className="book-page-section">
          <h2 className="book-page-section-title">Reflections</h2>
          <div className="book-page-reflections">
            {book.reflections.map((r, i) => (
              <div key={i} className="book-page-reflection">
                <time className="book-page-reflection-date">
                  {new Date(r.date).toLocaleDateString()}
                </time>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {book.readingLogs?.length > 0 && (
        <section className="book-page-section">
          <h2 className="book-page-section-title">Reading Log</h2>
          <div className="book-page-reading-log">
            {book.readingLogs.map((log, i) => (
              <div key={i} className="book-page-log-entry">
                <time>{new Date(log.date).toLocaleDateString()}</time>
                <span>{log.pages} pages</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {book.memories?.length > 0 && (
        <section className="book-page-section">
          <h2 className="book-page-section-title">Memories</h2>
          <div className="book-page-memories">
            {book.memories.map((m, i) => (
              <div key={i} className="book-page-memory">
                {m.title && <h3>{m.title}</h3>}
                {m.note && <p>{m.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default BookPage
