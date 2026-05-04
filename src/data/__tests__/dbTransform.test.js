import { describe, expect, it } from 'vitest'
import { buildSearchText } from '../dbTransform'

describe('buildSearchText', () => {
  it('includes study stack text for books', () => {
    const text = buildSearchText({
      kind: 'book',
      title: 'Deep Work',
      author: 'Cal Newport',
      tags: ['focus'],
      bookMeta: {
        studyStack: [{ text: 'Attention residue is real.', note: 'Pair this with the chapter on shutdown rituals.' }],
      },
    })

    expect(text).toContain('Attention residue is real.')
    expect(text).toContain('Pair this with the chapter on shutdown rituals.')
  })

  it('includes linked book context for documents', () => {
    const text = buildSearchText(
      {
        kind: 'document',
        title: 'City Planning PDF',
        author: 'Civic Desk',
        tags: ['research'],
        docMeta: { searchText: 'zoning maps' },
        annotations: { notes: [], highlights: [] },
      },
      {
        linkedBook: { id: 'book-1', title: 'The City & the Shelf', author: 'Ada North' },
      }
    )

    expect(text).toContain('Attached to The City & the Shelf')
    expect(text).toContain('Ada North')
  })
})
