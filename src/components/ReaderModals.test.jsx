/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endReaderSessionBestEffort } from '../reader/readerSessionLifecycle'
import ReaderModals from './ReaderModals'

vi.mock('../reader/readerSessionLifecycle', () => ({
  endReaderSessionBestEffort: vi.fn(),
}))

vi.mock('./PdfReaderModal', () => ({
  default: () => {
    throw new Error('pdf render failed')
  },
}))

vi.mock('./EpubReaderModal', () => ({
  default: () => null,
}))

vi.mock('./ArticleReaderModal', () => ({
  default: () => null,
}))

let container = null
let root = null
let errorSpy = null

async function flushReact() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  endReaderSessionBestEffort.mockResolvedValue(true)
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
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
  errorSpy?.mockRestore()
  errorSpy = null
})

function renderReaderModals(props = {}) {
  act(() => {
    root.render(
      <ReaderModals
        activePdf={null}
        setActivePdf={() => {}}
        activeEpub={null}
        setActiveEpub={() => {}}
        activeArticle={null}
        setActiveArticle={() => {}}
        libraryPath="/library"
        readerSettings={{ cachePages: 8, maxMemoryMb: 512, overscanPages: 8 }}
        addDocumentNote={() => {}}
        updateDocumentMeta={() => {}}
        scheduleDocumentMetaUpdate={() => {}}
        flushPendingDocumentMetaUpdates={() => {}}
        {...props}
      />
    )
  })
}

describe('ReaderModals', () => {
  it('clears a crashing reader and ends its session from the error fallback', async () => {
    const setActivePdf = vi.fn()
    const flushPendingDocumentMetaUpdates = vi.fn()
    renderReaderModals({
      activePdf: {
        doc: { id: 'doc-1', title: 'Broken PDF' },
        filePath: '/library/broken.pdf',
        initialLocation: { kind: 'pdf', page: 1 },
        initialMode: 'scroll',
        initialLayout: 'single',
        sessionId: 'session-1',
      },
      setActivePdf,
      flushPendingDocumentMetaUpdates,
    })
    await flushReact()

    const closeButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent === 'Close'
    ))
    expect(closeButton).toBeTruthy()

    await act(async () => {
      closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(flushPendingDocumentMetaUpdates).toHaveBeenCalled()
    expect(endReaderSessionBestEffort).toHaveBeenCalledWith('/library', 'session-1')
    expect(setActivePdf).toHaveBeenCalledWith(null)
  })

  it('ends an active session when the reader tree unmounts', async () => {
    renderReaderModals({
      activeEpub: {
        doc: { id: 'doc-2', title: 'EPUB' },
        data: new Uint8Array(),
        sessionId: 'session-2',
      },
    })
    await flushReact()

    act(() => {
      root.unmount()
    })
    root = null

    expect(endReaderSessionBestEffort).toHaveBeenCalledWith('/library', 'session-2')
  })
})

