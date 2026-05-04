import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'
import { createLibraryActions } from '../libraryActions'

function setup(overrides = {}) {
  const books = overrides.books || []
  const documents = overrides.documents || []
  const shelves = overrides.shelves || []
  const userData = overrides.userData || {
    readingStreak: { current: 0, best: 0, lastDate: null },
    activityLog: [],
  }
  const spineLibraryMap = overrides.spineLibraryMap || {}
  const updateLibraryState = vi.fn((fn) => {
    if (typeof fn === 'function') fn({ items: [...books.map(bookToItem), ...documents.map(docToItem)] })
  })
  const updateBookItem = vi.fn()
  const updateDocumentItem = vi.fn()
  const updateUserState = vi.fn()
  const insertBookItem = vi.fn()
  const removeLibraryItem = vi.fn()
  const updateShelvesState = vi.fn((fn) => {
    if (typeof fn === 'function') return fn(shelves)
  })
  const docUpdateTimersRef = { current: new Map() }

  const actions = createLibraryActions({
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
  })

  return {
    actions,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    insertBookItem,
    removeLibraryItem,
    updateShelvesState,
    docUpdateTimersRef,
  }
}

function bookToItem(book) {
  return { id: book.id, kind: 'book', title: book.title }
}

function docToItem(doc) {
  return { id: doc.id, kind: 'document', title: doc.title }
}

describe('addBook', () => {
  it('inserts a new book item through the targeted insert path', () => {
    const { actions, insertBookItem } = setup()
    const result = actions.addBook({ title: 'New Book', author: 'Author' })
    expect(result).toHaveProperty('id')
    expect(result.title).toBe('New Book')
    expect(result.rating).toBe(0)
    expect(result.quotes).toEqual([])
    expect(insertBookItem).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Book',
      author: 'Author',
    }))
  })

  it('generates a unique id and addedAt timestamp', () => {
    const { actions } = setup()
    const book = actions.addBook({ title: 'Test' })
    expect(book.id).toBeTruthy()
    expect(book.addedAt).toBeTruthy()
  })

  it('preserves provided tags', () => {
    const { actions } = setup()
    const book = actions.addBook({ title: 'Tagged', tags: ['fiction', 'new'] })
    expect(book.tags).toEqual(['fiction', 'new'])
  })

  it('defaults tags to empty array', () => {
    const { actions } = setup()
    const book = actions.addBook({ title: 'No Tags' })
    expect(book.tags).toEqual([])
  })

  it('resolves spine image from spineLibraryMap by isbn', () => {
    const { actions } = setup({
      spineLibraryMap: {
        '9781234567897': { spineImage: 'data:image/png;base64,abc', crop: { zoom: 1.2 } },
      },
    })
    const book = actions.addBook({ title: 'Spine Match', isbn: '9781234567897' })
    expect(book.spineImage).toBe('data:image/png;base64,abc')
    expect(book.spineCrop).toEqual({ zoom: 1.2 })
  })
})

describe('updateBook', () => {
  it('calls updateBookItem with the book id', () => {
    const { actions, updateBookItem } = setup()
    actions.updateBook({ id: 'book-1', title: 'Updated' })
    expect(updateBookItem).toHaveBeenCalledWith('book-1', { id: 'book-1', title: 'Updated' })
  })

  it('does nothing when book has no id', () => {
    const { actions, updateBookItem } = setup()
    actions.updateBook({ title: 'No Id' })
    expect(updateBookItem).not.toHaveBeenCalled()
  })

  it('does nothing when called with null', () => {
    const { actions, updateBookItem } = setup()
    actions.updateBook(null)
    expect(updateBookItem).not.toHaveBeenCalled()
  })
})

