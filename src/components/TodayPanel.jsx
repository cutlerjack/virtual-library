import React, { useMemo, useState, useEffect } from 'react'

function TodayPanel({ books, streak, onLogPages, onAddQuote, onAddReflection }) {
  const defaultBookId = useMemo(() => {
    const touched = [...books]
      .filter(book => book.lastTouched)
      .sort((a, b) => new Date(b.lastTouched) - new Date(a.lastTouched))[0]
    return touched?.id || books[0]?.id || ''
  }, [books])

  const [selectedBookId, setSelectedBookId] = useState(defaultBookId)
  const [pages, setPages] = useState(10)
  const [quote, setQuote] = useState('')
  const [reflection, setReflection] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const selectedBook = books.find(book => book.id === selectedBookId)
  const hasBooks = books.length > 0
  const remainingPages = selectedBook?.pageCount
    ? Math.max((selectedBook.pageCount || 0) - (selectedBook.pagesRead || 0), 0)
    : null
  const canLogPages = Boolean(selectedBook) && (remainingPages === null || remainingPages > 0)

  useEffect(() => {
    if (books.length === 0) {
      if (selectedBookId) setSelectedBookId('')
      return
    }
    const exists = books.some(book => book.id === selectedBookId)
    if (!selectedBookId || !exists) {
      setSelectedBookId(defaultBookId)
    }
  }, [books, defaultBookId, selectedBookId])

  const recordPages = (value) => {
    if (!selectedBook) return
    const requestedPages = Number(value)
    if (!requestedPages || requestedPages <= 0) return
    const pagesToLog = remainingPages === null
      ? requestedPages
      : Math.min(requestedPages, remainingPages)
    if (pagesToLog <= 0) {
      setStatusMessage('This book is already fully logged.')
      return
    }
    onLogPages(selectedBook.id, pagesToLog)
    setStatusMessage(`Logged ${pagesToLog} ${pagesToLog === 1 ? 'page' : 'pages'}.`)
  }

  return (
    <section className="today-panel">
      <div className="today-header">
        <div>
          <div className="today-eyebrow">Today</div>
          <h2 className="today-title">Reading Log</h2>
        </div>
        <div className="streak-pill">
          <span>Current streak: {streak?.current || 0}</span>
          <span className="streak-subtle">Best streak: {streak?.best || 0}</span>
        </div>
      </div>

      {!hasBooks ? (
        <div className="today-empty">Add your first book to start a reading log.</div>
      ) : (
        <>
          <div className="today-row">
            <label>
              Book
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
              >
                {books.map(book => (
                  <option key={book.id} value={book.id}>{book.title}</option>
                ))}
              </select>
            </label>
            <label>
              Pages
              <div className="today-pages">
                <input
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(parseInt(e.target.value, 10) || 1)}
                />
                <button
                  className="btn-secondary"
                  onClick={() => recordPages(pages)}
                  disabled={!canLogPages}
                >
                  Record
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => recordPages(10)}
                  disabled={!canLogPages}
                >
                  Add 10
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => recordPages(25)}
                  disabled={!canLogPages}
                >
                  Add 25
                </button>
              </div>
            </label>
          </div>

          <div className="today-row">
            <label>
              Quote
              <input
                type="text"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Add a line worth keeping..."
              />
            </label>
            <button
              className="btn-secondary"
              onClick={() => {
                if (!quote.trim() || !selectedBook) return
                onAddQuote(selectedBook.id, quote.trim())
                setQuote('')
                setStatusMessage('Saved excerpt.')
              }}
            >
              Save Excerpt
            </button>
          </div>

          <div className="today-row">
            <label>
              Reflection
              <input
                type="text"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="One note to carry forward."
              />
            </label>
            <button
              className="btn-secondary"
              onClick={() => {
                if (!reflection.trim() || !selectedBook) return
                onAddReflection(selectedBook.id, reflection.trim())
                setReflection('')
                setStatusMessage('Saved note.')
              }}
            >
              Save Note
            </button>
          </div>

          {statusMessage && (
            <div className="today-status" role="status">
              {statusMessage}
            </div>
          )}

          {selectedBook && selectedBook.pagesRead ? (
            <div className="today-footer">
              <span>{selectedBook.pagesRead} pages recorded</span>
            </div>
          ) : null}
          {selectedBook && remainingPages === 0 ? (
            <div className="today-footer">
              <span>This book is fully logged.</span>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export default TodayPanel
