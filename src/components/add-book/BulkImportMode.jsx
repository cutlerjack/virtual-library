import { useState, useCallback } from 'react'
import { extractDominantColor } from '../../utils/colorExtract'

const Icons = {
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

export default function BulkImportMode({ onAddBook }) {
  const [bulkInput, setBulkInput] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResults, setBulkResults] = useState([])
  const [bulkProgress, setBulkProgress] = useState(0)

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
  )
}
