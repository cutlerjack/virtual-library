export function exportLibrary(books, shelves) {
  const safeBooks = Array.isArray(books) ? books : []
  const safeShelves = Array.isArray(shelves) ? shelves : []
  const shelfLookup = safeShelves.reduce((acc, shelf) => {
    acc[shelf.id] = shelf.name
    return acc
  }, {})

  const payload = safeBooks.map((book) => ({
    title: book.title || '',
    author: book.author || '',
    isbn: book.isbn || '',
    rating: book.rating || 0,
    notes: book.notes || '',
    quotes: book.quotes || [],
    tags: book.tags || [],
    shelves: (book.shelves || []).map((id) => shelfLookup[id] || id),
    pageCount: book.pageCount || null,
    dateStarted: book.dateStarted || null,
    dateFinished: book.dateFinished || null,
    publishedDate: book.publishedDate || null,
    addedAt: book.addedAt || null,
    coverUrl: book.coverUrl || null,
  }))

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `virtual-library-export-${new Date().toISOString().slice(0, 10)}.json`
  try {
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
