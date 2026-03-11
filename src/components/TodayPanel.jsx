import { useMemo, useState, useEffect } from 'react'

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

  const selectedBook = books.find(book => book.id === selectedBookId)
  const hasBooks = books.length > 0

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

  return (
    <section className="today-panel">
      <div className="today-header">
        <div>
          <div className="today-eyebrow">Today</div>
          <h2 className="today-title">Daily Ritual</h2>
        </div>
        <div className="streak-pill">
          <span>{streak?.current || 0} day streak</span>
          <span className="streak-subtle">Best {streak?.best || 0}</span>
        </div>
      </div>

      {!hasBooks ? (
        <div className="today-empty">Add your first book to begin your ritual.</div>
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
                  onClick={() => selectedBook && onLogPages(selectedBook.id, pages)}
                >
                  Log
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => selectedBook && onLogPages(selectedBook.id, 10)}
                >
                  +10
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => selectedBook && onLogPages(selectedBook.id, 25)}
                >
                  +25
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
                placeholder="Capture a line that stayed with you..."
              />
            </label>
            <button
              className="btn-secondary"
              onClick={() => {
                if (!quote.trim() || !selectedBook) return
                onAddQuote(selectedBook.id, quote.trim())
                setQuote('')
              }}
            >
              Save Quote
            </button>
          </div>

          <div className="today-row">
            <label>
              Reflection
              <input
                type="text"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="One sentence to remember today."
              />
            </label>
            <button
              className="btn-secondary"
              onClick={() => {
                if (!reflection.trim() || !selectedBook) return
                onAddReflection(selectedBook.id, reflection.trim())
                setReflection('')
              }}
            >
              Save Reflection
            </button>
          </div>

          {selectedBook && selectedBook.pagesRead ? (
            <div className="today-footer">
              <span>{selectedBook.pagesRead} pages logged</span>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export default TodayPanel
