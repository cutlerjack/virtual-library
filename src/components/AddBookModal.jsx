import React, { useState, useEffect, useRef } from 'react'
import { useBookSearch } from '../hooks/useBookSearch'
import { pickBestCoverUrl } from '../utils/coverImages'
import { isTauri } from '../utils/tauri'
import DialogShell from './DialogShell'
import BulkImportMode from './add-book/BulkImportMode'
import { extractAddBookSpineColor } from './add-book/coverColor'
import ManualEntryMode from './add-book/ManualEntryMode'

const Icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
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
  const [mode, setMode] = useState('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [manualInitialTitle, setManualInitialTitle] = useState('')
  const { results, loading, error, settledQuery, searchBooks, clearResults } = useBookSearch()
  const desktopOnly = isTauri()
  const desktopToolsDisabled = !desktopOnly
  const normalizedSearchQuery = searchQuery.trim()
  const searchHasSettledForQuery = normalizedSearchQuery.length >= 2 && settledQuery === normalizedSearchQuery

  const [articleUrl, setArticleUrl] = useState('')
  const [articleBusy, setArticleBusy] = useState(false)
  const [articleError, setArticleError] = useState('')
  const [migrationBusy, setMigrationBusy] = useState(false)
  const [migrationError, setMigrationError] = useState('')
  const [addingBookId, setAddingBookId] = useState(null)
  const addingBookRef = useRef(false)
  const mountedRef = useRef(true)

  const primaryModes = [
    { id: 'search', label: 'Search' },
    { id: 'bulk', label: 'Bulk Import' },
    { id: 'manual', label: 'Manual' },
  ]

  const desktopModes = [
    { id: 'article', label: 'Article' },
    { id: 'migrate', label: 'Migrate' },
  ]

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

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  const handleSelectBook = async (book) => {
    if (addingBookRef.current) return
    const bookKey = book.googleId || book.id || book.title
    addingBookRef.current = true
    setAddingBookId(bookKey)
    const coverUrl = pickBestCoverUrl(book.largeCoverUrl, book.coverUrl)
    try {
      const spineColor = await extractAddBookSpineColor(coverUrl)
      await Promise.resolve(onAddBook({
        ...book,
        coverUrl,
        spineColor,
        shelfDetail: book.author || '',
        tags: book.tags || [],
      }))
    } finally {
      addingBookRef.current = false
      if (mountedRef.current) {
        setAddingBookId(null)
      }
    }
  }

  return (
    <DialogShell
      open
      title="Add to Library"
      onClose={onClose}
      closeDisabled={articleBusy || migrationBusy || Boolean(addingBookId)}
      size="lg"
      panelClassName="add-book-dialog"
      bodyClassName="add-book-dialog-body"
    >
      <div className="p-5 space-y-5">
        <p className="text-sm text-muted">
          Search is the fastest path. Use bulk import for a reading list, manual entry when search misses, and the desktop tools for article capture or migration.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Library modes</div>
            <div className="text-xs text-muted">Best for books already in mind</div>
          </div>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="tablist"
            aria-label="Library add modes"
          >
            {primaryModes.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`add-book-tab-${tab.id}`}
                aria-selected={mode === tab.id}
                aria-controls={`add-book-panel-${tab.id}`}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                  mode === tab.id
                    ? 'border-[#201819]/25 bg-white text-[#201819] shadow-sm'
                    : 'border-transparent bg-white/40 text-muted hover:border-[#201819]/10 hover:text-[#201819]'
                }`}
                onClick={() => setMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted">Desktop tools</div>
              <p className="mt-1 text-sm text-muted">
                Capture web articles and bring in a saved export from the desktop app.
              </p>
            </div>
            {!desktopOnly && (
              <span className="rounded-full border border-[#201819]/10 bg-white/70 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                Desktop only
              </span>
            )}
          </div>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            role="tablist"
            aria-label="Desktop add modes"
          >
            {desktopModes.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`add-book-tab-${tab.id}`}
                aria-selected={mode === tab.id}
                aria-disabled={desktopToolsDisabled}
                aria-controls={`add-book-panel-${tab.id}`}
                disabled={desktopToolsDisabled}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                  mode === tab.id
                    ? 'border-[#201819]/25 bg-white text-[#201819] shadow-sm'
                    : desktopToolsDisabled
                      ? 'border-transparent bg-white/30 text-muted/60'
                    : 'border-transparent bg-white/40 text-muted hover:border-[#201819]/10 hover:text-[#201819]'
                }`}
                title={desktopToolsDisabled ? `${tab.label} is available in the desktop app only.` : undefined}
                onClick={() => {
                  if (!desktopToolsDisabled) setMode(tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {desktopToolsDisabled && (
            <div className="rounded-xl border border-[#201819]/10 bg-white/60 p-3 text-sm text-muted">
              Article capture and migration are available only in the desktop app.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#201819]/10 bg-white/60 p-4 sm:p-5">
          {mode === 'search' && (
            <section
              id="add-book-panel-search"
              role="tabpanel"
              aria-labelledby="add-book-tab-search"
              className="space-y-4"
            >
              <p className="text-sm text-muted">
                Search by title or author, then pick the best match.
              </p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted">
                  {Icons.search}
                </span>
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  aria-label="Search for a book by title or author"
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
                <div className="text-sm p-3 rounded-lg bg-white/70 border border-[#201819]/10 text-muted">
                  Search is unavailable right now. You can still add this title manually.
                  <div className="mt-2 text-xs text-muted/70">{error}</div>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto space-y-2">
                {results.map((book) => (
                  <button
                    key={book.googleId}
                    onClick={() => handleSelectBook(book)}
                    disabled={Boolean(addingBookId)}
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
                      <img
                        src={book.coverUrl}
                        alt={`Cover of ${book.title}`}
                        className="w-12 h-16 object-cover rounded shadow-lg flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-16 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(196, 184, 150, 0.1)' }}
                      >
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

                {searchHasSettledForQuery && !loading && results.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted mb-2">No books found for "{normalizedSearchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('manual')
                        setManualInitialTitle(normalizedSearchQuery)
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
            </section>
          )}

          {mode === 'bulk' && (
            <section
              id="add-book-panel-bulk"
              role="tabpanel"
              aria-labelledby="add-book-tab-bulk"
              className="space-y-4"
            >
              <BulkImportMode onAddBook={onAddBook} onComplete={onClose} />
            </section>
          )}

          {mode === 'manual' && (
            <section
              id="add-book-panel-manual"
              role="tabpanel"
              aria-labelledby="add-book-tab-manual"
              className="space-y-4"
            >
              <ManualEntryMode onAddBook={onAddBook} onClose={onClose} initialTitle={manualInitialTitle} />
            </section>
          )}

          {mode === 'migrate' && (
            <section
              id="add-book-panel-migrate"
              role="tabpanel"
              aria-labelledby="add-book-tab-migrate"
              className="space-y-4"
            >
              <div className="text-sm text-muted">
                Import a JSON export from your web library to seed this desktop library.
              </div>
              {!desktopOnly ? (
                <div className="rounded-xl border border-[#201819]/10 bg-white/70 p-3 text-sm text-muted">
                  Migration is available in the desktop app only. Open the desktop build when you want to bring an exported library across.
                </div>
              ) : (
                <div className="space-y-3">
                  {migrationError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                      {migrationError}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={migrationBusy}
                    onClick={async () => {
                      setMigrationBusy(true)
                      setMigrationError('')
                      try {
                        if (!onMigrateExport) {
                          setMigrationError('Migration is not available right now.')
                          return
                        }
                        const migrated = await onMigrateExport()
                        if (migrated !== true) {
                          setMigrationError('Migration did not complete. Choose a valid export JSON.')
                          return
                        }
                        onClose()
                      } catch (error) {
                        const detail = error?.message ? ` ${error.message}` : ''
                        if (mountedRef.current) {
                          setMigrationError(`Migration failed.${detail}`)
                        }
                      } finally {
                        if (mountedRef.current) {
                          setMigrationBusy(false)
                        }
                      }
                    }}
                  >
                    {migrationBusy ? 'Importing...' : 'Choose Export JSON'}
                  </button>
                </div>
              )}
            </section>
          )}

          {mode === 'article' && (
            <section
              id="add-book-panel-article"
              role="tabpanel"
              aria-labelledby="add-book-tab-article"
              className="space-y-4"
            >
              <div className="rounded-xl border border-[#201819]/10 bg-white/70 p-3 text-sm text-muted">
                {desktopOnly
                  ? 'Paste a URL here to capture an article into your library.'
                  : 'Article capture is available only in the desktop app. Open the desktop build to save a web article into this library.'}
              </div>
              <label htmlFor="article-url-input" className="block text-xs uppercase tracking-wider text-muted mb-2">
                Article URL
              </label>
              <input
                id="article-url-input"
                type="url"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="input-field"
                disabled={!desktopOnly}
              />
              {articleError && (
                <div className="text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  {articleError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary" disabled={articleBusy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!desktopOnly || !articleUrl.trim() || articleBusy}
                  onClick={async () => {
                    if (!articleUrl.trim()) return
                    setArticleBusy(true)
                    setArticleError('')
                    try {
                      await onAddArticle?.(articleUrl.trim())
                      if (mountedRef.current) {
                        setArticleUrl('')
                      }
                      onClose()
                    } catch (error) {
                      if (mountedRef.current) {
                        setArticleError(error?.message || 'Unable to save that article.')
                      }
                    } finally {
                      if (mountedRef.current) {
                        setArticleBusy(false)
                      }
                    }
                  }}
                >
                  {articleBusy ? 'Saving...' : 'Save Article'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </DialogShell>
  )
}

export default AddBookModal
