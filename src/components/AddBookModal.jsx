import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useBookSearch } from '../hooks/useBookSearch'
import { extractDominantColor } from '../utils/colorExtract'
import { isTauri } from '../utils/tauri'
import BulkImportMode from './add-book/BulkImportMode'
import ManualEntryMode from './add-book/ManualEntryMode'

const Icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
}

function AddBookModal({ onClose, onAddBook, onAddArticle, onMigrateExport }) {
  const [mode, setMode] = useState('search') // 'search', 'manual', 'bulk', 'article', 'migrate'
  const [searchQuery, setSearchQuery] = useState('')
  const [manualInitialTitle, setManualInitialTitle] = useState('')
  const { results, loading, error, searchBooks, clearResults } = useBookSearch()

  const [articleUrl, setArticleUrl] = useState('')
  const [articleBusy, setArticleBusy] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchBooks(searchQuery)
      } else {
        clearResults()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchBooks, clearResults])

  const handleSelectBook = async (book) => {
    const spineColor = await extractDominantColor(book.coverUrl)
    onAddBook({
      ...book,
      spineColor,
      shelfDetail: book.author || '',
      tags: book.tags || [],
    })
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content w-full max-w-xl"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#201819]/10">
          <h2 className="heading-display text-xl text-[#201819]">Add Books</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#201819]/5 transition-colors text-muted hover:text-[#201819]"
          >
            <span className="w-5 h-5">{Icons.close}</span>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-[#201819]/10">
          {[
            { id: 'search', label: 'Search' },
            { id: 'bulk', label: 'Bulk Import' },
            { id: 'manual', label: 'Manual' },
            { id: 'article', label: 'Article' },
            { id: 'migrate', label: 'Migrate' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                mode === tab.id
                  ? 'text-[#201819] border-b-2 border-[#201819]'
                  : 'text-muted hover:text-[#201819]'
              }`}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === 'search' && (
            <div>
              {/* Search Input */}
              <div className="relative mb-5">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted">
                  {Icons.search}
                </span>
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-11"
                  autoFocus
                />
                {loading && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <div className="loading-spinner" style={{ width: '18px', height: '18px' }} />
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-400 text-sm mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  Error searching books: {error}
                </div>
              )}

              {/* Results */}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {results.map((book) => (
                  <button
                    key={book.googleId}
                    onClick={() => handleSelectBook(book)}
                    className="w-full flex gap-4 p-3 rounded-lg transition-all duration-200 text-left group"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(32, 24, 25, 0.08)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 1)'
                      e.currentTarget.style.borderColor = 'rgba(32, 24, 25, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'
                      e.currentTarget.style.borderColor = 'rgba(32, 24, 25, 0.08)'
                    }}
                  >
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="w-12 h-16 object-cover rounded shadow-lg flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-16 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196, 184, 150, 0.1)' }}>
                        <span className="w-6 h-6 text-muted">{Icons.book}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#201819] truncate group-hover:text-[#b45309] transition-colors">{book.title}</h3>
                      <p className="text-sm text-muted truncate">{book.author}</p>
                      {book.pageCount && <p className="text-xs text-muted/60 mt-1">{book.pageCount} pages</p>}
                    </div>
                  </button>
                ))}

                {searchQuery.length >= 2 && !loading && results.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted mb-2">No books found for "{searchQuery}"</p>
                    <button
                      onClick={() => {
                        setMode('manual')
                        setManualInitialTitle(searchQuery)
                      }}
                      className="text-sm text-[#b45309] hover:underline"
                    >
                      Add manually instead
                    </button>
                  </div>
                )}

                {searchQuery.length < 2 && (
                  <div className="text-center py-10 text-muted">
                    Start typing to search for books...
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'bulk' && (
            <BulkImportMode onAddBook={onAddBook} />
          )}

          {mode === 'manual' && (
            <ManualEntryMode onAddBook={onAddBook} onClose={onClose} initialTitle={manualInitialTitle} />
          )}

          {mode === 'migrate' && (
            <div className="space-y-4">
              <div className="text-sm text-muted">
                Import a JSON export from your web library to seed this desktop library.
              </div>
              {!isTauri() ? (
                <div className="text-sm text-muted">
                  Migration is available in the desktop app only.
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    await onMigrateExport?.()
                    onClose()
                  }}
                >
                  Choose Export JSON
                </button>
              )}
            </div>
          )}

          {mode === 'article' && (
            <div className="space-y-4">
              <label className="block text-xs uppercase tracking-wider text-muted mb-2">Article URL</label>
              <input
                type="url"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="input-field"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!articleUrl.trim() || articleBusy}
                  onClick={async () => {
                    if (!articleUrl.trim()) return
                    setArticleBusy(true)
                    await onAddArticle?.(articleUrl.trim())
                    setArticleBusy(false)
                    setArticleUrl('')
                    onClose()
                  }}
                >
                  {articleBusy ? 'Saving...' : 'Save Article'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default AddBookModal
