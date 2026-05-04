import React from 'react'
import { quoteCreatedAt, quoteText } from '../../utils/documentUtils'

function BookPageCapturedSections({
  book,
  quoteDraft,
  onQuoteDraftChange,
  onSubmitQuote,
  reflectionDraft,
  onReflectionDraftChange,
  onSubmitReflection,
  memoryTitleDraft,
  onMemoryTitleChange,
  memoryNoteDraft,
  onMemoryNoteChange,
  onSubmitMemory,
}) {
  return (
    <>
      <section className="book-page-section">
        <div className="book-page-section-head">
          <h2 className="book-page-section-title">Quotes</h2>
        </div>
        <div className="book-page-composer">
          <textarea
            className="book-page-textarea book-page-textarea-compact"
            value={quoteDraft}
            onChange={(event) => onQuoteDraftChange(event.target.value)}
            placeholder="Add a memorable quote."
          />
          <button type="button" className="btn-primary text-xs px-3 py-2" onClick={onSubmitQuote}>
            Save Quote
          </button>
        </div>
        <div className="book-page-stack">
          {book.quotes?.length > 0 ? (
            book.quotes.map((quote, index) => (
              <blockquote key={`${quoteText(quote)}-${index}`} className="book-page-quote">
                <p>{quoteText(quote)}</p>
                {quoteCreatedAt(quote) && (
                  <time>{new Date(quoteCreatedAt(quote)).toLocaleDateString()}</time>
                )}
              </blockquote>
            ))
          ) : (
            <div className="book-page-empty-section">No quotes saved yet.</div>
          )}
        </div>
      </section>

      <section className="book-page-section">
        <div className="book-page-section-head">
          <h2 className="book-page-section-title">Reflections</h2>
        </div>
        <div className="book-page-composer">
          <textarea
            className="book-page-textarea book-page-textarea-compact"
            value={reflectionDraft}
            onChange={(event) => onReflectionDraftChange(event.target.value)}
            placeholder="What changed in your thinking?"
          />
          <button type="button" className="btn-primary text-xs px-3 py-2" onClick={onSubmitReflection}>
            Save Reflection
          </button>
        </div>
        <div className="book-page-stack">
          {book.reflections?.length > 0 ? (
            book.reflections.map((reflection, index) => (
              <div key={`${reflection.date}-${index}`} className="book-page-reflection">
                <time className="book-page-reflection-date">
                  {new Date(reflection.date).toLocaleDateString()}
                </time>
                <p>{reflection.text}</p>
              </div>
            ))
          ) : (
            <div className="book-page-empty-section">No reflections recorded yet.</div>
          )}
        </div>
      </section>

      <section className="book-page-section">
        <h2 className="book-page-section-title">Reading Log</h2>
        <div className="book-page-stack">
          {book.readingLogs?.length > 0 ? (
            book.readingLogs
              .slice()
              .reverse()
              .map((log, index) => (
                <div key={`${log.date}-${index}`} className="book-page-log-entry">
                  <time>{new Date(log.date).toLocaleDateString()}</time>
                  <span>{log.pages} pages</span>
                </div>
              ))
          ) : (
            <div className="book-page-empty-section">No reading sessions logged yet.</div>
          )}
        </div>
      </section>

      <section className="book-page-section">
        <h2 className="book-page-section-title">Memories</h2>
        <div className="book-page-composer">
          <input
            type="text"
            className="input-field"
            value={memoryTitleDraft}
            onChange={(event) => onMemoryTitleChange(event.target.value)}
            placeholder="Memory title"
          />
          <textarea
            className="book-page-textarea"
            value={memoryNoteDraft}
            onChange={(event) => onMemoryNoteChange(event.target.value)}
            placeholder="What should future you remember about this book?"
          />
          <button type="button" className="btn-primary text-xs px-3 py-2" onClick={onSubmitMemory}>
            Save Memory
          </button>
        </div>
        <div className="book-page-stack">
          {book.memories?.length > 0 ? (
            book.memories.map((memory, index) => (
              <div key={`${memory.title || memory.note}-${index}`} className="book-page-memory">
                {memory.title && <h3>{memory.title}</h3>}
                {memory.note && <p>{memory.note}</p>}
              </div>
            ))
          ) : (
            <div className="book-page-empty-section">No memories attached yet.</div>
          )}
        </div>
      </section>
    </>
  )
}

export default BookPageCapturedSections
