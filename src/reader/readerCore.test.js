import { describe, expect, it } from 'vitest'
import {
  normalizeLocation,
  buildPdfLocation,
  buildEpubLocation,
  buildArticleLocation,
  findRelatedNotes,
} from './readerCore'

describe('readerCore', () => {
  it('normalizes locations safely', () => {
    expect(normalizeLocation(null)).toBeNull()
    const location = normalizeLocation({ kind: 'pdf', page: 3, scrollOffset: 120 })
    expect(location).toEqual({
      kind: 'pdf',
      page: 3,
      cfi: null,
      xpath: null,
      scrollOffset: 120,
      yOffsetWithinPage: null,
      anchorId: null,
      rects: null,
    })
  })

  it('builds canonical locations', () => {
    expect(buildPdfLocation(4)).toEqual(expect.objectContaining({ kind: 'pdf', page: 4 }))
    expect(buildEpubLocation('epubcfi(/6/2)')).toEqual(expect.objectContaining({ kind: 'epub', cfi: 'epubcfi(/6/2)' }))
    expect(buildArticleLocation(480)).toEqual(expect.objectContaining({ kind: 'article', scrollOffset: 480 }))
  })

  it('finds related notes by location', () => {
    const notes = [
      { id: 'a', page: 3, text: 'p3' },
      { id: 'b', page: 4, text: 'p4' },
      { id: 'c', cfi: 'epubcfi(/6/2[chap]!/4/2/14)', text: 'epub' },
      { id: 'd', scrollOffset: 1200, text: 'article' },
    ]

    const pdfRelated = findRelatedNotes(notes, buildPdfLocation(4))
    expect(pdfRelated.map((note) => note.id)).toEqual(['a', 'b'])

    const epubRelated = findRelatedNotes(notes, buildEpubLocation('epubcfi(/6/2[chap]!/4/2/18)'))
    expect(epubRelated.map((note) => note.id)).toEqual(['c'])

    const articleRelated = findRelatedNotes(notes, buildArticleLocation(1700))
    expect(articleRelated.map((note) => note.id)).toEqual(['d'])
  })
})
