/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractDominantColor, getRandomSpineColor } from '../utils/colorExtract'
import BookSpine from './BookSpine'

vi.mock('../utils/colorExtract', () => ({
  extractDominantColor: vi.fn(),
  getRandomSpineColor: vi.fn(() => '#445566'),
}))

let container = null
let root = null

function renderSpine(bookOverrides = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <BookSpine
        book={{
          id: 'book-1',
          title: 'Async Color',
          author: 'Tester',
          coverUrl: 'https://example.com/cover.jpg',
          pageCount: 200,
          ...bookOverrides,
        }}
      />
    )
  })
}

beforeEach(() => {
  vi.clearAllMocks()
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
})

describe('BookSpine', () => {
  it('applies an extracted cover color', async () => {
    extractDominantColor.mockResolvedValue('#123456')
    renderSpine()

    await act(async () => {
      await Promise.resolve()
    })

    const spine = container.querySelector('[role="button"]')
    expect(spine.style.getPropertyValue('--book-spine')).toBe('#123456')
  })

  it('falls back when cover color extraction rejects', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    extractDominantColor.mockRejectedValue(new Error('image failed'))
    renderSpine()

    await act(async () => {
      await Promise.resolve()
    })

    const spine = container.querySelector('[role="button"]')
    expect(spine.style.getPropertyValue('--book-spine')).toBe('#445566')
    expect(warnSpy).toHaveBeenCalledWith(
      '[book-spine] Unable to extract cover color:',
      'image failed'
    )
    expect(getRandomSpineColor).toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})
