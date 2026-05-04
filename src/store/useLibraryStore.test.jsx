/* @vitest-environment jsdom */

import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import {
  deleteItemFromDb,
  loadLibraryStateFromDb,
  saveBookItemToDb,
  saveDocumentItemToDb,
  saveLibraryStateToDb,
  saveShelvesToDb,
  saveSpineLibraryToDb,
  saveUserSettingsToDb,
} from '../data/libraryDb'
import { createBookItemFromBook } from '../data/librarySchema'
import { awaitPendingLibraryWrites } from '../data/libraryWriter'
import { useLibraryStore } from './useLibraryStore'

vi.mock('../utils/tauri', () => ({
  isTauri: () => true,
}))

vi.mock('../utils/libraryVault', () => ({
  ensureLibraryFolders: vi.fn(() => Promise.resolve()),
  getDefaultLibraryPath: vi.fn(() => Promise.resolve('/library')),
  getStoredLibraryPath: vi.fn(() => null),
  loadLibraryIndex: vi.fn(() => Promise.resolve({ documents: [] })),
  setStoredLibraryPath: vi.fn(),
}))

vi.mock('../data/libraryDb', () => ({
  deleteItemFromDb: vi.fn(),
  loadLibraryStateFromDb: vi.fn(),
  saveBookItemToDb: vi.fn(),
  saveDocumentItemToDb: vi.fn(),
  saveLibraryStateToDb: vi.fn(),
  saveShelvesToDb: vi.fn(),
  saveSpineLibraryToDb: vi.fn(),
  saveUserSettingsToDb: vi.fn(),
}))

vi.mock('../data/libraryWriter', () => ({
  awaitPendingLibraryWrites: vi.fn(() => Promise.resolve()),
}))

let container = null
let root = null
let currentStore = null
let warnSpy = null

function makeLibraryState() {
  return {
    version: 3,
    items: [
      createBookItemFromBook({
        id: 'book-1',
        title: 'Original Title',
        author: 'Original Author',
        addedAt: '2026-01-01T00:00:00.000Z',
      }),
    ],
    shelves: [{ id: 'all', name: 'All Books', color: '#8b4513', order: 0 }],
    user: { activityLog: [], readingStreak: { current: 0, best: 0, lastDate: null } },
    spineLibrary: {},
  }
}

function StoreHarness() {
  currentStore = useLibraryStore()
  return null
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve()
  })
}

async function waitForStore(predicate) {
  for (let index = 0; index < 20; index += 1) {
    await flushReact()
    if (predicate(currentStore)) return
  }
  throw new Error('Timed out waiting for store state')
}

async function renderStore() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<StoreHarness />)
  })
  await waitForStore((store) => store?.libraryReady)
  return currentStore
}

beforeEach(() => {
  vi.clearAllMocks()
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  localStorage.clear()
  currentStore = null
  loadLibraryStateFromDb.mockResolvedValue(makeLibraryState())
  saveBookItemToDb.mockResolvedValue()
  saveDocumentItemToDb.mockResolvedValue()
  saveLibraryStateToDb.mockResolvedValue()
  saveShelvesToDb.mockResolvedValue()
  saveSpineLibraryToDb.mockResolvedValue()
  saveUserSettingsToDb.mockResolvedValue()
  deleteItemFromDb.mockResolvedValue()
  awaitPendingLibraryWrites.mockResolvedValue()
})

afterEach(() => {
  warnSpy?.mockRestore()
  warnSpy = null
  if (root) {
    act(() => {
      root.unmount()
    })
  }
  container?.remove()
  container = null
  root = null
  currentStore = null
})

describe('useLibraryStore', () => {
  it('uses the latest committed state for consecutive targeted book writes', async () => {
    await renderStore()

    await act(async () => {
      currentStore.updateBookItem('book-1', { title: 'First Update' })
      currentStore.updateBookItem('book-1', { author: 'Second Author' })
    })

    expect(saveBookItemToDb).toHaveBeenCalledTimes(2)
    expect(saveBookItemToDb.mock.calls[0][1]).toEqual(expect.objectContaining({
      title: 'First Update',
      author: 'Original Author',
    }))
    expect(saveBookItemToDb.mock.calls[1][1]).toEqual(expect.objectContaining({
      title: 'First Update',
      author: 'Second Author',
    }))
  })

  it('marks the library dirty after a targeted write failure and recovers with a full flush', async () => {
    saveBookItemToDb.mockRejectedValueOnce(new Error('database locked'))
    await renderStore()

    await act(async () => {
      currentStore.updateBookItem('book-1', { title: 'Recovered Title' })
    })
    await waitForStore((store) => store.libraryDirty && store.librarySyncError)

    await act(async () => {
      await currentStore.flushLibraryState()
    })

    expect(saveLibraryStateToDb).toHaveBeenCalledWith('/library', expect.objectContaining({
      items: [expect.objectContaining({ title: 'Recovered Title' })],
    }))
    expect(currentStore.libraryDirty).toBe(false)
    expect(currentStore.librarySyncError).toBeNull()
  })

  it('recovers when a pending targeted write fails during flush', async () => {
    let rejectTargetedWrite
    saveBookItemToDb.mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectTargetedWrite = reject
    }))
    awaitPendingLibraryWrites.mockImplementationOnce(async () => {
      rejectTargetedWrite(new Error('database locked'))
      await Promise.resolve()
      await Promise.resolve()
    })
    await renderStore()

    await act(async () => {
      currentStore.updateBookItem('book-1', { title: 'Pending Failure Title' })
      await currentStore.flushLibraryState()
    })

    expect(saveLibraryStateToDb).toHaveBeenCalledWith('/library', expect.objectContaining({
      items: [expect.objectContaining({ title: 'Pending Failure Title' })],
    }))
    expect(currentStore.libraryDirty).toBe(false)
    expect(currentStore.librarySyncError).toBeNull()
  })
})
