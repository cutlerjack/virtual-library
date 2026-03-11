export function selectAllTags(books) {
  const tagSet = new Set()
  books.forEach((book) => {
    book.tags?.forEach((tag) => tagSet.add(tag))
  })
  return Array.from(tagSet).sort()
}

export function selectBooksFinishedThisYear(books, now = new Date()) {
  const year = now.getFullYear()
  return books.filter((book) => {
    if (!book.dateFinished) return false
    const date = new Date(book.dateFinished)
    return date.getFullYear() === year
  }).length
}

export function selectQuoteCount(books) {
  return books.reduce((sum, book) => sum + (book.quotes?.length || 0), 0)
}

export function selectContinueReadingDocs(documents, limit = 4) {
  return [...documents]
    .filter((doc) => doc.lastOpened
      && doc.fileStatus !== 'missing'
      && (doc.type === 'pdf' || doc.type === 'epub' || doc.type === 'article'))
    .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
    .slice(0, limit)
}

export function selectFilteredBooks(books, activeShelf, selectedTags) {
  let filtered = books

  if (activeShelf !== 'all') {
    filtered = filtered.filter((book) => book.shelves?.includes(activeShelf))
  }

  if (selectedTags.length > 0) {
    filtered = filtered.filter((book) =>
      selectedTags.every((tag) => book.tags?.includes(tag))
    )
  }

  return filtered
}

export function selectSortedBooks(books, sortMode) {
  const list = [...books]
  switch (sortMode) {
    case 'color':
      return list.sort((a, b) => (a.spineColor || '').localeCompare(b.spineColor || ''))
    case 'genre':
      return list.sort((a, b) => (a.tags?.[0] || '').localeCompare(b.tags?.[0] || ''))
    case 'title':
      return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    case 'recent':
    default:
      return list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
  }
}

export function selectAllAnnotations(books, documents) {
  const annotations = []
  books.forEach((book) => {
    if (book.notes) {
      annotations.push({
        id: `${book.id}-note`,
        itemId: book.id,
        itemTitle: book.title,
        type: 'note',
        format: 'book',
        text: book.notes,
        location: null,
        locationLabel: null,
        createdAt: book.lastTouched || book.addedAt || null,
      })
    }
    ;(book.quotes || []).forEach((quote, index) => {
      annotations.push({
        id: `${book.id}-quote-${index}`,
        itemId: book.id,
        itemTitle: book.title,
        type: 'quote',
        format: 'book',
        text: quote,
        location: null,
        locationLabel: null,
        createdAt: book.lastTouched || book.addedAt || null,
      })
    })
    ;(book.reflections || []).forEach((reflection, index) => {
      annotations.push({
        id: `${book.id}-reflection-${index}`,
        itemId: book.id,
        itemTitle: book.title,
        type: 'reflection',
        format: 'book',
        text: reflection.text,
        location: null,
        locationLabel: null,
        createdAt: reflection.date || book.lastTouched || book.addedAt || null,
      })
    })
  })

  documents.forEach((doc) => {
    const format = doc.type || 'document'
    ;(doc.notes || []).forEach((note) => {
      annotations.push({
        id: note.id,
        itemId: doc.id,
        itemTitle: doc.title,
        type: 'note',
        format,
        text: note.text,
        location: {
          kind: format,
          page: note.page,
          cfi: note.cfi,
          scrollOffset: note.scrollOffset,
        },
        locationLabel: note.page ? `Page ${note.page}` : null,
        createdAt: note.createdAt || null,
      })
    })
    ;(doc.highlights || []).forEach((highlight) => {
      annotations.push({
        id: highlight.id,
        itemId: doc.id,
        itemTitle: doc.title,
        type: 'highlight',
        format,
        text: highlight.text,
        location: {
          kind: format,
          page: highlight.page,
          cfi: highlight.cfi,
          scrollOffset: highlight.scrollOffset,
        },
        locationLabel: highlight.page ? `Page ${highlight.page}` : null,
        createdAt: highlight.createdAt || null,
      })
    })
  })

  return annotations.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}
