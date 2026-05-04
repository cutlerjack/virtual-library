/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBookSearch } from './useBookSearch'

let container = null
let root = null
let currentSearch = null

function createAbortError() {
  return new DOMException('The request was aborted.', 'AbortError')
}

function pendingFetchUntilAbort() {
  return vi.fn((_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(createAbortError()), { once: true })
  }))
}

function SearchHarness() {
  currentSearch = useBookSearch()
  return null
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve()
  })
}

async function renderSearch() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<SearchHarness />)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  currentSearch = null
  globalThis.fetch = pendingFetchUntilAbort()
})

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount()
    })
  }
  container?.remove()
  container = null
  root = null
  currentSearch = null
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useBookSearch', () => {
  it('aborts an in-flight request when the query is cleared', async () => {
    await renderSearch()

    await act(async () => {
      currentSearch.searchBooks('dune')
    })
    await flushReact()

    expect(currentSearch.loading).toBe(true)
    const signal = fetch.mock.calls[0][1].signal
    expect(signal.aborted).toBe(false)

    await act(async () => {
      await currentSearch.searchBooks('')
    })

    expect(signal.aborted).toBe(true)
    expect(currentSearch.loading).toBe(false)
    expect(currentSearch.results).toEqual([])
    expect(currentSearch.error).toBeNull()
    expect(currentSearch.settledQuery).toBe('')
  })

  it('aborts an in-flight request when results are cleared explicitly', async () => {
    await renderSearch()

    await act(async () => {
      currentSearch.searchBooks('dune')
    })
    await flushReact()

    const signal = fetch.mock.calls[0][1].signal
    await act(async () => {
      currentSearch.clearResults()
    })

    expect(signal.aborted).toBe(true)
    expect(currentSearch.loading).toBe(false)
    expect(currentSearch.results).toEqual([])
    expect(currentSearch.error).toBeNull()
    expect(currentSearch.settledQuery).toBe('')
  })

  it('only marks a query settled after its search response resolves', async () => {
    let resolveSearch
    globalThis.fetch = vi.fn(() => new Promise((resolve) => {
      resolveSearch = resolve
    }))

    await renderSearch()
    await act(async () => {
      currentSearch.searchBooks('missing volume')
    })
    await flushReact()

    expect(currentSearch.loading).toBe(true)
    expect(currentSearch.settledQuery).toBe('')

    await act(async () => {
      resolveSearch({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(currentSearch.loading).toBe(false)
    expect(currentSearch.results).toEqual([])
    expect(currentSearch.settledQuery).toBe('missing volume')
  })

  it('aborts an in-flight request on unmount', async () => {
    await renderSearch()

    await act(async () => {
      currentSearch.searchBooks('dune')
    })
    await flushReact()

    const signal = fetch.mock.calls[0][1].signal
    act(() => {
      root.unmount()
    })
    root = null

    expect(signal.aborted).toBe(true)
  })

  it('falls back to Open Library when Google Books times out', async () => {
    vi.useFakeTimers()
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce((_url, options = {}) => new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(createAbortError()), { once: true })
      }))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          docs: [{
            key: '/works/OL27448W',
            title: 'Dune',
            author_name: ['Frank Herbert'],
            cover_i: 123,
            isbn: ['9780441172719'],
            number_of_pages_median: 412,
            subject: ['Science fiction'],
            first_publish_year: 1965,
          }],
        }),
      })

    await renderSearch()
    await act(async () => {
      currentSearch.searchBooks('dune')
    })

    await act(async () => {
      vi.advanceTimersByTime(10000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(currentSearch.loading).toBe(false)
    expect(currentSearch.error).toBeNull()
    expect(currentSearch.settledQuery).toBe('dune')
    expect(currentSearch.results).toEqual([
      expect.objectContaining({
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: '9780441172719',
      }),
    ])
  })

  it('keeps malformed Google Books entries from crashing the search', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        items: [{ id: 'google-malformed' }],
      }),
    }))

    await renderSearch()
    await act(async () => {
      await currentSearch.searchBooks('malformed')
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(currentSearch.error).toBeNull()
    expect(currentSearch.settledQuery).toBe('malformed')
    expect(currentSearch.results).toEqual([
      expect.objectContaining({
        googleId: 'google-malformed',
        title: 'Unknown Title',
        author: 'Unknown Author',
        isbn: null,
        tags: [],
      }),
    ])
  })
})
