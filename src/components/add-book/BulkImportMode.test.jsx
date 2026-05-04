/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractAddBookSpineColor } from './coverColor'
import BulkImportMode from './BulkImportMode'

vi.mock('./coverColor', () => ({
  extractAddBookSpineColor: vi.fn(),
}))

let container = null
let root = null

function createAbortError() {
  return new DOMException('The request was aborted.', 'AbortError')
}

function renderBulk(props = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<BulkImportMode onAddBook={() => {}} {...props} />)
  })
}

function setTextareaValue(selector, value) {
  const textarea = container.querySelector(selector)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  setter.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve()
  })
}

function findButton(text) {
  return Array.from(container.querySelectorAll('button')).find((button) => (
    button.textContent === text || button.textContent.includes(text)
  ))
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      items: [{
        id: 'google-1',
        volumeInfo: {
          title: 'Bulk Async Book',
          authors: ['Bulk Tester'],
          imageLinks: { thumbnail: 'http://example.com/cover.jpg' },
          industryIdentifiers: [{ type: 'ISBN_13', identifier: '9781234567897' }],
          pageCount: 200,
          categories: ['Testing'],
          publishedDate: '2026',
        },
      }],
    }),
  }))
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
  vi.useRealTimers()
  vi.clearAllMocks()
  delete global.fetch
})

describe('BulkImportMode', () => {
  it('adds matched books once and closes after the batch completes', async () => {
    let resolveColor
    extractAddBookSpineColor.mockReturnValue(new Promise((resolve) => {
      resolveColor = resolve
    }))
    const onAddBook = vi.fn()
    const onComplete = vi.fn()

    renderBulk({ onAddBook, onComplete })
    await act(async () => {
      setTextareaValue('#bulk-title-list', 'Bulk Async Book')
      findButton('Find Matches').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flushReact()

    const addButton = findButton('Add 1 Matched Book')
    await act(async () => {
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(extractAddBookSpineColor).toHaveBeenCalledTimes(1)
    expect(onAddBook).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()

    await act(async () => {
      resolveColor('#112233')
      await Promise.resolve()
    })

    expect(onAddBook).toHaveBeenCalledTimes(1)
    expect(onAddBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bulk Async Book',
        spineColor: '#112233',
      }),
      { closeModal: false }
    )
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('marks timed-out title lookups as missed instead of hanging the batch', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn((_url, options = {}) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(createAbortError()), { once: true })
    }))

    renderBulk()
    await act(async () => {
      setTextareaValue('#bulk-title-list', 'Unresponsive Catalog')
      findButton('Find Matches').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await act(async () => {
      vi.advanceTimersByTime(10000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('Missed')
    expect(findButton('Add')).toBeUndefined()
  })

  it('keeps malformed Google Books bulk results reviewable', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [{ id: 'google-malformed' }] }),
    }))

    renderBulk()
    await act(async () => {
      setTextareaValue('#bulk-title-list', 'Malformed Catalog Item')
      findButton('Find Matches').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flushReact()

    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('Matched')
    expect(container.textContent).toContain('Malformed Catalog Item')
    expect(container.textContent).toContain('Unknown Author')
    expect(findButton('Add 1 Matched Book')).toBeTruthy()
  })

  it('aborts active title lookup when the modal unmounts', async () => {
    global.fetch = vi.fn((_url, options = {}) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(createAbortError()), { once: true })
    }))

    renderBulk()
    await act(async () => {
      setTextareaValue('#bulk-title-list', 'Slow Catalog Item')
      findButton('Find Matches').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const signal = global.fetch.mock.calls[0][1].signal
    expect(signal.aborted).toBe(false)

    act(() => {
      root.unmount()
    })
    root = null

    expect(signal.aborted).toBe(true)
  })
})
