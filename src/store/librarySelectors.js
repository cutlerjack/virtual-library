import { quoteText, quoteCreatedAt } from '../utils/documentUtils'
import { deriveStudySessionCompletedAt, normalizeStudySession } from '../utils/studyStack'

export function selectAllTags(books) {
  const tagSet = new Set()
  books.forEach((book) => {
    book.tags?.forEach((tag) => tagSet.add(tag))
  })
  return Array.from(tagSet).sort()
}

export function selectAllLibraryTags(books, documents) {
  const tagSet = new Set()
  books.forEach((book) => {
    book.tags?.forEach((tag) => tagSet.add(tag))
  })
  documents.forEach((doc) => {
    doc.tags?.forEach((tag) => tagSet.add(tag))
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
  const bookMap = new Map(books.map((book) => [book.id, book]))
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
        text: quoteText(quote),
        location: null,
        locationLabel: null,
        createdAt: quoteCreatedAt(quote) || book.lastTouched || book.addedAt || null,
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
    const linkedBook = doc.linkedBookId ? bookMap.get(doc.linkedBookId) : null
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
        linkedBookId: linkedBook?.id || doc.linkedBookId || null,
        linkedBookTitle: linkedBook?.title || null,
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
        linkedBookId: linkedBook?.id || doc.linkedBookId || null,
        linkedBookTitle: linkedBook?.title || null,
      })
    })
  })

  return annotations.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export function selectBookReadingTrail(book, documents, limit = 8) {
  if (!book) return []

  const linkedDocuments = documents.filter((doc) => doc.linkedBookId === book.id)
  return selectAllAnnotations([book], linkedDocuments).slice(0, limit)
}

export function selectBookStudyStack(book, limit = 6) {
  if (!book?.studyStack?.length) return []

  return book.studyStack.slice(0, limit)
}

export function selectStudySessionState(book) {
  const stack = selectBookStudyStack(book, Number.MAX_SAFE_INTEGER)
  const meta = normalizeStudySession(book?.studySession)
  const completedCount = stack.filter((entry) => entry.completedAt).length
  const remainingCount = stack.length - completedCount
  const nextEntry = stack.find((entry) => !entry.completedAt) || stack[0] || null
  const completedAt = meta?.completedAt || deriveStudySessionCompletedAt(stack)
  const startedAt = meta?.startedAt || null
  const reviewedThisSessionCount = startedAt
    ? stack.filter((entry) => entry.lastReviewedAt && new Date(entry.lastReviewedAt) >= new Date(startedAt)).length
    : 0
  const completedThisSessionCount = startedAt
    ? stack.filter((entry) => entry.completedAt && new Date(entry.completedAt) >= new Date(startedAt)).length
    : completedCount

  let status = 'empty'
  if (stack.length > 0) {
    status = completedAt && remainingCount === 0
      ? 'complete'
      : startedAt
        ? 'active'
        : 'ready'
  }

  return {
    totalCount: stack.length,
    completedCount,
    remainingCount,
    nextEntry,
    isComplete: status === 'complete',
    status,
    startedAt,
    lastActivityAt: meta?.lastActivityAt || null,
    completedAt,
    reviewedThisSessionCount,
    completedThisSessionCount,
  }
}

export function selectStudyVolumes(books, limit = 4) {
  return books
    .map((book) => {
      const studyStack = selectBookStudyStack(book, Number.MAX_SAFE_INTEGER)
      const session = selectStudySessionState(book)
      if (studyStack.length === 0) return null
      return {
        book,
        count: studyStack.length,
        status: session.status,
        completedCount: session.completedCount,
        remainingCount: session.remainingCount,
        nextEntry: session.nextEntry,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        reviewedThisSessionCount: session.reviewedThisSessionCount,
        latestSavedAt: book.lastTouched || studyStack[0].savedAt || studyStack[0].createdAt || book.addedAt || null,
        latestEntry: session.nextEntry || studyStack[0],
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const statusWeight = {
        active: 0,
        ready: 1,
        complete: 2,
        empty: 3,
      }
      const weightDelta = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9)
      if (weightDelta !== 0) return weightDelta
      return new Date(b.latestSavedAt || 0) - new Date(a.latestSavedAt || 0)
    })
    .slice(0, limit)
}
