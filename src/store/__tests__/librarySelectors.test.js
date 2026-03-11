import { describe, it, expect } from 'vitest'
import {
  selectAllTags,
  selectBooksFinishedThisYear,
  selectQuoteCount,
  selectContinueReadingDocs,
  selectFilteredBooks,
  selectSortedBooks,
  selectAllAnnotations,
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
