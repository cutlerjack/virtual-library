import { describe, it, expect } from 'vitest'
import {
  selectAllTags,
  selectAllLibraryTags,
  selectBooksFinishedThisYear,
  selectQuoteCount,
  selectContinueReadingDocs,
  selectFilteredBooks,
  selectSortedBooks,
  selectAllAnnotations,
  selectBookReadingTrail,
  selectBookStudyStack,
  selectStudySessionState,
  selectStudyVolumes,
} from '../librarySelectors'

const makeBook = (overrides = {}) => ({
  id: 'book-1',
  title: 'Test Book',
  tags: [],
  quotes: [],
  shelves: [],
  addedAt: '2024-01-01',
  ...overrides,
})

const makeDoc = (overrides = {}) => ({
  id: 'doc-1',
  title: 'Test Doc',
  type: 'pdf',
  lastOpened: '2024-06-01',
  fileStatus: 'ok',
  notes: [],
  highlights: [],
  ...overrides,
})

describe('selectAllTags', () => {
  it('returns empty array for no books', () => {
    expect(selectAllTags([])).toEqual([])
  })

  it('collects and deduplicates tags', () => {
    const books = [
      makeBook({ tags: ['sci-fi', 'adventure'] }),
      makeBook({ id: 'b2', tags: ['sci-fi', 'horror'] }),
    ]
    expect(selectAllTags(books)).toEqual(['adventure', 'horror', 'sci-fi'])
  })

  it('returns sorted tags', () => {
    const books = [makeBook({ tags: ['zebra', 'alpha', 'mango'] })]
    expect(selectAllTags(books)).toEqual(['alpha', 'mango', 'zebra'])
  })

  it('handles books with no tags property', () => {
    const books = [{ id: 'b1', title: 'No tags' }]
    expect(selectAllTags(books)).toEqual([])
  })
})

describe('selectAllLibraryTags', () => {
  it('collects tags across books and documents', () => {
    const books = [makeBook({ tags: ['design', 'systems'] })]
    const docs = [makeDoc({ tags: ['systems', 'pdf'] })]
    expect(selectAllLibraryTags(books, docs)).toEqual(['design', 'pdf', 'systems'])
  })

  it('handles empty inputs', () => {
    expect(selectAllLibraryTags([], [])).toEqual([])
  })
})

describe('selectBooksFinishedThisYear', () => {
  it('counts books finished this year', () => {
    const now = new Date('2024-06-15')
    const books = [
      makeBook({ dateFinished: '2024-03-01' }),
      makeBook({ id: 'b2', dateFinished: '2024-01-15' }),
      makeBook({ id: 'b3', dateFinished: '2023-12-31' }),
    ]
    expect(selectBooksFinishedThisYear(books, now)).toBe(2)
  })

  it('returns 0 with no finished books', () => {
    const books = [makeBook(), makeBook({ id: 'b2' })]
    expect(selectBooksFinishedThisYear(books)).toBe(0)
  })

  it('excludes books without dateFinished', () => {
    const books = [makeBook({ dateFinished: null })]
    expect(selectBooksFinishedThisYear(books)).toBe(0)
  })
})

describe('selectQuoteCount', () => {
  it('sums quotes across books', () => {
    const books = [
      makeBook({ quotes: ['q1', 'q2'] }),
      makeBook({ id: 'b2', quotes: ['q3'] }),
    ]
    expect(selectQuoteCount(books)).toBe(3)
  })

  it('returns 0 for empty quotes', () => {
    expect(selectQuoteCount([makeBook()])).toBe(0)
  })

  it('handles mixed string and object quotes', () => {
    const books = [
      makeBook({ quotes: ['text', { text: 'obj', createdAt: '2024-01-01' }] }),
    ]
    expect(selectQuoteCount(books)).toBe(2)
  })
})

