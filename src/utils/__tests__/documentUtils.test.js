import { describe, it, expect } from 'vitest'
import {
  inferDocType,
  inferMime,
  normalizeDocTitle,
  quoteText,
  quoteCreatedAt,
} from '../documentUtils'

describe('inferDocType', () => {
  it('returns pdf for .pdf files', () => {
    expect(inferDocType('paper.pdf')).toBe('pdf')
  })

  it('returns epub for .epub files', () => {
    expect(inferDocType('novel.epub')).toBe('epub')
  })

  it('returns article for .html files', () => {
    expect(inferDocType('page.html')).toBe('article')
  })

  it('returns article for .htm files', () => {
    expect(inferDocType('page.htm')).toBe('article')
  })

  it('returns file for unknown extensions', () => {
    expect(inferDocType('data.txt')).toBe('file')
    expect(inferDocType('image.png')).toBe('file')
  })

  it('is case insensitive', () => {
    expect(inferDocType('Paper.PDF')).toBe('pdf')
    expect(inferDocType('Novel.EPUB')).toBe('epub')
    expect(inferDocType('Page.HTML')).toBe('article')
  })
})

describe('inferMime', () => {
  it('returns correct MIME for pdf', () => {
    expect(inferMime('doc.pdf')).toBe('application/pdf')
  })

  it('returns correct MIME for epub', () => {
    expect(inferMime('book.epub')).toBe('application/epub+zip')
  })

  it('returns correct MIME for html', () => {
    expect(inferMime('page.html')).toBe('text/html')
  })

  it('returns correct MIME for htm', () => {
    expect(inferMime('page.htm')).toBe('text/html')
  })

  it('returns octet-stream for unknown', () => {
    expect(inferMime('data.bin')).toBe('application/octet-stream')
  })

  it('is case insensitive', () => {
    expect(inferMime('DOC.PDF')).toBe('application/pdf')
  })
})

describe('normalizeDocTitle', () => {
  it('removes file extension', () => {
    expect(normalizeDocTitle('my-paper.pdf')).toBe('my paper')
  })

  it('replaces underscores with spaces', () => {
    expect(normalizeDocTitle('my_document_title.epub')).toBe('my document title')
  })

  it('replaces hyphens with spaces', () => {
    expect(normalizeDocTitle('my-document-title.html')).toBe('my document title')
  })

  it('replaces consecutive separators with a single space', () => {
    expect(normalizeDocTitle('my___doc--title.pdf')).toBe('my doc title')
  })

  it('trims whitespace', () => {
    expect(normalizeDocTitle(' spaced.txt')).toBe('spaced')
  })

  it('handles filenames without extension', () => {
    expect(normalizeDocTitle('no-extension')).toBe('no extension')
  })
})

describe('quoteText', () => {
  it('returns the string for legacy string quotes', () => {
    expect(quoteText('A great quote')).toBe('A great quote')
  })

  it('returns .text for object quotes', () => {
    expect(quoteText({ text: 'Object quote', createdAt: '2024-01-01' })).toBe('Object quote')
  })

  it('returns empty string for null/undefined', () => {
    expect(quoteText(null)).toBe('')
    expect(quoteText(undefined)).toBe('')
  })

  it('returns empty string for object without text', () => {
    expect(quoteText({ createdAt: '2024-01-01' })).toBe('')
  })
})

describe('quoteCreatedAt', () => {
  it('returns null for legacy string quotes', () => {
    expect(quoteCreatedAt('A quote')).toBeNull()
  })

  it('returns createdAt for object quotes', () => {
    expect(quoteCreatedAt({ text: 'Quote', createdAt: '2024-06-15' })).toBe('2024-06-15')
  })

  it('returns null for null/undefined', () => {
    expect(quoteCreatedAt(null)).toBeNull()
    expect(quoteCreatedAt(undefined)).toBeNull()
  })

  it('returns null for object without createdAt', () => {
    expect(quoteCreatedAt({ text: 'No date' })).toBeNull()
  })
})
