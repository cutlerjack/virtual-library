import { describe, it, expect } from 'vitest'
import {
  createBookItemFromBook,
  createDocumentItemFromDoc,
  itemToBook,
  itemToDocument,
  mergeBookIntoItem,
  mergeDocumentIntoItem,
  migrateLibraryStateToV2,
  migrateLibraryStateToV3,
  migrateLibraryState,
  normalizeBookItem,
} from '../librarySchema'

describe('library schema', () => {
  it('migrateLibraryStateToV2 applies spine library entries and preserves spine fields', () => {
    const spineImage = 'data:image/png;base64,abc'
    const crop = { zoom: 1.2, offsetX: 10, offsetY: -5 }
    const state = {
      version: 1,
      items: [
        {
          id: 'book-1',
          kind: 'book',
          title: 'Test Book',
          author: 'Author',
          bookMeta: {
            isbn: '9781234567897',
            spineFont: 'cinzel',
          },
          description: 'unused',
        },
      ],
      shelves: [],
      user: {},
      spineLibrary: {
        '9781234567897': {
          isbn: '9781234567897',
          spineImage,
          crop,
        },
      },
    }

    const migrated = migrateLibraryStateToV2(state)
    expect(migrated.version).toBe(2)
    const book = migrated.items[0]
    expect(book.bookMeta.spineImage).toBe(spineImage)
    expect(book.bookMeta.spineCrop).toEqual(crop)
    expect(book.bookMeta.spineSource).toBe('photo')
    expect(book.bookMeta.spineFont).toBe('cinzel')
    expect('description' in book).toBe(false)
  })

  it('createBookItemFromBook keeps spine metadata', () => {
    const item = createBookItemFromBook({
      id: 'book-2',
      title: 'Spine Test',
      author: 'Author',
      spineImage: 'data:image/jpeg;base64,xyz',
      spineCrop: { zoom: 1, offsetX: 0, offsetY: 0 },
      spineFont: 'playfair',
      spineTexture: 'leather',
      spineColor: '#123456',
    })

    expect(item.bookMeta.spineImage).toBe('data:image/jpeg;base64,xyz')
    expect(item.bookMeta.spineCrop).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 })
    expect(item.bookMeta.spineFont).toBe('playfair')
    expect(item.bookMeta.spineTexture).toBe('leather')
    expect(item.bookMeta.spineColor).toBe('#123456')
  })

  it('createBookItemFromBook keeps study stack metadata', () => {
    const item = createBookItemFromBook({
      id: 'book-study',
      title: 'Study Volume',
      studySession: {
        startedAt: '2026-03-10T08:00:00.000Z',
        lastActivityAt: '2026-03-11T09:00:00.000Z',
        completedAt: '2026-03-12T10:00:00.000Z',
      },
      studyStack: [{
        id: 'stack-1',
        annotationId: 'ann-1',
        sourceItemId: 'doc-1',
        itemTitle: 'Companion PDF',
        type: 'highlight',
        format: 'pdf',
        text: 'Pinned passage',
        note: 'Compare this against chapter three.',
        location: { kind: 'pdf', page: 7 },
        locationLabel: 'Page 7',
        savedAt: '2026-03-10T12:00:00.000Z',
        lastReviewedAt: '2026-03-11T12:00:00.000Z',
        completedAt: '2026-03-12T12:00:00.000Z',
      }],
    })

    expect(item.bookMeta.studyStack).toHaveLength(1)
    expect(item.bookMeta.studyStack[0].text).toBe('Pinned passage')
    expect(item.bookMeta.studyStack[0].note).toBe('Compare this against chapter three.')
    expect(item.bookMeta.studyStack[0].lastReviewedAt).toBe('2026-03-11T12:00:00.000Z')
    expect(item.bookMeta.studyStack[0].completedAt).toBe('2026-03-12T12:00:00.000Z')
    expect(item.bookMeta.studySession).toEqual({
      startedAt: '2026-03-10T08:00:00.000Z',
      lastActivityAt: '2026-03-11T09:00:00.000Z',
      completedAt: '2026-03-12T10:00:00.000Z',
    })

    const book = itemToBook(item)
    expect(book.studyStack).toHaveLength(1)
    expect(book.studyStack[0].itemTitle).toBe('Companion PDF')
    expect(book.studyStack[0].note).toBe('Compare this against chapter three.')
    expect(book.studyStack[0].lastReviewedAt).toBe('2026-03-11T12:00:00.000Z')
    expect(book.studyStack[0].completedAt).toBe('2026-03-12T12:00:00.000Z')
    expect(book.studySession).toEqual({
      startedAt: '2026-03-10T08:00:00.000Z',
      lastActivityAt: '2026-03-11T09:00:00.000Z',
      completedAt: '2026-03-12T10:00:00.000Z',
    })
  })

  it('mergeBookIntoItem preserves existing meta when partial updates apply', () => {
    const base = createBookItemFromBook({
      id: 'book-3',
      title: 'Original',
      author: 'Author',
      spineImage: 'data:image/png;base64,keep',
      spineFont: 'cinzel',
      publishedDate: '1999',
    })

    const merged = mergeBookIntoItem(base, { title: 'Updated' })
    expect(merged.title).toBe('Updated')
    expect(merged.bookMeta.spineImage).toBe('data:image/png;base64,keep')
    expect(merged.bookMeta.spineFont).toBe('cinzel')
    expect(merged.bookMeta.publishedDate).toBe('1999')
  })

  it('mergeBookIntoItem updates study stack when provided', () => {
    const base = createBookItemFromBook({
      id: 'book-3b',
      title: 'Original',
      studySession: { startedAt: '2026-03-01T08:00:00.000Z', lastActivityAt: '2026-03-01T08:30:00.000Z', completedAt: null },
      studyStack: [{ id: 'stack-old', text: 'Old', itemTitle: 'Book', savedAt: '2026-03-01T00:00:00.000Z' }],
    })

    const merged = mergeBookIntoItem(base, {
      studySession: { startedAt: '2026-03-02T08:00:00.000Z', lastActivityAt: '2026-03-02T09:15:00.000Z', completedAt: '2026-03-02T09:15:00.000Z' },
      studyStack: [{ id: 'stack-new', text: 'New', itemTitle: 'Doc', savedAt: '2026-03-02T00:00:00.000Z' }],
    })

    expect(merged.bookMeta.studyStack).toHaveLength(1)
    expect(merged.bookMeta.studyStack[0].text).toBe('New')
    expect(merged.bookMeta.studySession).toEqual({
      startedAt: '2026-03-02T08:00:00.000Z',
      lastActivityAt: '2026-03-02T09:15:00.000Z',
      completedAt: '2026-03-02T09:15:00.000Z',
    })
  })

  it('createDocumentItemFromDoc keeps article metadata', () => {
    const item = createDocumentItemFromDoc({
      id: 'doc-1',
      kind: 'article',
      type: 'article',
      title: 'Essay',
      author: 'Site',
      linkedBookId: 'book-77',
      dismissedBookIds: ['book-10', 'book-11', 'book-10'],
      sourceUrl: 'https://example.com',
      publishedDate: '2024-01-01',
    })

    expect(item.kind).toBe('article')
    expect(item.docMeta.type).toBe('article')
    expect(item.docMeta.linkedBookId).toBe('book-77')
    expect(item.docMeta.dismissedBookIds).toEqual(['book-10', 'book-11'])
    expect(item.docMeta.sourceUrl).toBe('https://example.com')
    expect(item.docMeta.publishedDate).toBe('2024-01-01')

    const doc = itemToDocument(item)
    expect(doc.type).toBe('article')
    expect(doc.linkedBookId).toBe('book-77')
    expect(doc.dismissedBookIds).toEqual(['book-10', 'book-11'])
    expect(doc.publishedDate).toBe('2024-01-01')
  })

  it('mergeDocumentIntoItem preserves meta on partial updates', () => {
    const base = createDocumentItemFromDoc({
      id: 'doc-2',
      title: 'Whitepaper',
      type: 'pdf',
      fileHash: 'hash-1',
      linkedBookId: 'book-1',
      publishedDate: '2020-06-01',
    })

    const merged = mergeDocumentIntoItem(base, { title: 'Updated Whitepaper' })
    expect(merged.title).toBe('Updated Whitepaper')
    expect(merged.docMeta.fileHash).toBe('hash-1')
    expect(merged.docMeta.linkedBookId).toBe('book-1')
    expect(merged.docMeta.publishedDate).toBe('2020-06-01')
  })

  it('mergeDocumentIntoItem allows clearing a linked book', () => {
    const base = createDocumentItemFromDoc({
      id: 'doc-2b',
      title: 'Whitepaper',
      type: 'pdf',
      linkedBookId: 'book-1',
    })

    const merged = mergeDocumentIntoItem(base, { linkedBookId: null })
    expect(merged.docMeta.linkedBookId).toBeNull()
  })

  it('mergeDocumentIntoItem allows updating dismissed book ids', () => {
    const base = createDocumentItemFromDoc({
      id: 'doc-2c',
      title: 'Whitepaper',
      type: 'pdf',
      dismissedBookIds: ['book-1'],
    })

    const merged = mergeDocumentIntoItem(base, { dismissedBookIds: ['book-2', 'book-2'] })
    expect(merged.docMeta.dismissedBookIds).toEqual(['book-2'])

    const cleared = mergeDocumentIntoItem(base, { dismissedBookIds: [] })
    expect(cleared.docMeta.dismissedBookIds).toEqual([])
  })

  it('itemToDocument preserves zero progress and maps page counts correctly', () => {
    const item = createDocumentItemFromDoc({
      id: 'doc-3',
      title: 'Deep PDF',
      type: 'pdf',
      pageCount: 420,
      progressPercent: 0,
      lastPage: 1,
    })

    const doc = itemToDocument(item)
    expect(doc.progressPercent).toBe(0)
    expect(doc.pageCount).toBe(420)
    expect(doc.filePageCount).toBe(420)
  })

  it('normalizeBookItem includes status field', () => {
    const item = normalizeBookItem({ title: 'Test', status: 'reading' })
    expect(item.status).toBe('reading')
  })

  it('normalizes book status from persisted metadata', () => {
    const item = normalizeBookItem({
      title: 'Test',
      bookMeta: { status: 'reading' },
    })
    expect(item.status).toBe('reading')
  })

  it('normalizeBookItem defaults status to null for invalid values', () => {
    const item = normalizeBookItem({ title: 'Test', status: 'invalid' })
    expect(item.status).toBe(null)

    const item2 = normalizeBookItem({ title: 'Test' })
    expect(item2.status).toBe(null)
  })

  it('createBookItemFromBook preserves status', () => {
    const item = createBookItemFromBook({ title: 'Test', status: 'to-read' })
    expect(item.status).toBe('to-read')
  })

  it('itemToBook includes status', () => {
    const item = normalizeBookItem({ id: 'b1', title: 'Test', status: 'read' })
    const book = itemToBook(item)
    expect(book.status).toBe('read')
  })

  it('mergeBookIntoItem preserves and updates status', () => {
    const base = createBookItemFromBook({ id: 'b1', title: 'Test', status: 'reading' })
    expect(base.status).toBe('reading')

    const merged = mergeBookIntoItem(base, { status: 'read' })
    expect(merged.status).toBe('read')

    const unchanged = mergeBookIntoItem(base, { title: 'New Title' })
    expect(unchanged.status).toBe('reading')
  })

  it('migrateLibraryStateToV3 infers status from dates', () => {
    const v2State = {
      version: 2,
      items: [
        {
          id: 'finished',
          kind: 'book',
          title: 'Finished Book',
          bookMeta: { dateFinished: '2025-01-01', dateStarted: '2024-12-01' },
        },
        {
          id: 'in-progress',
          kind: 'book',
          title: 'In Progress Book',
          bookMeta: { dateStarted: '2025-06-01', pagesRead: 50 },
        },
        {
          id: 'unstarted',
          kind: 'book',
          title: 'No Dates Book',
          bookMeta: {},
        },
        {
          id: 'doc-1',
          kind: 'document',
          title: 'Some Doc',
        },
      ],
      shelves: [],
      user: {},
      spineLibrary: {},
    }

    const migrated = migrateLibraryStateToV3(v2State)
    expect(migrated.version).toBe(3)

    const finished = migrated.items.find((i) => i.id === 'finished')
    expect(finished.status).toBe('read')

    const inProgress = migrated.items.find((i) => i.id === 'in-progress')
    expect(inProgress.status).toBe('reading')

    const unstarted = migrated.items.find((i) => i.id === 'unstarted')
    expect(unstarted.status).toBe(null)

    const doc = migrated.items.find((i) => i.id === 'doc-1')
    expect(doc.kind).toBe('document')
  })

  it('migrateLibraryState runs full migration chain from v1', () => {
    const v1State = {
      version: 1,
      items: [
        {
          id: 'b1',
          kind: 'book',
          title: 'Old Book',
          bookMeta: { isbn: '9780000000001', dateFinished: '2024-01-01' },
        },
      ],
      shelves: [],
      user: {},
      spineLibrary: {},
    }

    const migrated = migrateLibraryState(v1State)
    expect(migrated.version).toBe(3)
    expect(migrated.items[0].status).toBe('read')
  })

  it('migrateLibraryStateToV3 does not overwrite existing status', () => {
    const state = {
      version: 2,
      items: [
        {
          id: 'b1',
          kind: 'book',
          title: 'Book',
          status: 'dnf',
          bookMeta: { dateFinished: '2025-01-01' },
        },
      ],
      shelves: [],
      user: {},
      spineLibrary: {},
    }

    const migrated = migrateLibraryStateToV3(state)
    expect(migrated.items[0].status).toBe('dnf')
  })
})