describe('selectContinueReadingDocs', () => {
  it('returns docs sorted by lastOpened, limited', () => {
    const docs = [
      makeDoc({ id: 'd1', lastOpened: '2024-01-01' }),
      makeDoc({ id: 'd2', lastOpened: '2024-06-01' }),
      makeDoc({ id: 'd3', lastOpened: '2024-03-01' }),
      makeDoc({ id: 'd4', lastOpened: '2024-04-01' }),
      makeDoc({ id: 'd5', lastOpened: '2024-05-01' }),
    ]
    const result = selectContinueReadingDocs(docs, 4)
    expect(result.map((d) => d.id)).toEqual(['d2', 'd5', 'd4', 'd3'])
  })

  it('excludes docs without lastOpened', () => {
    const docs = [makeDoc({ lastOpened: null })]
    expect(selectContinueReadingDocs(docs)).toEqual([])
  })

  it('excludes missing files', () => {
    const docs = [makeDoc({ fileStatus: 'missing' })]
    expect(selectContinueReadingDocs(docs)).toEqual([])
  })

  it('excludes unsupported types', () => {
    const docs = [makeDoc({ type: 'file' })]
    expect(selectContinueReadingDocs(docs)).toEqual([])
  })
})

describe('selectFilteredBooks', () => {
  it('returns all books when shelf is "all" and no tags', () => {
    const books = [makeBook(), makeBook({ id: 'b2' })]
    expect(selectFilteredBooks(books, 'all', [])).toHaveLength(2)
  })

  it('filters by shelf', () => {
    const books = [
      makeBook({ shelves: ['shelf-1'] }),
      makeBook({ id: 'b2', shelves: ['shelf-2'] }),
    ]
    expect(selectFilteredBooks(books, 'shelf-1', [])).toHaveLength(1)
    expect(selectFilteredBooks(books, 'shelf-1', [])[0].id).toBe('book-1')
  })

  it('filters by tags (AND logic)', () => {
    const books = [
      makeBook({ tags: ['sci-fi', 'adventure'] }),
      makeBook({ id: 'b2', tags: ['sci-fi'] }),
    ]
    expect(selectFilteredBooks(books, 'all', ['sci-fi', 'adventure'])).toHaveLength(1)
  })

  it('combines shelf and tag filters', () => {
    const books = [
      makeBook({ shelves: ['s1'], tags: ['fiction'] }),
      makeBook({ id: 'b2', shelves: ['s1'], tags: ['nonfiction'] }),
      makeBook({ id: 'b3', shelves: ['s2'], tags: ['fiction'] }),
    ]
    expect(selectFilteredBooks(books, 's1', ['fiction'])).toHaveLength(1)
  })
})

describe('selectSortedBooks', () => {
  const books = [
    makeBook({ title: 'Zebra', spineColor: '#fff', tags: ['comedy'], addedAt: '2024-01-01' }),
    makeBook({ id: 'b2', title: 'Alpha', spineColor: '#000', tags: ['action'], addedAt: '2024-06-01' }),
    makeBook({ id: 'b3', title: 'Mango', spineColor: '#aaa', tags: ['drama'], addedAt: '2024-03-01' }),
  ]

  it('sorts by title', () => {
    const sorted = selectSortedBooks(books, 'title')
    expect(sorted.map((b) => b.title)).toEqual(['Alpha', 'Mango', 'Zebra'])
  })

  it('sorts by color', () => {
    const sorted = selectSortedBooks(books, 'color')
    expect(sorted.map((b) => b.spineColor)).toEqual(['#000', '#aaa', '#fff'])
  })

  it('sorts by genre (first tag)', () => {
    const sorted = selectSortedBooks(books, 'genre')
    expect(sorted.map((b) => b.tags[0])).toEqual(['action', 'comedy', 'drama'])
  })

  it('sorts by recent (newest first)', () => {
    const sorted = selectSortedBooks(books, 'recent')
    expect(sorted.map((b) => b.id)).toEqual(['b2', 'b3', 'book-1'])
  })

  it('defaults to recent for unknown sort mode', () => {
    const sorted = selectSortedBooks(books, 'unknown')
    expect(sorted.map((b) => b.id)).toEqual(['b2', 'b3', 'book-1'])
  })

  it('does not mutate the input array', () => {
    const original = [...books]
    selectSortedBooks(books, 'title')
    expect(books).toEqual(original)
  })
})

