/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RecommendationsPanel from './RecommendationsPanel'

let container = null
let root = null

const books = [
  {
    id: 'book-1',
    title: 'Reliable Systems',
    author: 'Ada Lovelace',
    rating: 9,
    tags: ['Engineering'],
    pageCount: 320,
  },
]

function renderPanel() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<RecommendationsPanel books={books} />)
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
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
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('RecommendationsPanel', () => {
  it('ignores malformed dismissed-note storage instead of crashing', () => {
    localStorage.setItem('virtual-library-archivist-dismissed', JSON.stringify({ stale: true }))

    expect(() => renderPanel()).not.toThrow()
    expect(container.textContent).toContain('Archivist Notes')
  })

  it('dismisses a note even when dismissed-note persistence fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    renderPanel()

    expect(container.textContent).toContain('Archivist Notes')
    expect(container.textContent).toContain('Since you loved "Reliable Systems"')

    const dismissButton = container.querySelector('button[aria-label="Dismiss note"]')
    act(() => {
      dismissButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).not.toContain('Since you loved "Reliable Systems"')
    expect(container.textContent).toContain('Your longest book: "Reliable Systems"')
    expect(warnSpy).toHaveBeenCalledWith(
      '[recommendations] Unable to persist dismissed note:',
      'quota exceeded'
    )
  })
})
