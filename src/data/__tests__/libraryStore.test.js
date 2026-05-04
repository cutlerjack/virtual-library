/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LIBRARY_STORAGE_KEY, loadLibraryState, saveLibraryState } from '../libraryStore'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('libraryStore browser persistence', () => {
  it('loads a migrated browser library even when persistence is unavailable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    const state = await loadLibraryState({
      libraryPath: null,
      legacy: {
        books: [{ id: 'book-1', title: 'Local Book', author: 'Browser Reader' }],
        shelves: [],
        userData: { displayName: 'Browser Library' },
        spineLibrary: {},
        documents: [],
      },
    })

    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toEqual(expect.objectContaining({
      id: 'book-1',
      title: 'Local Book',
    }))
    expect(state.user.displayName).toBe('Browser Library')
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-store] Unable to persist browser library state:',
      'storage blocked'
    )
  })

  it('still reports browser save failures to explicit save callers', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    await expect(saveLibraryState({
      version: 3,
      items: [],
      shelves: [],
      user: {},
      spineLibrary: {},
    })).rejects.toThrow('quota exceeded')
  })

  it('normalizes wrong-shape persisted browser state before returning it', async () => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify({
      version: 3,
      items: {},
      shelves: {},
      user: [],
      spineLibrary: [],
    }))

    const state = await loadLibraryState({
      libraryPath: null,
      legacy: {
        books: [],
        shelves: [],
        userData: {},
        spineLibrary: {},
        documents: [],
      },
    })

    expect(state.version).toBe(3)
    expect(state.items).toEqual([])
    expect(state.shelves).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'all', name: 'All Books' }),
    ]))
    expect(state.user.displayName).toBe('My Library')
    expect(state.spineLibrary).toEqual({})
  })

  it('treats malformed legacy state inputs as empty values', async () => {
    const state = await loadLibraryState({
      libraryPath: null,
      legacy: {
        books: {},
        shelves: {},
        userData: [],
        spineLibrary: [],
        documents: {},
      },
    })

    expect(state.items).toEqual([])
    expect(state.shelves).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'all', name: 'All Books' }),
    ]))
    expect(state.user.displayName).toBe('My Library')
    expect(state.spineLibrary).toEqual({})
  })

  it('persists browser saves with readable formatting', async () => {
    await saveLibraryState({
      version: 3,
      items: [],
      shelves: [],
      user: {},
      spineLibrary: {},
    })

    expect(localStorage.getItem(LIBRARY_STORAGE_KEY)).toContain('\n  "version": 3')
  })
})
