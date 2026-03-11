import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
    docUpdateTimersRef,
  })

  return {
    actions,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
  }
}

function bookToItem(book) {
  return { id: book.id, kind: 'book', title: book.title }
}

function docToItem(doc) {
  return { id: doc.id, kind: 'document', title: doc.title }
}

describe('addBook', () => {
  it('calls updateLibraryState with a new item', () => {
    const { actions, updateLibraryState } = setup()
    const result = actions.addBook({ title: 'New Book', author: 'Author' })
    expect(result).toHaveProperty('id')
    expect(result.title).toBe('New Book')
    expect(result.rating).toBe(0)
    expect(result.quotes).toEqual([])
    expect(updateLibraryState).toHaveBeenCalled()
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
  it('calls updateLibraryState filtering out the book', () => {
    const { actions, updateLibraryState } = setup()
    actions.deleteBook('book-1')
    expect(updateLibraryState).toHaveBeenCalled()
    const updater = updateLibraryState.mock.calls[0][0]
    const result = updater({ items: [{ id: 'book-1' }, { id: 'book-2' }] })
    expect(result.items).toEqual([{ id: 'book-2' }])
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
    const { actions, updateShelvesState, updateLibraryState } = setup({ shelves })
    actions.deleteShelf('s1')
    expect(updateShelvesState).toHaveBeenCalled()
    expect(updateLibraryState).toHaveBeenCalled()
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
  it('schedules a delayed update', () => {
    vi.useFakeTimers()
    const { actions, updateDocumentItem } = setup()
    actions.scheduleDocumentMetaUpdate('doc-1', { page: 5 }, 100)
    expect(updateDocumentItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', { page: 5 })
    vi.useRealTimers()
  })

  it('debounces rapid calls', () => {
    vi.useFakeTimers()
    const { actions, updateDocumentItem } = setup()
    actions.scheduleDocumentMetaUpdate('doc-1', { page: 1 }, 100)
    actions.scheduleDocumentMetaUpdate('doc-1', { page: 2 }, 100)
    vi.advanceTimersByTime(100)
    expect(updateDocumentItem).toHaveBeenCalledTimes(1)
    expect(updateDocumentItem).toHaveBeenCalledWith('doc-1', { page: 2 })
    vi.useRealTimers()
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
