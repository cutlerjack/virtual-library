import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/fs', () => ({
  readBinaryFile: vi.fn(),
  readTextFile: vi.fn(),
}))
vi.mock('./textExtract', () => ({
  extractPdfText: vi.fn(),
  extractEpubText: vi.fn(),
  extractHtmlText: vi.fn(),
}))
vi.mock('./fileHash', () => ({ computeSha256: vi.fn() }))
vi.mock('./ocr', () => ({ ocrPdf: vi.fn() }))

const { readBinaryFile, readTextFile } = await import('@tauri-apps/api/fs')
const { extractPdfText, extractEpubText, extractHtmlText } = await import('./textExtract')
const { computeSha256 } = await import('./fileHash')
const { ocrPdf } = await import('./ocr')
const { chunkText, processIngestJob } = await import('./ingestPipeline')

describe('chunkText', () => {
  it('returns empty list for empty input', () => {
    expect(chunkText('')).toEqual([])
  })

  it('splits into chunks and preserves text slices', () => {
    const text = 'alpha beta gamma delta'
    const chunks = chunkText(text, 10)
    expect(chunks).toHaveLength(3)
    expect(chunks[0].text).toBe(text.slice(0, 10))
  })

  it('counts tokens in a chunk', () => {
    const chunks = chunkText('one two three', 50)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].tokenCount).toBe(3)
  })
})

describe('processIngestJob', () => {
  it('auto-links a strong match during ingest and writes relation-aware search text', async () => {
    readBinaryFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
    extractPdfText.mockResolvedValueOnce('Companion notes for The City and the Shelf by Ada North')
    computeSha256.mockResolvedValueOnce('hash-1')
    ocrPdf.mockResolvedValueOnce({ text: '', pageCount: null, confidence: null, pages: [] })

    const updateJob = vi.fn()
    const updateDoc = vi.fn()
    const saveChunks = vi.fn()
    const saveOcrPages = vi.fn()
    const updateSearchDoc = vi.fn()

    await processIngestJob({
      job: { id: 'job-1', target_path: '/tmp/city-notes.pdf', force_ocr: 0 },
      doc: {
        id: 'doc-1',
        title: 'The City & the Shelf Notes',
        type: 'pdf',
        author: 'Ada North',
        mime: 'application/pdf',
      },
      books: [
        { id: 'book-1', title: 'The City & the Shelf', author: 'Ada North' },
      ],
      updateJob,
      updateDoc,
      saveChunks,
      saveOcrPages,
      updateSearchDoc,
    })

    expect(updateDoc).toHaveBeenCalledWith('doc-1', expect.objectContaining({
      linkedBookId: 'book-1',
      searchText: 'Companion notes for The City and the Shelf by Ada North',
    }))
    expect(updateSearchDoc).toHaveBeenCalledWith(
      'doc-1',
      'document',
      'The City & the Shelf Notes',
      expect.stringContaining('Attached to The City & the Shelf')
    )
  })

  it('preserves an existing linked book during ingest', async () => {
    readBinaryFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
    extractPdfText.mockResolvedValueOnce('x'.repeat(240))
    computeSha256.mockResolvedValueOnce('hash-2')
    const updateSearchDoc = vi.fn()

    const updateDoc = vi.fn()

    await processIngestJob({
      job: { id: 'job-2', target_path: '/tmp/linked.pdf', force_ocr: 0 },
      doc: {
        id: 'doc-2',
        title: 'Linked PDF',
        type: 'pdf',
        author: 'Ada North',
        mime: 'application/pdf',
        linkedBookId: 'book-9',
      },
      books: [
        { id: 'book-9', title: 'Existing Link', author: 'Ada North' },
        { id: 'book-1', title: 'Different Book', author: 'Ada North' },
      ],
      updateJob: vi.fn(),
      updateDoc,
      saveChunks: vi.fn(),
      saveOcrPages: vi.fn(),
      updateSearchDoc,
    })

    expect(updateDoc.mock.calls[0][1]).not.toHaveProperty('linkedBookId')
    expect(updateSearchDoc).toHaveBeenCalledWith(
      'doc-2',
      'document',
      'Linked PDF',
      expect.stringContaining('Attached to Existing Link')
    )
  })
})
