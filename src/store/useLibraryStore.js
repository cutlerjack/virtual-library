import { useEffect, useMemo, useState } from 'react'
import { isTauri } from '../utils/tauri'
import {
  getDefaultLibraryPath,
  getStoredLibraryPath,
  setStoredLibraryPath,
  ensureLibraryFolders,
  loadLibraryIndex,
} from '../utils/libraryVault'
import {
  createEmptyLibraryState,
  loadLibraryState,
  saveLibraryState,
  extractBooks,
  extractDocuments,
} from '../data/libraryStore'
import { loadLibraryStateFromDb } from '../data/libraryDb'
import {
  itemToBook,
  itemToDocument,
  mergeBookIntoItem,
  mergeDocumentIntoItem,
} from '../data/libraryAdapters'
import {
  defaultShelves,
  defaultUserData,
  getBooks,
  getShelves,
  getUserData,
  getSpineLibrary,
  getSpineLibraryEntriesFromMap,
  saveUserData,
} from '../utils/storage'

export function useLibraryStore() {
  const [libraryState, setLibraryState] = useState(createEmptyLibraryState())
  const [libraryReady, setLibraryReady] = useState(false)
  const [libraryPath, setLibraryPath] = useState(null)
  const [libraryDirty, setLibraryDirty] = useState(false)

  const books = useMemo(() => (
    extractBooks(libraryState).map(itemToBook).filter(Boolean)
  ), [libraryState])

  const documents = useMemo(() => (
    extractDocuments(libraryState).map(itemToDocument).filter(Boolean)
  ), [libraryState])

  const shelves = libraryState.shelves?.length ? libraryState.shelves : defaultShelves
  const userData = libraryState.user || defaultUserData
  const spineLibraryMap = libraryState.spineLibrary || {}
  const spineLibraryEntries = useMemo(() => (
    getSpineLibraryEntriesFromMap(spineLibraryMap)
  ), [spineLibraryMap])

  const updateLibraryState = (updater) => {
    setLibraryState((prev) => {
      const next = updater(prev)
      return next
    })
    setLibraryDirty(true)
  }

  const updateBookItem = (bookId, updates) => {
    updateLibraryState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (
        item.id === bookId ? mergeBookIntoItem(item, updates) : item
      )),
    }))
  }

  const updateDocumentItem = (docId, updates) => {
    updateLibraryState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (
        item.id === docId ? mergeDocumentIntoItem(item, updates) : item
      )),
    }))
  }

  const updateUserState = (updates) => {
    updateLibraryState((prev) => ({
      ...prev,
      user: { ...prev.user, ...updates },
    }))
  }

  const updateShelvesState = (updater) => {
    updateLibraryState((prev) => {
      const nextShelves = typeof updater === 'function' ? updater(prev.shelves || []) : updater
      return { ...prev, shelves: nextShelves }
    })
  }

  useEffect(() => {
    const initializeLibrary = async () => {
      let resolvedPath = null
      if (isTauri()) {
        const storedPath = getStoredLibraryPath()
        resolvedPath = storedPath || await getDefaultLibraryPath()
        setStoredLibraryPath(resolvedPath)
        await ensureLibraryFolders(resolvedPath)
        setLibraryPath(resolvedPath)
      }
      const legacy = {
        books: getBooks(),
        shelves: getShelves(),
        userData: getUserData(),
        spineLibrary: getSpineLibrary(),
        documents: isTauri() && resolvedPath
          ? (await loadLibraryIndex(resolvedPath)).documents || []
          : [],
      }
      const state = await loadLibraryState({ libraryPath: resolvedPath, legacy })
      setLibraryState(state)
      setLibraryDirty(false)
      setLibraryReady(true)
    }
    initializeLibrary()
  }, [])

  useEffect(() => {
    if (!libraryReady) return
    if (isTauri()) return
    const timeout = setTimeout(() => {
      saveLibraryState(libraryState, { libraryPath })
      setLibraryDirty(false)
    }, 800)
    return () => clearTimeout(timeout)
  }, [libraryState, libraryReady, libraryPath])

  useEffect(() => {
    if (!libraryReady) return
    if (!isTauri()) {
      saveUserData(userData)
    }
  }, [userData, libraryReady])

  const refreshLibraryState = async () => {
    if (!isTauri() || !libraryPath) return
    const dbState = await loadLibraryStateFromDb(libraryPath)
    if (!dbState) return
    setLibraryState({
      ...dbState,
      user: { ...defaultUserData, ...(dbState.user || {}) },
    })
    setLibraryDirty(false)
  }

  const flushLibraryState = async () => {
    if (!libraryReady) return
    await saveLibraryState(libraryState, { libraryPath })
    setLibraryDirty(false)
  }

  return {
    libraryState,
    libraryReady,
    libraryDirty,
    libraryPath,
    setLibraryPath,
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    spineLibraryEntries,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
    refreshLibraryState,
    flushLibraryState,
  }
}
