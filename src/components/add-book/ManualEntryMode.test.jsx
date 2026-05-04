/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractAddBookSpineColor } from './coverColor'
import ManualEntryMode from './ManualEntryMode'

vi.mock('./coverColor', () => ({
  extractAddBookSpineColor: vi.fn(),
}))

let container = null
let root = null

function renderManual(props = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <ManualEntryMode
        onAddBook={() => {}}
        onClose={() => {}}
        {...props}
      />
    )
  })
}

function setInputValue(selector, value) {
  const input = container.querySelector(selector)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
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
  vi.clearAllMocks()
})

describe('ManualEntryMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ignores duplicate submits while a manual book is being added', async () => {
    let resolveColor
    extractAddBookSpineColor.mockReturnValue(new Promise((resolve) => {
      resolveColor = resolve
    }))
    const onAddBook = vi.fn()

    renderManual({ onAddBook })
    await act(async () => {
      setInputValue('#manual-book-title', 'Manual Async Book')
      setInputValue('#manual-book-author', 'Manual Tester')
      setInputValue('#manual-book-cover-url', 'https://example.com/manual.jpg')
    })

    const addButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent === 'Add Book'
    ))

    await act(async () => {
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(extractAddBookSpineColor).toHaveBeenCalledTimes(1)
    expect(onAddBook).not.toHaveBeenCalled()

    await act(async () => {
      resolveColor('#654321')
      await Promise.resolve()
    })

    expect(onAddBook).toHaveBeenCalledTimes(1)
    expect(onAddBook).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Manual Async Book',
      author: 'Manual Tester',
      spineColor: '#654321',
    }))
  })
})