describe('deleteBook', () => {
  it('removes the book through the targeted remove path', () => {
    const { actions, removeLibraryItem } = setup()
    actions.deleteBook('book-1')
    expect(removeLibraryItem).toHaveBeenCalledWith('book-1')
  })

  it('unlinks documents attached to the deleted book', () => {
    const documents = [{ id: 'doc-1', linkedBookId: 'book-1' }]
    const { actions, updateDocumentItem, removeLibraryItem } = setup({ documents })
    actions.deleteBook('book-1')
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', { linkedBookId: null })
    expect(removeLibraryItem).toHaveBeenCalledWith('book-1')
  })
})

describe('logPages', () => {
  it('updates pagesRead and appends a reading log entry', () => {
    const books = [{ id: 'b1', pagesRead: 50, readingLogs: [] }]
    const { actions, updateBookItem, updateUserState } = setup({ books })
    actions.logPages('b1', 10)
    expect(updateBookItem).toHaveBeenCalledWith('b1', expect.objectContaining({
      pagesRead: 60,
    }))
    const update = updateBookItem.mock.calls[0][1]
    expect(update.readingLogs).toHaveLength(1)
    expect(update.readingLogs[0].pages).toBe(10)
  })

  it('clamps logged pages to the remaining page count', () => {
    const books = [{ id: 'b1', pageCount: 100, pagesRead: 95, readingLogs: [] }]
    const { actions, updateBookItem } = setup({ books })
    actions.logPages('b1', 10)
    const update = updateBookItem.mock.calls[0][1]
    expect(update.pagesRead).toBe(100)
    expect(update.readingLogs[0].pages).toBe(5)
  })

  it('does nothing when a book is already fully logged', () => {
    const books = [{ id: 'b1', pageCount: 100, pagesRead: 100, readingLogs: [{ pages: 100 }] }]
    const { actions, updateBookItem } = setup({ books })
    actions.logPages('b1', 10)
    expect(updateBookItem).not.toHaveBeenCalled()
  })

  it('does nothing for zero or negative pages', () => {
    const { actions, updateBookItem } = setup({ books: [{ id: 'b1', pagesRead: 0, readingLogs: [] }] })
    actions.logPages('b1', 0)
    expect(updateBookItem).not.toHaveBeenCalled()
    actions.logPages('b1', -5)
    expect(updateBookItem).not.toHaveBeenCalled()
  })

  it('does nothing when book not found', () => {
    const { actions, updateBookItem } = setup({ books: [] })
    actions.logPages('missing', 10)
    expect(updateBookItem).not.toHaveBeenCalled()
  })

  it('records activity', () => {
    const books = [{ id: 'b1', pagesRead: 0, readingLogs: [] }]
    const { actions, updateUserState } = setup({ books })
    actions.logPages('b1', 5)
    expect(updateUserState).toHaveBeenCalled()
  })
})

describe('undoLastPageLog', () => {
  it('removes the latest reading log and subtracts its pages', () => {
    const books = [{
      id: 'b1',
      pagesRead: 35,
      readingLogs: [
        { date: '2026-01-01T00:00:00.000Z', pages: 10 },
        { date: '2026-01-02T00:00:00.000Z', pages: 25 },
      ],
    }]
    const { actions, updateBookItem } = setup({ books })
    actions.undoLastPageLog('b1')
    const update = updateBookItem.mock.calls[0][1]
    expect(update.pagesRead).toBe(10)
    expect(update.readingLogs).toEqual([{ date: '2026-01-01T00:00:00.000Z', pages: 10 }])
  })

  it('does nothing without reading logs', () => {
    const { actions, updateBookItem } = setup({ books: [{ id: 'b1', pagesRead: 0, readingLogs: [] }] })
    actions.undoLastPageLog('b1')
    expect(updateBookItem).not.toHaveBeenCalled()
  })
})

