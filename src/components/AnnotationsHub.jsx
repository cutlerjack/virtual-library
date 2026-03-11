import { useMemo, useState } from 'react'

function AnnotationsHub({ annotations = [], onOpenAnnotation }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return annotations.filter((entry) => {
      if (typeFilter !== 'all' && entry.type !== typeFilter) return false
      if (formatFilter !== 'all' && entry.format !== formatFilter) return false
      if (!normalized) return true
      return (
        entry.text?.toLowerCase().includes(normalized)
        || entry.itemTitle?.toLowerCase().includes(normalized)
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
          <input
            type="search"
            placeholder="Search notes, highlights, quotes..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="annotations-hub-filters">
            {['all', 'note', 'highlight', 'quote', 'reflection'].map((type) => (
              <button
                key={type}
                type="button"
                className={`annotations-hub-filter ${typeFilter === type ? 'active' : ''}`}
                onClick={() => setTypeFilter(type)}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>
          <div className="annotations-hub-filters">
            {['all', 'pdf', 'epub', 'article', 'book'].map((format) => (
              <button
                key={format}
                type="button"
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
            <div className="annotations-hub-footer">
              <span className="annotations-hub-item">{entry.itemTitle}</span>
              <button
                type="button"
                className="btn-secondary text-xs px-3 py-2"
                onClick={() => onOpenAnnotation?.(entry)}
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default AnnotationsHub