describe('selectAllAnnotations', () => {
  it('returns empty array for no items', () => {
    expect(selectAllAnnotations([], [])).toEqual([])
  })

  it('collects book notes', () => {
    const books = [makeBook({ notes: 'My note' })]
    const annotations = selectAllAnnotations(books, [])
    expect(annotations).toHaveLength(1)
    expect(annotations[0].type).toBe('note')
    expect(annotations[0].text).toBe('My note')
  })

  it('collects book string quotes', () => {
    const books = [makeBook({ quotes: ['Quote A'] })]
    const annotations = selectAllAnnotations(books, [])
    expect(annotations).toHaveLength(1)
    expect(annotations[0].type).toBe('quote')
    expect(annotations[0].text).toBe('Quote A')
  })

  it('collects book object quotes', () => {
    const books = [makeBook({ quotes: [{ text: 'Quote B', createdAt: '2024-06-01' }] })]
    const annotations = selectAllAnnotations(books, [])
    expect(annotations[0].text).toBe('Quote B')
    expect(annotations[0].createdAt).toBe('2024-06-01')
  })

  it('collects book reflections', () => {
    const books = [makeBook({ reflections: [{ date: '2024-01-01', text: 'Deep thought' }] })]
    const annotations = selectAllAnnotations(books, [])
    expect(annotations).toHaveLength(1)
    expect(annotations[0].type).toBe('reflection')
    expect(annotations[0].text).toBe('Deep thought')
  })

  it('collects document notes with location', () => {
    const docs = [makeDoc({ notes: [{ id: 'n1', text: 'Note', page: 5 }] })]
    const annotations = selectAllAnnotations([], docs)
    expect(annotations).toHaveLength(1)
    expect(annotations[0].locationLabel).toBe('Page 5')
  })

  it('collects document highlights', () => {
    const docs = [makeDoc({ highlights: [{ id: 'h1', text: 'Highlighted', page: 3 }] })]
    const annotations = selectAllAnnotations([], docs)
    expect(annotations).toHaveLength(1)
    expect(annotations[0].type).toBe('highlight')
  })

  it('includes linked book context for document annotations', () => {
    const books = [makeBook({ id: 'book-2', title: 'Linked Volume' })]
    const docs = [makeDoc({
      linkedBookId: 'book-2',
      notes: [{ id: 'n1', text: 'Note', page: 5 }],
    })]
    const annotations = selectAllAnnotations(books, docs)
    expect(annotations[0].linkedBookId).toBe('book-2')
    expect(annotations[0].linkedBookTitle).toBe('Linked Volume')
  })

  it('sorts by createdAt descending', () => {
    const books = [
      makeBook({
        notes: 'Old note',
        lastTouched: '2023-01-01',
        quotes: [{ text: 'New quote', createdAt: '2024-12-01' }],
      }),
    ]
    const annotations = selectAllAnnotations(books, [])
    expect(annotations[0].type).toBe('quote')
    expect(annotations[1].type).toBe('note')
  })

  it('unifies books and documents into one list', () => {
    const books = [makeBook({ quotes: ['Q1'] })]
    const docs = [makeDoc({ highlights: [{ id: 'h1', text: 'H1' }] })]
    const annotations = selectAllAnnotations(books, docs)
    expect(annotations).toHaveLength(2)
    const types = annotations.map((a) => a.type)
    expect(types).toContain('quote')
    expect(types).toContain('highlight')
  })
})

