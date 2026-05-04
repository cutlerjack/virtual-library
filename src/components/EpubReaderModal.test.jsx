/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EpubReaderModal from './EpubReaderModal'

const epubMock = vi.hoisted(() => ({
  ePub: vi.fn(),
  book: null,
  rendition: null,
}))

vi.mock('epubjs', () => ({
  default: epubMock.ePub,
}))

vi.mock('./ReaderDialogShell', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

function createMockBook() {
  const rendition = {
    on: vi.fn(() => rendition),
    off: vi.fn(),
    removeListener: vi.fn(),
    destroy: vi.fn(),
    display: vi.fn().mockResolvedValue(undefined),
    prev: vi.fn(),
    next: vi.fn(),
    flow: vi.fn(),
    spread: vi.fn(),
    themes: {
      fontSize: vi.fn(),
    },
  }
  const book = {
    renderTo: vi.fn(() => rendition),
    ready: Promise.resolve(),
    locations: {
      generate: vi.fn().mockResolvedValue(undefined),
      percentageFromCfi: vi.fn(() => 0.5),
    },
    coverUrl: vi.fn().mockResolvedValue(null),
    destroy: vi.fn(),
  }
  epubMock.book = book
  epubMock.rendition = rendition
  epubMock.ePub.mockReturnValue(book)
}

beforeEach(() => {
  vi.restoreAllMocks()
  createMockBook()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EpubReaderModal cleanup', () => {
  it('removes the relocated listener instead of calling the event emitter return value', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<EpubReaderModal data={new ArrayBuffer(8)} title="Test EPUB" />)
    })

    const relocatedHandler = epubMock.rendition.on.mock.calls.find(
      ([eventName]) => eventName === 'relocated'
    )?.[1]
    expect(relocatedHandler).toEqual(expect.any(Function))

    await expect(act(async () => {
      root.unmount()
    })).resolves.toBeUndefined()

    expect(epubMock.rendition.off).toHaveBeenCalledWith('relocated', relocatedHandler)
    expect(epubMock.rendition.destroy).toHaveBeenCalled()
    expect(epubMock.book.destroy).toHaveBeenCalled()

    container.remove()
  })
})
