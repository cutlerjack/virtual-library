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

const { chunkText } = await import('./ingestPipeline')

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
