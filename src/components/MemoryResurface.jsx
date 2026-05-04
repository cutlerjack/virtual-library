import React, { useMemo } from 'react'

function dateValue(value) {
  const time = new Date(value || 0).getTime()
  return Number.isNaN(time) ? 0 : time
}

function MemoryResurface({ books, onOpenBook }) {
  const memory = useMemo(() => {
    const memories = []
    books.forEach((book) => {
      (book.memories || []).forEach((entry) => {
        memories.push({
          book,
          type: 'memory',
          text: entry.note || entry.title,
          title: entry.title || book.title,
          imageUrl: entry.imageUrl || null,
          date: entry.createdAt,
        })
      })
      ;(book.reflections || []).forEach((entry) => {
        memories.push({
          book,
          type: 'reflection',
          text: entry.text,
          title: book.title,
          imageUrl: book.coverUrl || null,
          date: entry.date,
        })
      })
    })
    if (memories.length === 0) return null
    memories.sort((a, b) => dateValue(b.date) - dateValue(a.date))
    return memories[0]
  }, [books])

  if (!memory) {
    return null
  }

  return (
    <section className="memory-resurface">
      <div className="memory-resurface-header">
        <div>
          <div className="memory-eyebrow">Today’s Memory</div>
          <h3>{memory.title}</h3>
        </div>
        <button
          className="btn-secondary"
          onClick={() => onOpenBook?.(memory.book.id)}
        >
          Open Book
        </button>
      </div>
      <div className="memory-resurface-body">
        {memory.imageUrl && (
          <div className="memory-thumb">
            <img src={memory.imageUrl} alt="" />
          </div>
        )}
        <p>{memory.text}</p>
      </div>
    </section>
  )
}

export default MemoryResurface
