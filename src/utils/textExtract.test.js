/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractEpubText, extractPdfText } from './textExtract'

const pdfMock = vi.hoisted(() => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}))

const epubMock = vi.hoisted(() => ({
  ePub: vi.fn(),
}))

vi.mock('pdfjs-dist/legacy/build/pdf', () => pdfMock)
vi.mock('pdfjs-dist/legacy/build/pdf.worker?url', () => ({
  default: 'pdf-worker.js',
}))
vi.mock('epubjs', () => ({
  default: epubMock.ePub,
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('extractPdfText cleanup', () => {
  it('destroys the loaded PDF when page text extraction fails', async () => {
    const pdfDoc = {
      numPages: 1,
      getPage: vi.fn().mockRejectedValue(new Error('page failed')),
      cleanup: vi.fn(),
      destroy: vi.fn(),
    }
    pdfMock.getDocument.mockReturnValue({ promise: Promise.resolve(pdfDoc) })

    await expect(extractPdfText(new Uint8Array([1, 2, 3]))).resolves.toBe('')

    expect(pdfDoc.cleanup).toHaveBeenCalled()
    expect(pdfDoc.destroy).toHaveBeenCalled()
  })

  it('destroys the loading task when PDF loading fails', async () => {
    const loadingTask = {
      promise: Promise.reject(new Error('load failed')),
      destroy: vi.fn().mockResolvedValue(undefined),
    }
    pdfMock.getDocument.mockReturnValue(loadingTask)

    await expect(extractPdfText(new Uint8Array([1, 2, 3]))).resolves.toBe('')

    expect(loadingTask.destroy).toHaveBeenCalled()
  })

  it('returns empty text when PDF setup fails synchronously', async () => {
    pdfMock.getDocument.mockImplementationOnce(() => {
      throw new Error('setup failed')
    })

    await expect(extractPdfText(new Uint8Array([1, 2, 3]))).resolves.toBe('')
  })
})

describe('extractEpubText cleanup', () => {
  it('destroys the EPUB book when metadata loading fails', async () => {
    const book = {
      ready: Promise.reject(new Error('epub failed')),
      destroy: vi.fn(),
      spine: { spineItems: [] },
    }
    epubMock.ePub.mockReturnValue(book)

    await expect(extractEpubText(new ArrayBuffer(8))).resolves.toBe('')

    expect(book.destroy).toHaveBeenCalled()
  })

  it('unloads sections and destroys the book after extracting readable text', async () => {
    const item = {
      load: vi.fn().mockResolvedValue({ body: { textContent: 'Section text' } }),
      unload: vi.fn(),
    }
    const book = {
      ready: Promise.resolve(),
      load: vi.fn(),
      destroy: vi.fn(),
      spine: { spineItems: [item] },
    }
    epubMock.ePub.mockReturnValue(book)

    await expect(extractEpubText(new ArrayBuffer(8))).resolves.toBe('Section text')

    expect(item.unload).toHaveBeenCalled()
    expect(book.destroy).toHaveBeenCalled()
  })
})
