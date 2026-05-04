/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addSpineToLibrary,
  defaultShelves,
  defaultUserData,
  getBooks,
  getShelves,
  getSpineLibrary,
  getUserData,
  removeSpineFromLibrary,
  saveBooks,
  saveShelves,
  saveSpineLibrary,
  saveUserData,
  updateSpineInLibrary,
} from './storage'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('legacy browser storage helpers', () => {
  it('falls back to defaults when stored JSON is unreadable', () => {
    localStorage.setItem('virtual-library-books', '{')
    localStorage.setItem('virtual-library-shelves', '{')
    localStorage.setItem('virtual-library-user', '{')
    localStorage.setItem('virtual-library-spine-library', '{')

    expect(getBooks()).toEqual([])
    expect(getShelves()).toEqual(defaultShelves)
    expect(getUserData()).toEqual(defaultUserData)
    expect(getSpineLibrary()).toEqual({})
  })

  it('falls back to defaults when stored JSON has the wrong shape', () => {
    localStorage.setItem('virtual-library-books', '{}')
    localStorage.setItem('virtual-library-shelves', '{}')
    localStorage.setItem('virtual-library-user', '[]')
    localStorage.setItem('virtual-library-spine-library', '[]')

    expect(getBooks()).toEqual([])
    expect(getShelves()).toEqual(defaultShelves)
    expect(getUserData()).toEqual(defaultUserData)
    expect(getSpineLibrary()).toEqual({})
  })

  it('returns write status instead of throwing when storage is blocked', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    expect(saveBooks([])).toBe(false)
    expect(saveShelves(defaultShelves)).toBe(false)
    expect(saveUserData(defaultUserData)).toBe(false)
    expect(saveSpineLibrary({})).toBe(false)

    expect(warnSpy).toHaveBeenCalledWith(
      '[storage] Unable to persist browser storage:',
      'storage blocked'
    )
  })

  it('reports failed spine mutations without crashing callers', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(addSpineToLibrary({
      isbn: '9780143127741',
      spineImage: 'data:image/png;base64,abc',
      title: 'A Book',
      author: 'A Writer',
    })).toBeNull()
    expect(updateSpineInLibrary({
      isbn: '9780143127741',
      spineImage: 'data:image/png;base64,abc',
    })).toBeNull()
    expect(removeSpineFromLibrary('9780143127741')).toBe(false)
  })
})
