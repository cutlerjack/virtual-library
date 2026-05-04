/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writeTextFile } from '@tauri-apps/api/fs'
import { captureArticle } from './articleCapture'

vi.mock('@tauri-apps/api/fs', () => ({
  writeTextFile: vi.fn(),
}))

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts) => Promise.resolve(parts.join('/'))),
}))

vi.mock('./fileHash', () => ({
  computeSha256: vi.fn(() => Promise.resolve('hash')),
}))

vi.mock('./storage', () => ({
  generateId: vi.fn(() => 'article-id'),
}))

vi.mock('./tauri', () => ({
  isTauri: () => true,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  writeTextFile.mockResolvedValue()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('captureArticle', () => {
  it('bounds article fetches with an abort timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => (
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    )))

    const capture = captureArticle({
      url: 'https://example.com/article',
      libraryPath: '/library',
      timeoutMs: 100,
    })
    const expectation = expect(capture).rejects.toThrow('Article fetch timed out.')

    await vi.advanceTimersByTimeAsync(100)

    await expectation
    expect(writeTextFile).not.toHaveBeenCalled()
  })

  it('captures sanitized article content from an html response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: () => Promise.resolve('<title>Article</title><script>bad()</script><p>Safe body</p>'),
    })))

    const article = await captureArticle({
      url: 'https://example.com/article',
      libraryPath: '/library',
    })

    expect(article).toEqual(expect.objectContaining({
      id: 'article-id',
      title: 'Article',
      filePath: '/library/articles/article-id.html',
      searchText: 'Safe body',
    }))
    expect(writeTextFile).toHaveBeenCalledWith(
      '/library/articles/article-id.html',
      expect.not.stringContaining('<script>')
    )
  })
})
