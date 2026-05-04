/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLibraryStore } from './useLibraryStore'

let container = null
let root = null
let currentStore = null

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
  vi.restoreAllMocks()
  localStorage.clear()
  currentStore = null
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
  currentStore = null
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useLibraryStore in browser mode', () => {
  it('does not fail initialization when browser user-data persistence is unavailable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    await renderStore()
    await waitForStore((store) => store.librarySyncError)

    expect(currentStore.libraryReady).toBe(true)
    expect(currentStore.libraryError).toBeNull()
    expect(currentStore.libraryDirty).toBe(true)
    expect(currentStore.librarySyncError).toEqual(expect.objectContaining({
      code: 'browser_library_save_failed',
      message: 'storage blocked',
    }))
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-store] Browser library save failed:',
      'storage blocked'
    )
    expect(warnSpy).toHaveBeenCalledWith(
      '[storage] Unable to persist browser storage:',
      'storage blocked'
    )
  })
})