describe('selectBookReadingTrail', () => {
  it('merges a book with annotations from linked documents', () => {
    const book = makeBook({
      id: 'book-9',
      title: 'Deep Work',
      quotes: [{ text: 'Quote', createdAt: '2024-01-02' }],
      reflections: [{ text: 'Reflection', date: '2024-01-03' }],
    })
    const documents = [
      makeDoc({
        id: 'doc-9',
        title: 'Companion Essay',
        linkedBookId: 'book-9',
        notes: [{ id: 'n-1', text: 'Doc note', createdAt: '2024-01-04', page: 12 }],
      }),
      makeDoc({
        id: 'doc-10',
        title: 'Unrelated',
        linkedBookId: 'book-10',
        notes: [{ id: 'n-2', text: 'Ignore me', createdAt: '2024-01-05' }],
      }),
    ]

    const trail = selectBookReadingTrail(book, documents, 10)

    expect(trail).toHaveLength(3)
    expect(trail[0].text).toBe('Doc note')
    expect(trail[0].itemTitle).toBe('Companion Essay')
    expect(trail[0].linkedBookTitle).toBe('Deep Work')
    expect(trail.map((entry) => entry.text)).toEqual(['Doc note', 'Reflection', 'Quote'])
  })
})

describe('study stack selectors', () => {
  it('preserves the stored study stack order', () => {
    const book = makeBook({
      studyStack: [
        { id: 's1', text: 'Older', savedAt: '2026-03-01T00:00:00.000Z' },
        { id: 's2', text: 'Newer', savedAt: '2026-03-05T00:00:00.000Z' },
      ],
    })

    const stack = selectBookStudyStack(book, 10)
    expect(stack.map((entry) => entry.text)).toEqual(['Older', 'Newer'])
  })

  it('returns active study volumes ahead of ready ones', () => {
    const books = [
      makeBook({
        id: 'book-1',
        title: 'First',
        studySession: { startedAt: '2026-03-06T00:00:00.000Z', lastActivityAt: '2026-03-06T00:30:00.000Z', completedAt: null },
        studyStack: [{ id: 'a', text: 'One', savedAt: '2026-03-03T00:00:00.000Z' }],
      }),
      makeBook({
        id: 'book-2',
        title: 'Second',
        studyStack: [{ id: 'b', text: 'Two', savedAt: '2026-03-05T00:00:00.000Z' }],
      }),
      makeBook({ id: 'book-3', title: 'Third', studyStack: [] }),
    ]

    const volumes = selectStudyVolumes(books, 10)
    expect(volumes).toHaveLength(2)
    expect(volumes[0].book.title).toBe('First')
    expect(volumes[0].status).toBe('active')
    expect(volumes[1].book.title).toBe('Second')
  })

  it('computes active study session progress and next entry', () => {
    const book = makeBook({
      studySession: {
        startedAt: '2026-03-02T00:00:00.000Z',
        lastActivityAt: '2026-03-02T00:30:00.000Z',
        completedAt: null,
      },
      studyStack: [
        { id: 's1', text: 'Finished', completedAt: '2026-03-01T00:00:00.000Z' },
        { id: 's2', text: 'Next up', completedAt: null, lastReviewedAt: '2026-03-02T01:00:00.000Z' },
        { id: 's3', text: 'Later', completedAt: null },
      ],
    })

    const session = selectStudySessionState(book)
    expect(session.totalCount).toBe(3)
    expect(session.completedCount).toBe(1)
    expect(session.remainingCount).toBe(2)
    expect(session.nextEntry.text).toBe('Next up')
    expect(session.isComplete).toBe(false)
    expect(session.status).toBe('active')
    expect(session.reviewedThisSessionCount).toBe(1)
  })

  it('treats a fully completed stack as a completed session', () => {
    const book = makeBook({
      studyStack: [
        { id: 's1', text: 'Done 1', completedAt: '2026-03-03T00:00:00.000Z' },
        { id: 's2', text: 'Done 2', completedAt: '2026-03-04T00:00:00.000Z' },
      ],
    })

    const session = selectStudySessionState(book)
    expect(session.status).toBe('complete')
    expect(session.isComplete).toBe(true)
    expect(session.completedAt).toBe('2026-03-04T00:00:00.000Z')
  })
})
