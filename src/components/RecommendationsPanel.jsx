import { useMemo, useState } from 'react'
import { getRecommendations, getReadingInsights } from '../utils/recommendations'

const DISMISSED_KEY = 'virtual-library-archivist-dismissed'

function RecommendationsPanel({ books }) {
  const recommendations = useMemo(() => getRecommendations(books), [books])
  const insights = useMemo(() => getReadingInsights(books), [books])
  const [dismissed, setDismissed] = useState(() => {
    try {
      const data = localStorage.getItem(DISMISSED_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  })

  const items = [...recommendations, ...insights]
    .map((item) => ({ ...item, id: buildArchivistId(item) }))
    .filter((item) => !dismissed.includes(item.id))
    .slice(0, 5)

  if (items.length === 0) {
    return null
  }

  const dismissItem = (id) => {
    const next = [...new Set([...dismissed, id])]
    setDismissed(next)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
  }

  return (
    <div className="recommendations-panel">
      <div className="recommendations-title">Archivist Notes</div>
      <div className="recommendations-list">
        {items.map((item) => (
          <div key={item.id} className="recommendation-card">
            <span>{item.message}</span>
            <button
              type="button"
              className="recommendation-dismiss"
              onClick={() => dismissItem(item.id)}
              aria-label="Dismiss note"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildArchivistId(item) {
  return [
    item.type,
    item.basedOn || '',
    item.genre || '',
    item.author || '',
    item.count || '',
    item.message || '',
  ].join('|')
}

export default RecommendationsPanel