describe('addQuote', () => {
  it('appends a structured quote with text and createdAt', () => {
    const books = [{ id: 'b1', quotes: [] }]
    const { actions, updateBookItem } = setup({ books })
    actions.addQuote('b1', 'Great passage')
    const update = updateBookItem.mock.calls[0][1]
    expect(update.quotes).toHaveLength(1)
    expect(update.quotes[0].text).toBe('Great passage')
    expect(update.quotes[0].createdAt).toBeTruthy()
  })

  it('does nothing for empty text', () => {
    const { actions, updateBookItem } = setup({ books: [{ id: 'b1', quotes: [] }] })
    actions.addQuote('b1', '')
    expect(updateBookItem).not.toHaveBeenCalled()
    actions.addQuote('b1', '   ')
    expect(updateBookItem).not.toHaveBeenCalled()
  })

  it('trims whitespace from text', () => {
    const books = [{ id: 'b1', quotes: [] }]
    const { actions, updateBookItem } = setup({ books })
    actions.addQuote('b1', '  trimmed  ')
    expect(updateBookItem.mock.calls[0][1].quotes[0].text).toBe('trimmed')
  })
})

describe('addReflection', () => {
  it('appends a reflection with date and text', () => {
    const books = [{ id: 'b1', reflections: [] }]
    const { actions, updateBookItem } = setup({ books })
    actions.addReflection('b1', 'Deep thought')
    const update = updateBookItem.mock.calls[0][1]
    expect(update.reflections).toHaveLength(1)
    expect(update.reflections[0].text).toBe('Deep thought')
    expect(update.reflections[0].date).toBeTruthy()
  })

  it('does nothing for empty text', () => {
    const { actions, updateBookItem } = setup({ books: [{ id: 'b1', reflections: [] }] })
    actions.addReflection('b1', null)
    expect(updateBookItem).not.toHaveBeenCalled()
  })
})

