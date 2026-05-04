/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateEpubThumbnail } from './epubThumbnail'

const epubMock = vi.hoisted(() => ({
  ePub: vi.fn(),
  book: null,
}))

vi.mock('epubjs', () => ({
  default: epubMock.ePub,
}))

class FailingFileReader {
  readAsDataURL() {
    this.error = new Error('reader failed')
    this.onerror?.()
  }
}

class SuccessfulFileReader {
  readAsDataURL() {
    this.result = 'data:image/png;base64,cover'
    this.onload?.()
  }
}

function mockBook(coverUrl = 'https://example.com/cover.png') {
  const book = {
    ready: Promise.resolve(),
    coverUrl: vi.fn().mockResolvedValue(coverUrl),
    destroy: vi.fn(),
  }
  epubMock.book = book
  epubMock.ePub.mockReturnValue(book)
  return book
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    blob: vi.fn().mockResolvedValue(new Blob(['cover'])),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('generateEpubThumbnail', () => {
  it('returns null and destroys the book when cover image reading fails', async () => {
    const book = mockBook()
    vi.stubGlobal('FileReader', FailingFileReader)

    await expect(generateEpubThumbnail(new ArrayBuffer(8))).resolves.toBeNull()

    expect(book.destroy).toHaveBeenCalled()
  })

  it('returns a cover data URL when the cover can be read', async () => {
    const book = mockBook()
    vi.stubGlobal('FileReader', SuccessfulFileReader)

    await expect(generateEpubThumbnail(new ArrayBuffer(8))).resolves.toBe('data:image/png;base64,cover')

    expect(book.destroy).toHaveBeenCalled()
  })

  it('returns null for unsuccessful cover fetches', async () => {
    const book = mockBook()
    vi.stubGlobal('FileReader', SuccessfulFileReader)
    fetch.mockResolvedValueOnce({
      ok: false,
      blob: vi.fn(),
    })

    await expect(generateEpubThumbnail(new ArrayBuffer(8))).resolves.toBeNull()

    expect(book.destroy).toHaveBeenCalled()
  })

  it('returns null and destroys the book when EPUB metadata loading fails', async () => {
    const book = mockBook()
    book.ready = Promise.reject(new Error('epub failed'))
    vi.stubGlobal('FileReader', SuccessfulFileReader)

    await expect(generateEpubThumbnail(new ArrayBuffer(8))).resolves.toBeNull()

    expect(book.destroy).toHaveBeenCalled()
  })

  it('returns null when epubjs cannot create a book object', async () => {
    epubMock.ePub.mockImplementationOnce(() => {
      throw new Error('bad epub')
    })
    vi.stubGlobal('FileReader', SuccessfulFileReader)

    await expect(generateEpubThumbnail(new ArrayBuffer(8))).resolves.toBeNull()
  })
})
