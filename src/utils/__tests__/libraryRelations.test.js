import { describe, expect, it } from 'vitest'
import {
  scoreBookDocumentMatch,
  selectAutomaticBookMatch,
  suggestBooksForDocument,
  suggestDocumentsForBook,
} from '../libraryRelations'

describe('scoreBookDocumentMatch', () => {
  it('scores exact title and author matches strongly', () => {
    const match = scoreBookDocumentMatch(
      { id: 'book-1', title: 'The City & the Shelf', author: 'Ada North' },
      { id: 'doc-1', title: 'The City and the Shelf.pdf', author: 'Ada North' }
    )

    expect(match.score).toBeGreaterThanOrEqual(12)
    expect(match.reasons).toContain('Exact title match')
    expect(match.reasons).toContain('Author matches')
  })

  it('can match on isbn text inside the document corpus', () => {
    const match = scoreBookDocumentMatch(
      { id: 'book-1', title: 'Unrelated', author: 'Ada North', isbn: '978-1-4028-9462-6' },
      { id: 'doc-1', title: 'Scan notes', author: 'Archivist', searchText: 'Includes ISBN 9781402894626 in the footer.' }
    )

    expect(match.score).toBeGreaterThanOrEqual(10)
    expect(match.reasons).toContain('ISBN appears in the document')
  })
})

describe('suggestBooksForDocument', () => {
  it('returns the best matching book first', () => {
    const suggestions = suggestBooksForDocument(
      { id: 'doc-1', title: 'Field Notes on the Block', author: 'Ada North' },
      [
        { id: 'book-2', title: 'Completely Different', author: 'Elsewhere' },
        { id: 'book-1', title: 'Field Notes on the Block', author: 'Ada North' },
      ]
    )

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].book.id).toBe('book-1')
  })

  it('respects dismissed book ids by default', () => {
    const suggestions = suggestBooksForDocument(
      {
        id: 'doc-1',
        title: 'Field Notes on the Block',
        author: 'Ada North',
        dismissedBookIds: ['book-1'],
      },
      [
        { id: 'book-1', title: 'Field Notes on the Block', author: 'Ada North' },
      ]
    )

    expect(suggestions).toEqual([])
  })
})

describe('suggestDocumentsForBook', () => {
  it('filters out weak matches', () => {
    const suggestions = suggestDocumentsForBook(
      { id: 'book-1', title: 'The City & the Shelf', author: 'Ada North' },
      [
        { id: 'doc-1', title: 'The City & the Shelf Notes', author: 'Ada North' },
        { id: 'doc-2', title: 'Bird Census', author: 'Park Office' },
      ]
    )

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].doc.id).toBe('doc-1')
  })
})

describe('selectAutomaticBookMatch', () => {
  it('returns a strong unambiguous match', () => {
    const match = selectAutomaticBookMatch(
      { id: 'doc-1', title: 'The City & the Shelf Notes', author: 'Ada North' },
      [
        { id: 'book-1', title: 'The City & the Shelf', author: 'Ada North' },
        { id: 'book-2', title: 'Other Volume', author: 'Elsewhere' },
      ]
    )

    expect(match?.book.id).toBe('book-1')
  })

  it('refuses ambiguous automatic matches', () => {
    const match = selectAutomaticBookMatch(
      { id: 'doc-1', title: 'Collected Essays', author: 'Ada North' },
      [
        { id: 'book-1', title: 'Collected Essays', author: 'Ada North' },
        { id: 'book-2', title: 'Collected Essays', author: 'Ada North' },
      ]
    )

    expect(match).toBeNull()
  })
})
