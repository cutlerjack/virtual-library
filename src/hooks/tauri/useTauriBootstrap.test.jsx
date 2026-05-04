/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readDir } from '@tauri-apps/api/fs'
import { enqueueIngestJobUnique, rescanLibraryFiles } from '../../data/libraryDb'
import { useTauriBootstrap } from './useTauriBootstrap'

vi.mock('@tauri-apps/api/fs', () => ({
  readBinaryFile: vi.fn(),
  readDir: vi.fn(),
}))

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts) => Promise.resolve(parts.join('/'))),
}))

vi.mock('../../utils/tauri', () => ({
  isTauri: () => true,
}))

vi.mock('../../utils/pdfThumbnail', () => ({
  generatePdfThumbnail: vi.fn(),
}))

vi.mock('../../data/libraryDb', () => ({
  enqueueIngestJobUnique: vi.fn(),
  rescanLibraryFiles: vi.fn(),
}))

vi.mock('./documentLinking', () => ({
  applyAutomaticBookLinks: vi.fn((docs) => ({ docs, linkedCount: 0 })),
}))

let container = null
let root = null
let insertDocumentItem = vi.fn()
let warnSpy = null

function BootstrapHarness(props) {
  useTauriBootstrap({
    libraryPath: '/library',
    libraryReady: true,
    ingestBusy: false,
    books: [],
    documents: [],
    userData: { ratingScale: 10 },
    updateBookItem: vi.fn(),
    insertDocumentItem,
    updateUserState: vi.fn(),
    refreshLibraryState: vi.fn(),
    actions: { updateDocumentMeta: vi.fn() },
    ...props,
  })
  return null
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  insertDocumentItem = vi.fn()
  readDir.mockResolvedValue([])
  enqueueIngestJobUnique.mockResolvedValue()
  rescanLibraryFiles.mockResolvedValue(null)
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
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
  warnSpy?.mockRestore()
  warnSpy = null
  vi.useRealTimers()
})

describe('useTauriBootstrap', () => {
  it('continues scanning library folders after startup', async () => {
    readDir.mockImplementation(async (path) => (
      path.endsWith('/library')
        ? [{ name: 'New.pdf', path: '/library/library/New.pdf' }]
        : []
    ))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<BootstrapHarness />)
    })
    await flushReact()

    expect(insertDocumentItem).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(60000)
      await Promise.resolve()
    })
    await flushReact()

    expect(insertDocumentItem).toHaveBeenCalledTimes(2)
    expect(enqueueIngestJobUnique).toHaveBeenCalledWith('/library', expect.objectContaining({
      itemId: expect.any(String),
      sourcePath: '/library/library/New.pdf',
      targetPath: '/library/library/New.pdf',
    }))
  })

  it('contains watcher ingest enqueue failures', async () => {
    readDir.mockImplementation(async (path) => (
      path.endsWith('/library')
        ? [{ name: 'NeedsIngest.pdf', path: '/library/library/NeedsIngest.pdf' }]
        : []
    ))
    enqueueIngestJobUnique.mockRejectedValue(new Error('database locked'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<BootstrapHarness />)
    })
    await flushReact()

    expect(insertDocumentItem).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith('[watcher] Enqueue ingest failed:', 'database locked')
  })

  it('runs initial rescan for a new library path after an earlier rescan failure', async () => {
    rescanLibraryFiles
      .mockRejectedValueOnce(new Error('bad folder'))
      .mockResolvedValueOnce(null)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<BootstrapHarness libraryPath="/bad-library" />)
    })
    await flushReact()

    await act(async () => {
      root.render(<BootstrapHarness libraryPath="/good-library" />)
    })
    await flushReact()

    expect(rescanLibraryFiles).toHaveBeenNthCalledWith(1, '/bad-library')
    expect(rescanLibraryFiles).toHaveBeenNthCalledWith(2, '/good-library')
    expect(warnSpy).toHaveBeenCalledWith('[rescan] Initial rescan failed:', 'bad folder')
  })
})
