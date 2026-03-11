import { generateId, findSpineInLibraryMap } from '../utils/storage'
import { createBookItemFromBook, mergeBookIntoItem, mergeDocumentIntoItem } from '../data/libraryAdapters'

export function createLibraryActions({
  books,
  documents,
  shelves,
  userData,
  spineLibraryMap,
  updateLibraryState,
  updateBookItem,
  updateDocumentItem,
  updateUserState,
  updateShelvesState,
  docUpdateTimersRef,
}) {
  const recordActivity = (type, bookId) => {
    const now = new Date()
    const dayKey = getDayKey(now)
    const nextStreak = updateStreak(
      userData.readingStreak || { current: 0, best: 0, lastDate: null },
      dayKey
    )
    const activityLog = [
      { date: now.toISOString(), dayKey, type, bookId },
      ...(userData.activityLog || []),
    ].slice(0, 200)
    updateUserState({
      readingStreak: nextStreak,
      lastActivityAt: now.toISOString(),
      activityLog,
    })
  }

  const addBook = (bookData) => {
    const spineMatch = bookData.isbn
      ? findSpineInLibraryMap(spineLibraryMap, bookData.isbn)
      : null
    const resolvedSpineImage = bookData.spineImage || spineMatch?.spineImage || null
    const newBook = {
      ...bookData,
      spineImage: resolvedSpineImage,
      spineSource: resolvedSpineImage ? 'photo' : bookData.spineSource,
      spineCrop: spineMatch?.crop || bookData.spineCrop || null,
      id: generateId(),
      addedAt: new Date().toISOString(),
      rating: 0,
      shelves: [],
      tags: bookData.tags || [],
      notes: '',
      quotes: [],
      wearLevel: 0,
      lastTouched: null,
      memories: [],
      pagesRead: 0,
      readingLogs: [],
      reflections: [],
    }
    updateLibraryState((prev) => ({
      ...prev,
      items: [...prev.items, createBookItemFromBook(newBook)],
    }))
    return newBook
  }

  const updateBook = (updatedBook) => {
    if (!updatedBook?.id) return
    updateBookItem(updatedBook.id, updatedBook)
  }

  const deleteBook = (bookId) => {
    updateLibraryState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== bookId),
    }))
  }

  const logPages = (bookId, pages) => {
    if (!pages || pages <= 0) return
    const date = new Date().toISOString()
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const pagesRead = (book.pagesRead || 0) + pages
    const readingLogs = [...(book.readingLogs || []), { date, pages }]
    updateBookItem(bookId, { pagesRead, readingLogs, lastTouched: date })
    recordActivity('pages', bookId)
  }

  const addQuote = (bookId, text) => {
    if (!text?.trim()) return
    const date = new Date().toISOString()
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const quotes = [...(book.quotes || []), { text: text.trim(), createdAt: date }]
    updateBookItem(bookId, { quotes, lastTouched: date })
    recordActivity('quotes', bookId)
  }

  const addReflection = (bookId, text) => {
    if (!text?.trim()) return
    const date = new Date().toISOString()
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const reflections = [...(book.reflections || []), { date, text }]
    updateBookItem(bookId, { reflections, lastTouched: date })
    recordActivity('reflection', bookId)
  }

  const addShelf = (name) => {
    const newShelf = {
      id: generateId(),
      name,
      color: '#8b4513',
      order: shelves.length,
    }
    updateShelvesState((prev) => [...prev, newShelf])
  }

  const deleteShelf = (shelfId) => {
    if (shelfId === 'all') return
    updateShelvesState((prev) => prev.filter((shelf) => shelf.id !== shelfId))
    updateLibraryState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        const nextShelves = (item.shelves || []).filter((id) => id !== shelfId)
        if (item.kind === 'book') return mergeBookIntoItem(item, { shelves: nextShelves })
        if (item.kind === 'document') return mergeDocumentIntoItem(item, { shelves: nextShelves })
        return item
      }),
    }))
  }

  const updateDocumentMeta = (docId, updates) => {
    if (!docId) return
    updateDocumentItem(docId, updates)
  }

  const scheduleDocumentMetaUpdate = (docId, updates, delay = 300) => {
    if (!docId) return
    if (!docUpdateTimersRef?.current) {
      updateDocumentItem(docId, updates)
      return
    }
    const timers = docUpdateTimersRef.current
    if (timers.has(docId)) {
      clearTimeout(timers.get(docId))
    }
    const timeout = setTimeout(() => {
      timers.delete(docId)
      updateDocumentItem(docId, updates)
    }, delay)
    timers.set(docId, timeout)
  }

  const addDocumentNote = async (docId, note) => {
    if (!docId) return null
    const entry = {
      id: generateId(),
      text: note.text,
      page: note.page || null,
      cfi: note.cfi || null,
      scrollOffset: note.scrollOffset ?? null,
      anchorId: note.anchorId ?? null,
      createdAt: new Date().toISOString(),
    }
    const doc = documents.find((item) => item.id === docId)
    const nextNotes = [...(doc?.notes || []), entry]
    updateDocumentItem(docId, { notes: nextNotes })
    return nextNotes
  }

  return {
    addBook,
    updateBook,
    deleteBook,
    logPages,
    addQuote,
    addReflection,
    addShelf,
    deleteShelf,
    updateDocumentMeta,
    scheduleDocumentMetaUpdate,
    addDocumentNote,
  }
}

function getDayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function updateStreak(streak, dayKey) {
  if (!dayKey) return streak
  if (streak.lastDate === dayKey) return streak

  const lastDate = streak.lastDate ? new Date(streak.lastDate) : null
  const currentDate = new Date(dayKey)
  let current = 1

  if (lastDate) {
    const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) current = streak.current + 1
  }

  return {
    current,
    best: Math.max(streak.best || 0, current),
    lastDate: dayKey,
  }
}
