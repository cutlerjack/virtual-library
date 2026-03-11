import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useBookSearch } from '../hooks/useBookSearch'
import { extractDominantColor } from '../utils/colorExtract'
import { normalizeIsbn } from '../utils/storage'
import { isTauri } from '../utils/tauri'

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
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
}

function AddBookModal({ onClose, onAddBook, onAddArticle, onMigrateExport }) {
  const [mode, setMode] = useState('search') // 'search', 'manual', 'bulk', 'article', 'migrate'
  const [searchQuery, setSearchQuery] = useState('')
  const { results, loading, error, searchBooks, clearResults } = useBookSearch()

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    title: '',
    author: '',
    coverUrl: '',
    isbn: '',
    pageCount: '',
  })

  // Bulk upload state
  const [bulkInput, setBulkInput] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResults, setBulkResults] = useState([]) // {title, status, book, editOpen, editQuery, editResults, editLoading}
  const [bulkProgress, setBulkProgress] = useState(0)

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

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    const spineColor = manualForm.coverUrl
      ? await extractDominantColor(manualForm.coverUrl)
      : null

    onAddBook({
      title: manualForm.title,
      author: manualForm.author,
      coverUrl: manualForm.coverUrl || null,
      isbn: manualForm.isbn ? normalizeIsbn(manualForm.isbn) : null,
      pageCount: manualForm.pageCount ? parseInt(manualForm.pageCount) : null,
      spineColor,
      shelfDetail: manualForm.author || '',
    })
  }

  // Bulk processing
  const processBulkList = async () => {
    const titles = bulkInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (titles.length === 0) return

    setBulkProcessing(true)
    setBulkResults(titles.map(title => ({
      title,
      status: 'pending',
      book: null,
      editOpen: false,
      editQuery: title,
      editResults: [],
      editLoading: false,
    })))
    setBulkProgress(0)

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i]

      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=1`
        )
        const data = await response.json()

        if (data.items && data.items.length > 0) {
          const item = data.items[0]
          const book = {
            googleId: item.id,
            title: item.volumeInfo.title || title,
            author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
            coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
            isbn: item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || null,
            pageCount: item.volumeInfo.pageCount || null,
            tags: item.volumeInfo.categories || [],
            publishedDate: item.volumeInfo.publishedDate || null,
            shelfDetail: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
          }

          setBulkResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'found', book } : r
          ))
        } else {
          setBulkResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'not_found' } : r
          ))
        }
      } catch {
        setBulkResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'not_found' } : r
        ))
      }

      setBulkProgress(((i + 1) / titles.length) * 100)

      // Small delay to avoid rate limiting
      if (i < titles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    setBulkProcessing(false)
  }

  const runBulkEditSearch = async (index) => {
    const target = bulkResults[index]
    if (!target?.editQuery?.trim()) return

    setBulkResults(prev => prev.map((r, idx) =>
      idx === index ? { ...r, editLoading: true, editResults: [] } : r
    ))

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(target.editQuery)}&maxResults=5`
      )
      const data = await response.json()
      const results = (data.items || []).map(item => ({
        googleId: item.id,
        title: item.volumeInfo.title || target.editQuery,
        author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
        coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        isbn: item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || null,
        pageCount: item.volumeInfo.pageCount || null,
        tags: item.volumeInfo.categories || [],
        publishedDate: item.volumeInfo.publishedDate || null,
        shelfDetail: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
      }))
      setBulkResults(prev => prev.map((r, idx) =>
        idx === index ? { ...r, editResults: results, editLoading: false } : r
      ))
    } catch {
      setBulkResults(prev => prev.map((r, idx) =>
        idx === index ? { ...r, editResults: [], editLoading: false } : r
      ))
    }
  }

  const applyBulkEditResult = (index, book) => {
    setBulkResults(prev => prev.map((r, idx) =>
      idx === index
        ? { ...r, status: 'found', book, editOpen: false, editResults: [] }
        : r
    ))
  }

  const addSelectedBulkBooks = async () => {
    const booksToAdd = bulkResults.filter(r => r.status === 'found' && r.book)

    for (const result of booksToAdd) {
      const spineColor = await extractDominantColor(result.book.coverUrl)
      onAddBook({
        ...result.book,
        spineColor,
        tags: result.book.tags || [],
      })
    }
  }

  const foundCount = bulkResults.filter(r => r.status === 'found').length
  const notFoundCount = bulkResults.filter(r => r.status === 'not_found').length

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
                        setManualForm(prev => ({ ...prev, title: searchQuery }))
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
            <div>
              {bulkResults.length === 0 ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-6 h-6 text-[#b45309]">{Icons.upload}</span>
                    <div>
                      <h3 className="font-medium text-[#201819]">Import Multiple Books</h3>
                      <p className="text-sm text-muted">Paste a list of book titles, one per line</p>
                    </div>
                  </div>

                  <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={"The Great Gatsby\n1984\nTo Kill a Mockingbird\nPride and Prejudice\n..."}
                    className="input-field h-48 resize-none font-mono text-sm"
                  />

                  <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-muted">
                      {bulkInput.split('\n').filter(l => l.trim()).length} titles detected
                    </p>
                    <button
                      onClick={processBulkList}
                      disabled={bulkInput.trim().length === 0}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Search All
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Progress bar */}
                  {bulkProcessing && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted">Searching...</span>
                        <span className="text-[#201819]">{Math.round(bulkProgress)}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(32, 24, 25, 0.12)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${bulkProgress}%`,
                            background: 'linear-gradient(90deg, #b45309 0%, #d97706 100%)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Results summary */}
                  {!bulkProcessing && (
                    <div className="flex gap-4 mb-4 p-3 rounded-lg" style={{ background: 'rgba(32, 24, 25, 0.06)' }}>
                      <div className="text-center flex-1">
                        <div className="text-2xl font-semibold text-emerald-400">{foundCount}</div>
                        <div className="text-xs text-muted">Found</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-2xl font-semibold text-red-400">{notFoundCount}</div>
                        <div className="text-xs text-muted">Not Found</div>
                      </div>
                    </div>
                  )}

                  {/* Results list */}
                  <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
                    {bulkResults.map((result, idx) => (
                      <div key={idx} className="space-y-2">
                        <div
                          className="flex items-center gap-3 p-2 rounded"
                          style={{ background: 'rgba(32, 24, 25, 0.05)' }}
                        >
                          <span className={`w-5 h-5 flex-shrink-0 ${
                            result.status === 'found' ? 'text-emerald-400' :
                            result.status === 'not_found' ? 'text-red-400' :
                            'text-muted'
                          }`}>
                            {result.status === 'found' ? Icons.check :
                             result.status === 'not_found' ? Icons.x :
                             <div className="loading-spinner" style={{ width: 16, height: 16 }} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${result.status === 'found' ? 'text-[#201819]' : 'text-muted'}`}>
                              {result.book?.title || result.title}
                            </p>
                            {result.book?.author && (
                              <p className="text-xs text-muted truncate">{result.book.author}</p>
                            )}
                          </div>
                          {result.book?.coverUrl && (
                            <img src={result.book.coverUrl} alt="" className="w-8 h-10 object-cover rounded" />
                          )}
                          {(result.status === 'found' || result.status === 'not_found') && (
                            <button
                              type="button"
                              className="btn-secondary text-xs px-3 py-2"
                              onClick={() => setBulkResults(prev => prev.map((r, rIdx) =>
                                rIdx === idx ? { ...r, editOpen: !r.editOpen } : r
                              ))}
                            >
                              {result.editOpen ? 'Close' : 'Change'}
                            </button>
                          )}
                        </div>

                        {result.editOpen && (
                          <div className="rounded-lg border border-white/10 p-3 space-y-3" style={{ background: 'rgba(32, 24, 25, 0.04)' }}>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={result.editQuery}
                                onChange={(e) => setBulkResults(prev => prev.map((r, rIdx) =>
                                  rIdx === idx ? { ...r, editQuery: e.target.value } : r
                                ))}
                                className="input-field text-sm py-2 flex-1"
                                placeholder="Search another title or author..."
                              />
                              <button
                                type="button"
                                className="btn-secondary text-xs px-3 py-2"
                                onClick={() => runBulkEditSearch(idx)}
                                disabled={result.editLoading}
                              >
                                {result.editLoading ? 'Searching...' : 'Search'}
                              </button>
                            </div>
                            {result.editResults.length === 0 && !result.editLoading && (
                              <p className="text-xs text-muted">No alternate results yet. Try a different query.</p>
                            )}
                            <div className="space-y-2">
                              {result.editResults.map((book) => (
                                <div
                                  key={book.googleId}
                                  className="flex items-center gap-3 p-2 rounded"
                                  style={{ background: 'rgba(32, 24, 25, 0.05)' }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[#201819] truncate">{book.title}</p>
                                    <p className="text-xs text-muted truncate">{book.author}</p>
                                  </div>
                                  {book.coverUrl && (
                                    <img src={book.coverUrl} alt="" className="w-8 h-10 object-cover rounded" />
                                  )}
                                  <button
                                    type="button"
                                    className="btn-secondary text-xs px-3 py-2"
                                    onClick={() => applyBulkEditResult(idx, book)}
                                  >
                                    Use
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between gap-3">
                    <button
                      onClick={() => {
                        setBulkResults([])
                        setBulkInput('')
                      }}
                      className="btn-secondary"
                    >
                      Start Over
                    </button>
                    {!bulkProcessing && foundCount > 0 && (
                      <button onClick={addSelectedBulkBooks} className="btn-primary">
                        Add {foundCount} Book{foundCount !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">Title</label>
                <input
                  type="text"
                  value={manualForm.title}
                  onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">Author</label>
                <input
                  type="text"
                  value={manualForm.author}
                  onChange={(e) => setManualForm(prev => ({ ...prev, author: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">Cover Image URL</label>
                <input
                  type="url"
                  value={manualForm.coverUrl}
                  onChange={(e) => setManualForm(prev => ({ ...prev, coverUrl: e.target.value }))}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">ISBN</label>
                <input
                  type="text"
                  value={manualForm.isbn}
                  onChange={(e) => setManualForm(prev => ({ ...prev, isbn: normalizeIsbn(e.target.value) }))}
                  className="input-field"
                  placeholder="978..."
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">Page Count</label>
                <input
                  type="number"
                  value={manualForm.pageCount}
                  onChange={(e) => setManualForm(prev => ({ ...prev, pageCount: e.target.value }))}
                  className="input-field"
                  min="1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Book
                </button>
              </div>
            </form>
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
