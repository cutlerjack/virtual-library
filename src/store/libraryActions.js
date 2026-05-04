import { generateId, findSpineInLibraryMap } from '../utils/storage'
import {
  createStudyStackEntry,
  deriveStudySessionCompletedAt,
  getStudyStackEntryKey,
  normalizeStudySession,
} from '../utils/studyStack'

export function createLibraryActions({
  books,
  documents,
  shelves,
  userData,
  spineLibraryMap,
  updateBookItem,
  updateDocumentItem,
  updateUserState,
  insertBookItem,
  removeLibraryItem,
  updateShelvesState,
  docUpdateTimersRef,
}) {
  const buildStudySession = (book, entries, now, { forceStart = false } = {}) => {
    if (!Array.isArray(entries) || entries.length === 0) return null

    const currentSession = normalizeStudySession(book?.studySession)
    const derivedCompletedAt = deriveStudySessionCompletedAt(entries)
    const shouldKeepStartedAt = currentSession?.startedAt && !currentSession.completedAt && !forceStart
    const startedAt = shouldKeepStartedAt ? currentSession.startedAt : now

    return {
      startedAt,
      lastActivityAt: now,
      completedAt: derivedCompletedAt,
    }
  }

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
      studyStack: [],
      pagesRead: 0,
      readingLogs: [],
      reflections: [],
    }
    insertBookItem(newBook)
    return newBook
  }

  const updateBook = (updatedBook) => {
    if (!updatedBook?.id) return
    updateBookItem(updatedBook.id, updatedBook)
  }

  const deleteBook = (bookId) => {
    documents
      .filter((item) => item.linkedBookId === bookId)
      .forEach((item) => updateDocumentItem(item.id, { linkedBookId: null }))
    removeLibraryItem(bookId)
  }

  const logPages = (bookId, pages) => {
    if (!pages || pages <= 0) return
    const date = new Date().toISOString()
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const currentPages = book.pagesRead || 0
    const remainingPages = book.pageCount
      ? Math.max((book.pageCount || 0) - currentPages, 0)
      : pages
    const pagesToLog = book.pageCount
      ? Math.min(pages, remainingPages)
      : pages
    if (pagesToLog <= 0) return
    const pagesRead = currentPages + pagesToLog
    const readingLogs = [...(book.readingLogs || []), { date, pages: pagesToLog }]
    updateBookItem(bookId, { pagesRead, readingLogs, lastTouched: date })
    recordActivity('pages', bookId)
  }

  const undoLastPageLog = (bookId) => {
    const book = books.find((entry) => entry.id === bookId)
    if (!book || !(book.readingLogs || []).length) return
    const date = new Date().toISOString()
    const readingLogs = [...(book.readingLogs || [])]
    const removedLog = readingLogs.pop()
    const pagesRead = Math.max((book.pagesRead || 0) - (removedLog?.pages || 0), 0)
    updateBookItem(bookId, { pagesRead, readingLogs, lastTouched: date })
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

  const pinStudyEntry = (bookId, annotation) => {
    if (!bookId || !annotation?.text?.trim()) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const now = new Date().toISOString()
    const nextEntry = createStudyStackEntry(annotation, book)
    const nextKey = getStudyStackEntryKey(nextEntry)
    const existingEntry = (book.studyStack || []).find((entry) => getStudyStackEntryKey(entry) === nextKey)
    const mergedEntry = existingEntry
      ? {
          ...existingEntry,
          ...nextEntry,
          id: existingEntry.id,
          note: existingEntry.note || nextEntry.note || '',
          completedAt: null,
          savedAt: now,
        }
      : nextEntry
    const nextStack = [
      mergedEntry,
      ...(book.studyStack || []).filter((entry) => getStudyStackEntryKey(entry) !== nextKey),
    ].slice(0, 12)
    const currentSession = normalizeStudySession(book.studySession)
    updateBookItem(bookId, {
      studyStack: nextStack,
      studySession: currentSession
        ? { ...currentSession, completedAt: null }
        : null,
      lastTouched: now,
    })
  }

  const removeStudyEntry = (bookId, studyEntryId) => {
    if (!bookId || !studyEntryId) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const now = new Date().toISOString()
    const nextStack = (book.studyStack || []).filter((entry) => entry.id !== studyEntryId)
    updateBookItem(bookId, {
      studyStack: nextStack,
      studySession: buildStudySession(book, nextStack, now),
      lastTouched: now,
    })
  }

  const updateStudyEntry = (bookId, studyEntryId, updates) => {
    if (!bookId || !studyEntryId) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    updateBookItem(bookId, {
      studyStack: (book.studyStack || []).map((entry) => (
        entry.id === studyEntryId
          ? {
              ...entry,
              ...updates,
            }
          : entry
      )),
      lastTouched: new Date().toISOString(),
    })
  }

  const moveStudyEntry = (bookId, studyEntryId, direction) => {
    if (!bookId || !studyEntryId || !direction) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const stack = [...(book.studyStack || [])]
    const currentIndex = stack.findIndex((entry) => entry.id === studyEntryId)
    if (currentIndex === -1) return
    const targetIndex = currentIndex + direction
    if (targetIndex < 0 || targetIndex >= stack.length) return
    const [entry] = stack.splice(currentIndex, 1)
    stack.splice(targetIndex, 0, entry)
    updateBookItem(bookId, {
      studyStack: stack,
      lastTouched: new Date().toISOString(),
    })
  }

  const reviewStudyEntry = (bookId, studyEntryId) => {
    if (!bookId || !studyEntryId) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const now = new Date().toISOString()
    const nextStack = (book.studyStack || []).map((entry) => (
      entry.id === studyEntryId
        ? { ...entry, lastReviewedAt: now }
        : entry
    ))
    updateBookItem(bookId, {
      studyStack: nextStack,
      studySession: buildStudySession(book, nextStack, now),
      lastTouched: now,
    })
  }

  const toggleStudyEntryComplete = (bookId, studyEntryId) => {
    if (!bookId || !studyEntryId) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book) return
    const now = new Date().toISOString()
    const nextStack = (book.studyStack || []).map((entry) => (
      entry.id === studyEntryId
        ? {
            ...entry,
            completedAt: entry.completedAt ? null : now,
          }
        : entry
    ))
    updateBookItem(bookId, {
      studyStack: nextStack,
      studySession: buildStudySession(book, nextStack, now),
      lastTouched: now,
    })
  }

  const startStudySession = (bookId) => {
    if (!bookId) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book || !(book.studyStack || []).length) return
    const now = new Date().toISOString()
    updateBookItem(bookId, {
      studySession: buildStudySession(book, book.studyStack || [], now, { forceStart: true }),
      lastTouched: now,
    })
  }

  const resetStudySession = (bookId) => {
    if (!bookId) return
    const book = books.find((entry) => entry.id === bookId)
    if (!book || !(book.studyStack || []).length) return
    const now = new Date().toISOString()
    const resetStack = (book.studyStack || []).map((entry) => ({
      ...entry,
      completedAt: null,
    }))
    updateBookItem(bookId, {
      studyStack: resetStack,
      studySession: buildStudySession(book, resetStack, now, { forceStart: true }),
      lastTouched: now,
    })
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
    books
      .filter((book) => (book.shelves || []).includes(shelfId))
      .forEach((book) => updateBookItem(book.id, {
        shelves: (book.shelves || []).filter((id) => id !== shelfId),
      }))
    documents
      .filter((doc) => (doc.shelves || []).includes(shelfId))
      .forEach((doc) => updateDocumentItem(doc.id, {
        shelves: (doc.shelves || []).filter((id) => id !== shelfId),
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
    const existing = timers.get(docId)
    const pendingUpdates = {
      ...(existing?.updates || {}),
      ...updates,
    }
    if (existing) {
      clearTimeout(existing.timeout || existing)
    }
    const timeout = setTimeout(() => {
      timers.delete(docId)
      updateDocumentItem(docId, pendingUpdates)
    }, delay)
    timers.set(docId, { timeout, updates: pendingUpdates })
  }

  const flushPendingDocumentMetaUpdates = () => {
    const timers = docUpdateTimersRef?.current
    if (!timers?.size) return 0
    const pending = Array.from(timers.entries())
    timers.clear()
    pending.forEach(([docId, entry]) => {
      clearTimeout(entry?.timeout || entry)
      if (entry?.updates) {
        updateDocumentItem(docId, entry.updates)
      }
    })
    return pending.length
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
    undoLastPageLog,
    addQuote,
    addReflection,
    pinStudyEntry,
    removeStudyEntry,
    updateStudyEntry,
    moveStudyEntry,
    reviewStudyEntry,
    toggleStudyEntryComplete,
    startStudySession,
    resetStudySession,
    addShelf,
    deleteShelf,
    updateDocumentMeta,
    scheduleDocumentMetaUpdate,
    flushPendingDocumentMetaUpdates,
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