describe('study stack actions', () => {
  it('pins an annotation onto the book study stack', () => {
    const books = [{ id: 'b1', title: 'Study Book', studyStack: [] }]
    const { actions, updateBookItem } = setup({ books })

    actions.pinStudyEntry('b1', {
      id: 'ann-1',
      itemId: 'doc-1',
      itemTitle: 'Companion PDF',
      type: 'highlight',
      format: 'pdf',
      text: 'Pinned highlight',
      locationLabel: 'Page 4',
    })

    expect(updateBookItem).toHaveBeenCalledWith('b1', expect.objectContaining({
      studyStack: [expect.objectContaining({
        annotationId: 'ann-1',
        sourceItemId: 'doc-1',
        itemTitle: 'Companion PDF',
        text: 'Pinned highlight',
      })],
    }))
  })

  it('deduplicates a pinned annotation by source key', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studyStack: [{
        id: 'saved-1',
        annotationId: 'ann-1',
        sourceItemId: 'doc-1',
        itemTitle: 'Companion PDF',
        type: 'highlight',
        format: 'pdf',
        text: 'Old text',
        note: 'Keep my note',
        completedAt: '2026-03-03T00:00:00.000Z',
        savedAt: '2026-03-01T00:00:00.000Z',
      }],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.pinStudyEntry('b1', {
      id: 'ann-1',
      itemId: 'doc-1',
      itemTitle: 'Companion PDF',
      type: 'highlight',
      format: 'pdf',
      text: 'New text',
    })

    const update = updateBookItem.mock.calls[0][1]
    expect(update.studyStack).toHaveLength(1)
    expect(update.studyStack[0].text).toBe('New text')
    expect(update.studyStack[0].note).toBe('Keep my note')
    expect(update.studyStack[0].completedAt).toBeNull()
  })

  it('removes a study stack entry', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studyStack: [
        { id: 'saved-1', text: 'Keep' },
        { id: 'saved-2', text: 'Remove me' },
      ],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.removeStudyEntry('b1', 'saved-2')

    expect(updateBookItem).toHaveBeenCalledWith('b1', expect.objectContaining({
      studyStack: [{ id: 'saved-1', text: 'Keep' }],
    }))
  })

  it('updates a study stack note', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studyStack: [{ id: 'saved-1', text: 'Keep', note: '' }],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.updateStudyEntry('b1', 'saved-1', { note: 'Working thesis' })

    expect(updateBookItem).toHaveBeenCalledWith('b1', expect.objectContaining({
      studyStack: [{ id: 'saved-1', text: 'Keep', note: 'Working thesis' }],
    }))
  })

  it('moves a study stack entry up or down', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studyStack: [
        { id: 'saved-1', text: 'First' },
        { id: 'saved-2', text: 'Second' },
        { id: 'saved-3', text: 'Third' },
      ],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.moveStudyEntry('b1', 'saved-3', -1)

    expect(updateBookItem).toHaveBeenCalledWith('b1', expect.objectContaining({
      studyStack: [
        { id: 'saved-1', text: 'First' },
        { id: 'saved-3', text: 'Third' },
        { id: 'saved-2', text: 'Second' },
      ],
    }))
  })

  it('marks a study entry as reviewed', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studyStack: [{ id: 'saved-1', text: 'Keep', lastReviewedAt: null }],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.reviewStudyEntry('b1', 'saved-1')

    expect(updateBookItem).toHaveBeenCalledWith('b1', expect.objectContaining({
      studyStack: [expect.objectContaining({
        id: 'saved-1',
        lastReviewedAt: expect.any(String),
      })],
      studySession: expect.objectContaining({
        startedAt: expect.any(String),
        lastActivityAt: expect.any(String),
        completedAt: null,
      }),
    }))
  })

  it('toggles study entry completion state', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studyStack: [{ id: 'saved-1', text: 'Keep', completedAt: null }],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.toggleStudyEntryComplete('b1', 'saved-1')

    const firstUpdate = updateBookItem.mock.calls[0][1]
    expect(firstUpdate.studyStack[0].completedAt).toEqual(expect.any(String))
    expect(firstUpdate.studySession).toEqual(expect.objectContaining({
      startedAt: expect.any(String),
      lastActivityAt: expect.any(String),
      completedAt: expect.any(String),
    }))
  })

  it('starts a study session without changing stack progress', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studyStack: [{ id: 'saved-1', text: 'Keep', completedAt: null }],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.startStudySession('b1')

    expect(updateBookItem).toHaveBeenCalledWith('b1', expect.objectContaining({
      studySession: expect.objectContaining({
        startedAt: expect.any(String),
        lastActivityAt: expect.any(String),
        completedAt: null,
      }),
    }))
  })

  it('resets study progress and starts a fresh session', () => {
    const books = [{
      id: 'b1',
      title: 'Study Book',
      studySession: {
        startedAt: '2026-03-10T10:00:00.000Z',
        lastActivityAt: '2026-03-10T10:15:00.000Z',
        completedAt: '2026-03-10T10:15:00.000Z',
      },
      studyStack: [
        { id: 'saved-1', text: 'Keep', completedAt: '2026-03-10T10:10:00.000Z' },
        { id: 'saved-2', text: 'Again', completedAt: null },
      ],
    }]
    const { actions, updateBookItem } = setup({ books })

    actions.resetStudySession('b1')

    const update = updateBookItem.mock.calls[0][1]
    expect(update.studyStack.every((entry) => entry.completedAt === null)).toBe(true)
    expect(update.studySession).toEqual(expect.objectContaining({
      startedAt: expect.any(String),
      lastActivityAt: expect.any(String),
      completedAt: null,
    }))
  })
})

