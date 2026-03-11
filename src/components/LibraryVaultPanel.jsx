import { useMemo, useState } from 'react'
import { isTauri } from '../utils/tauri'

function LibraryVaultPanel({ libraryPath, documents, onImport, onReadDocument, vaultError, lastRescanAt }) {
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [sortMode, setSortMode] = useState('recent')

  const handleImport = async () => {
    setBusy(true)
    await onImport?.()
    setBusy(false)
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredDocuments = useMemo(() => (
    documents.filter((doc) => {
      const matchesQuery = !normalizedQuery
        || doc.title?.toLowerCase().includes(normalizedQuery)
        || doc.originalName?.toLowerCase().includes(normalizedQuery)
      if (!matchesQuery) return false
      if (filter === 'all') return true
      return doc.type === filter
    })
  ), [documents, filter, normalizedQuery])

  const sortedDocuments = useMemo(() => {
    const list = [...filteredDocuments]
    if (sortMode === 'title') {
      return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    }
    if (sortMode === 'progress') {
      const progressOf = (doc) => {
        if (doc.type === 'pdf' && doc.pageCount) {
          return (doc.lastPage || 0) / doc.pageCount
        }
        if (typeof doc.progressPercent === 'number') {
          return doc.progressPercent / 100
        }
        return 0
      }
      return list.sort((a, b) => progressOf(b) - progressOf(a))
    }
    return list.sort((a, b) => {
      const aTime = new Date(a.lastOpened || a.addedAt || 0).getTime()
      const bTime = new Date(b.lastOpened || b.addedAt || 0).getTime()
      return bTime - aTime
    })
  }, [filteredDocuments, sortMode])

  const recentDocuments = [...documents]
    .filter((doc) => doc.lastOpened)
    .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
    .slice(0, 4)

  const canRead = (doc) => doc.fileStatus !== 'missing'
    && (doc.type === 'pdf' || doc.type === 'epub' || doc.type === 'article')
  const statusInfo = (doc) => {
    if (doc.fileStatus === 'missing') {
      return { label: 'Missing', className: 'reading-room-status reading-room-status-missing' }
    }
    if (doc.fileStatus === 'duplicate') {
      return { label: 'Duplicate', className: 'reading-room-status reading-room-status-duplicate' }
    }
    if (doc.scanned) {
      return { label: 'Scanned', className: 'reading-room-status reading-room-status-scanned' }
    }
    return null
  }
  const getProgressValue = (doc) => {
    if (doc.type === 'pdf' && doc.pageCount) {
      return Math.min(100, Math.round(((doc.lastPage || 0) / doc.pageCount) * 100))
    }
    if (typeof doc.progressPercent === 'number') {
      return Math.min(100, Math.max(0, Math.round(doc.progressPercent)))
    }
    return null
  }

  return (
    <section className="reading-room">
      <div className="reading-room-header">
        <div>
          <div className="reading-room-eyebrow">Reading Room</div>
          <h3 className="reading-room-title">Your offline desk for PDFs and articles.</h3>
          <p className="reading-room-subtitle">
            Import documents to read them inside the library without interrupting your shelves.
          </p>
        </div>
        <div className="reading-room-actions">
          <button className="btn-primary text-xs px-3 py-2" onClick={handleImport} disabled={busy || !isTauri()}>
            {busy ? 'Importing...' : 'Import Files'}
          </button>
        </div>
      </div>

      {!isTauri() && (
        <div className="reading-room-alert">
          The desktop vault is available in the Tauri app. Run the desktop build to import files.
        </div>
      )}

      {vaultError && (
        <div className="reading-room-alert">
          {vaultError}
        </div>
      )}

      {libraryPath && (
        <div className="reading-room-path">
          <span>Library folder</span>
          <span className="reading-room-path-value">{libraryPath}</span>
        </div>
      )}
      <div className="reading-room-path">
        <span>Last scan</span>
        <span className="reading-room-path-value">
          {lastRescanAt ? new Date(lastRescanAt).toLocaleString() : 'Never'}
        </span>
      </div>

      <div className="reading-room-toolbar">
        <div className="reading-room-search">
          <span>Search</span>
          <input
            type="search"
            placeholder="Search titles or filenames"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="reading-room-sort">
          <span>Sort</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="recent">Recent</option>
            <option value="title">Title</option>
            <option value="progress">Progress</option>
          </select>
        </div>
        <div className="reading-room-filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'epub', label: 'EPUBs' },
            { id: 'article', label: 'Articles' },
            { id: 'file', label: 'Other' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={`reading-room-filter ${filter === option.id ? 'active' : ''}`}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="reading-room-view-toggle">
          <button
            type="button"
            className={`reading-room-filter ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            className={`reading-room-filter ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
      </div>
      <div className="reading-room-results">
        Showing {sortedDocuments.length} of {documents.length} documents
      </div>

      {recentDocuments.length > 0 && (
        <div className="reading-room-recent">
          <div className="reading-room-section-title">Recently read</div>
          <div className="reading-room-recent-grid">
            {recentDocuments.map((doc) => {
              const status = statusInfo(doc)
              return (
                <div key={doc.id} className="reading-room-recent-card">
                  <div className="reading-room-recent-title">{doc.title}</div>
                  <div className="reading-room-recent-meta">
                    {doc.type.toUpperCase()}
                    {status && (
                      <span className={status.className}>{status.label}</span>
                    )}
                  </div>
                  {getProgressValue(doc) !== null && (
                    <div className="reading-room-progress">
                      <div className="reading-room-progress-track">
                        <div className="reading-room-progress-fill" style={{ width: `${getProgressValue(doc)}%` }} />
                      </div>
                      <span>{getProgressValue(doc)}%</span>
                    </div>
                  )}
                  {canRead(doc) && (
                    <button
                      type="button"
                      className="btn-secondary text-xs px-3 py-2"
                      onClick={() => onReadDocument?.(doc, { resume: true })}
                    >
                      Resume
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="reading-room-grid">
          {sortedDocuments.length === 0 ? (
            <div className="reading-room-empty">No documents imported yet.</div>
          ) : (
            sortedDocuments.map((doc) => {
              const status = statusInfo(doc)
              return (
                <div key={doc.id} className="reading-room-card">
                  <div className="reading-room-card-cover">
                    {doc.thumbnail ? (
                      <img src={doc.thumbnail} alt={doc.title} />
                    ) : (
                      <div className="reading-room-card-placeholder">{doc.type.toUpperCase()}</div>
                    )}
                  </div>
                  <div className="reading-room-card-title">{doc.title}</div>
                  <div className="reading-room-card-meta">
                    {doc.type.toUpperCase()}
                    {status && (
                      <span className={status.className}>{status.label}</span>
                    )}
                  </div>
                  {getProgressValue(doc) !== null && (
                    <div className="reading-room-progress">
                      <div className="reading-room-progress-track">
                        <div className="reading-room-progress-fill" style={{ width: `${getProgressValue(doc)}%` }} />
                      </div>
                      <span>{getProgressValue(doc)}%</span>
                    </div>
                  )}
                  <div className="reading-room-card-actions">
                    {canRead(doc) && (
                      <>
                        <button
                          type="button"
                          className="btn-secondary text-xs px-3 py-2"
                          onClick={() => onReadDocument?.(doc)}
                        >
                          Read
                        </button>
                        {doc.lastOpened && (
                          <button
                            type="button"
                            className="btn-secondary text-xs px-3 py-2"
                            onClick={() => onReadDocument?.(doc, { resume: true })}
                          >
                            Resume
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="reading-room-list">
          {sortedDocuments.length === 0 ? (
            <div className="reading-room-empty">No documents imported yet.</div>
          ) : (
            sortedDocuments.map((doc) => {
              const status = statusInfo(doc)
              return (
                <div key={doc.id} className="reading-room-item">
                  <div>
                    <div className="reading-room-item-title">{doc.title}</div>
                    <div className="reading-room-item-meta">
                      {doc.type.toUpperCase()}
                      {status && (
                        <span className={status.className}>{status.label}</span>
                      )}
                    </div>
                  </div>
                  <div className="reading-room-item-actions">
                    {getProgressValue(doc) !== null && (
                      <div className="reading-room-progress small">
                        <div className="reading-room-progress-track">
                          <div className="reading-room-progress-fill" style={{ width: `${getProgressValue(doc)}%` }} />
                        </div>
                        <span>{getProgressValue(doc)}%</span>
                      </div>
                    )}
                    {canRead(doc) && (
                      <>
                        <button
                          type="button"
                          className="btn-secondary text-xs px-3 py-2"
                          onClick={() => onReadDocument?.(doc)}
                        >
                          Read
                        </button>
                        {doc.lastOpened && (
                          <button
                            type="button"
                            className="btn-secondary text-xs px-3 py-2"
                            onClick={() => onReadDocument?.(doc, { resume: true })}
                          >
                            Resume
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })
        )}
      </div>
      )}
    </section>
  )
}

export default LibraryVaultPanel
