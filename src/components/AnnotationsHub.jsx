import React, { useId, useMemo, useState } from 'react'

function AnnotationsHub({ annotations = [], onOpenAnnotation, onOpenBook }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const searchId = useId()

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
      return annotations.filter((entry) => {
        if (typeFilter !== 'all' && entry.type !== typeFilter) return false
        if (formatFilter !== 'all' && entry.format !== formatFilter) return false
        if (!normalized) return true
        return (
          entry.text?.toLowerCase().includes(normalized)
          || entry.itemTitle?.toLowerCase().includes(normalized)
          || entry.linkedBookTitle?.toLowerCase().includes(normalized)
        )
      })
  }, [annotations, query, typeFilter, formatFilter])

  if (!annotations.length) return null

  return (
    <section className="annotations-hub">
      <div className="annotations-hub-header">
        <div>
          <div className="annotations-hub-eyebrow">Annotations</div>
          <h3 className="annotations-hub-title">Everything you have captured.</h3>
        </div>
        <div className="annotations-hub-controls">
          <label htmlFor={searchId} className="annotations-hub-search-label">
            Search annotations
          </label>
          <input
            id={searchId}
            type="search"
            placeholder="Search notes, highlights, quotes..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="annotations-hub-filters" role="group" aria-label="Filter by annotation type">
            {['all', 'note', 'highlight', 'quote', 'reflection'].map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={typeFilter === type}
                className={`annotations-hub-filter ${typeFilter === type ? 'active' : ''}`}
                onClick={() => setTypeFilter(type)}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>
          <div className="annotations-hub-filters" role="group" aria-label="Filter by source format">
            {['all', 'pdf', 'epub', 'article', 'book'].map((format) => (
              <button
                key={format}
                type="button"
                aria-pressed={formatFilter === format}
                className={`annotations-hub-filter ${formatFilter === format ? 'active' : ''}`}
                onClick={() => setFormatFilter(format)}
              >
                {format}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="annotations-hub-list">
        {filtered.length === 0 && (
          <div className="annotations-hub-empty">No annotations match those filters.</div>
        )}
        {filtered.map((entry) => (
          <div key={entry.id} className="annotations-hub-card">
            <div className="annotations-hub-meta">
              <span>{entry.type}</span>
              <span>{entry.format}</span>
              {entry.locationLabel && <span>{entry.locationLabel}</span>}
            </div>
            <div className="annotations-hub-text">{entry.text}</div>
            {entry.linkedBookTitle && entry.format !== 'book' && (
              <div className="annotations-hub-context">
                Linked to <strong>{entry.linkedBookTitle}</strong>
              </div>
            )}
            <div className="annotations-hub-footer">
              <span className="annotations-hub-item">
                {entry.format === 'book' ? entry.itemTitle : `Source: ${entry.itemTitle}`}
              </span>
              <div className="annotations-hub-actions">
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onOpenAnnotation?.(entry)}
                >
                  {entry.format === 'book' ? 'Open Book' : 'Open Source'}
                </button>
                {entry.linkedBookId && entry.format !== 'book' && (
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onOpenBook?.(entry.linkedBookId)}
                  >
                    Open Book
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default AnnotationsHub
