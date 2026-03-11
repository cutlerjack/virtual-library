import { useMemo } from 'react'

function TimelineShelf({ books }) {
  const timeline = useMemo(() => {
    return [...books]
      .filter((book) => book.dateFinished || book.addedAt)
      .sort((a, b) => new Date(a.dateFinished || a.addedAt) - new Date(b.dateFinished || b.addedAt))
  }, [books])

  if (timeline.length === 0) {
    return null
  }

  return (
    <section className="timeline-section">
      <div className="timeline-title">Reading Timeline</div>
      <div className="timeline-row">
        {timeline.map((book) => {
          const date = new Date(book.dateFinished || book.addedAt)
          const label = isNaN(date.getTime()) ? '' : date.getFullYear()
          return (
            <div key={book.id} className="timeline-item">
              <div className="timeline-cover">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" />
                ) : (
                  <div
                    className="timeline-cover-fallback"
                    style={{ backgroundColor: book.spineColor || '#654321' }}
                  />
                )}
              </div>
              <div className="timeline-label">{label}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default TimelineShelf