describe('addShelf / deleteShelf', () => {
  it('addShelf calls updateShelvesState with a new shelf', () => {
    const { actions, updateShelvesState } = setup()
    actions.addShelf('Reading List')
    expect(updateShelvesState).toHaveBeenCalled()
    const updater = updateShelvesState.mock.calls[0][0]
    const result = updater([])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Reading List')
    expect(result[0].id).toBeTruthy()
  })

  it('deleteShelf removes the shelf and updates items', () => {
    const shelves = [{ id: 's1', name: 'shelf' }]
    const books = [{ id: 'book-1', shelves: ['s1', 's2'] }]
    const documents = [{ id: 'doc-1', shelves: ['s1'] }]
    const { actions, updateShelvesState, updateBookItem, updateDocumentItem } = setup({ shelves, books, documents })
    actions.deleteShelf('s1')
    expect(updateShelvesState).toHaveBeenCalled()
    expect(updateBookItem).toHaveBeenCalledWith('book-1', { shelves: ['s2'] })
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', { shelves: [] })
  })

  it('deleteShelf ignores "all"', () => {
    const { actions, updateShelvesState } = setup()
    actions.deleteShelf('all')
    expect(updateShelvesState).not.toHaveBeenCalled()
  })
})

describe('updateDocumentMeta', () => {
  it('calls updateDocumentItem', () => {
    const { actions, updateDocumentItem } = setup()
    actions.updateDocumentMeta('doc-1', { title: 'Updated' })
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', { title: 'Updated' })
  })

  it('does nothing without docId', () => {
    const { actions, updateDocumentItem } = setup()
    actions.updateDocumentMeta(null, { title: 'X' })
    expect(updateDocumentItem).not.toHaveBeenCalled()
  })
})

describe('scheduleDocumentMetaUpdate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules a delayed update', () => {
    vi.useFakeTimers()
    const { actions, updateDocumentItem } = setup()
    actions.scheduleDocumentMetaUpdate('doc-1', { page: 5 }, 100)
    expect(updateDocumentItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', { page: 5 })
  })

  it('debounces rapid calls', () => {
    vi.useFakeTimers()
    const { actions, updateDocumentItem } = setup()
    actions.scheduleDocumentMetaUpdate('doc-1', { page: 1 }, 100)
    actions.scheduleDocumentMetaUpdate('doc-1', { page: 2 }, 100)
    vi.advanceTimersByTime(100)
    expect(updateDocumentItem).toHaveBeenCalledTimes(1)
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', { page: 2 })
  })

  it('merges different pending fields for the same document', () => {
    vi.useFakeTimers()
    const { actions, updateDocumentItem } = setup()
    actions.scheduleDocumentMetaUpdate('doc-1', { lastLocationJson: { page: 3 } }, 100)
    actions.scheduleDocumentMetaUpdate('doc-1', { progressPercent: 42 }, 100)
    vi.advanceTimersByTime(100)
    expect(updateDocumentItem).toHaveBeenCalledTimes(1)
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', {
      lastLocationJson: { page: 3 },
      progressPercent: 42,
    })
  })

  it('flushes pending document metadata immediately before durable operations', () => {
    vi.useFakeTimers()
    const { actions, updateDocumentItem, docUpdateTimersRef } = setup()
    actions.scheduleDocumentMetaUpdate('doc-1', { lastLocationJson: { page: 3 } }, 100)
    actions.scheduleDocumentMetaUpdate('doc-1', { progressPercent: 42 }, 100)

    expect(actions.flushPendingDocumentMetaUpdates()).toBe(1)

    expect(updateDocumentItem).toHaveBeenCalledTimes(1)
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', {
      lastLocationJson: { page: 3 },
      progressPercent: 42,
    })
    expect(docUpdateTimersRef.current.size).toBe(0)

    vi.advanceTimersByTime(100)
    expect(updateDocumentItem).toHaveBeenCalledTimes(1)
  })
})

describe('addDocumentNote', () => {
  it('appends a note to the document', async () => {
    const docs = [{ id: 'doc-1', notes: [] }]
    const { actions, updateDocumentItem } = setup({ documents: docs })
    const result = await actions.addDocumentNote('doc-1', { text: 'A note', page: 3 })
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('A note')
    expect(result[0].page).toBe(3)
    expect(result[0].id).toBeTruthy()
  })

  it('returns null without docId', async () => {
    const { actions } = setup()
    const result = await actions.addDocumentNote(null, { text: 'X' })
    expect(result).toBeNull()
  })
})
