/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractAddBookSpineColor } from './add-book/coverColor'
import AddBookModal from './AddBookModal'

vi.mock('../hooks/useBookSearch', () => ({
  useBookSearch: () => ({
    results: [{
      googleId: 'google-1',
      title: 'Async Add Book',
      author: 'Tester',
      coverUrl: 'https://example.com/cover.jpg',
      tags: [],
    }],
    loading: false,
    error: null,
    searchBooks: vi.fn(),
    clearResults: vi.fn(),
  }),
}))

vi.mock('../utils/tauri', () => ({
  isTauri: () => false,
}))

vi.mock('./add-book/coverColor', () => ({
  extractAddBookSpineColor: vi.fn(),
}))

let container = null
let root = null

function renderModal(props = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <AddBookModal
        onClose={() => {}}
        onAddBook={() => {}}
        onAddArticle={async () => {}}
        onMigrateExport={async () => false}
        {...props}
      />
    )
  })
}

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount()
    })
  }
  container?.remove()
  container = null
  root = null
  document.body.style.overflow = ''
  vi.clearAllMocks()
})

describe('AddBookModal add flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ignores duplicate search-result clicks while a book is being added', async () => {
    let resolveColor
    extractAddBookSpineColor.mockReturnValue(new Promise((resolve) => {
      resolveColor = resolve
    }))
    const onAddBook = vi.fn()

    renderModal({ onAddBook })

    const resultButton = Array.from(document.body.querySelectorAll('button')).find((button) => (
      button.textContent.includes('Async Add Book')
    ))

    await act(async () => {
      resultButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      resultButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(extractAddBookSpineColor).toHaveBeenCalledTimes(1)
    expect(onAddBook).not.toHaveBeenCalled()

    await act(async () => {
      resolveColor('#123456')
      await Promise.resolve()
    })

    expect(onAddBook).toHaveBeenCalledTimes(1)
    expect(onAddBook).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Async Add Book',
      spineColor: '#123456',
    }))
  })
})
