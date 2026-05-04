import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  loadLibraryStateFromDb,
  saveBookItemToDb,
  saveDocumentItemToDb,
  saveUserSettingsToDb,
  deleteItemFromDb,
  saveShelvesToDb,
  saveSpineLibraryToDb,
} from '../data/libraryDb'
import {
  createBookItemFromBook,
  createDocumentItemFromDoc,
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
import { awaitPendingLibraryWrites } from '../data/libraryWriter'

export function useLibraryStore() {
  const [libraryState, setLibraryState] = useState(createEmptyLibraryState)
  const libraryStateRef = useRef(libraryState)
  const [libraryReady, setLibraryReady] = useState(false)
  const [libraryPath, setLibraryPath] = useState(null)
  const [libraryDirty, setLibraryDirty] = useState(false)
  const libraryDirtyRef = useRef(false)
  const [libraryError, setLibraryError] = useState(null)
  const [librarySyncError, setLibrarySyncError] = useState(null)
  const librarySyncErrorRef = useRef(null)

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

  useEffect(() => {
    libraryStateRef.current = libraryState
  }, [libraryState])

  const replaceLibraryState = useCallback((nextState) => {
    libraryStateRef.current = nextState
    setLibraryState(nextState)
  }, [])

  const setLibraryDirtyState = useCallback((nextDirty) => {
    libraryDirtyRef.current = nextDirty
    setLibraryDirty(nextDirty)
  }, [])

  const setLibrarySyncErrorState = useCallback((nextError) => {
    librarySyncErrorRef.current = nextError
    setLibrarySyncError(nextError)
  }, [])

  const persistWebState = useCallback((nextState) => {
    if (isTauri()) return
    saveLibraryState(nextState, { libraryPath })
      .then(() => {
        setLibraryDirtyState(false)
        setLibrarySyncErrorState(null)
      })
      .catch((error) => {
        console.warn('[library-store] Browser library save failed:', error?.message || error)
        setLibraryDirtyState(true)
        setLibrarySyncErrorState({
          code: error?.code || 'browser_library_save_failed',
          message: error?.message || 'Recent changes could not be saved in this browser.',
        })
      })
  }, [libraryPath, setLibraryDirtyState, setLibrarySyncErrorState])

  const commitLibraryState = useCallback((nextState) => {
    replaceLibraryState(nextState)
    persistWebState(nextState)
  }, [persistWebState, replaceLibraryState])

  const queueTargetedWrite = useCallback((writer) => {
    if (!isTauri() || !libraryReady || !libraryPath || libraryError) {
      setLibraryDirtyState(true)
      return
    }
    writer()
      .then(() => {
        setLibrarySyncErrorState(null)
      })
      .catch((error) => {
        console.warn('[library-db] Targeted write failed:', error?.message || error)
        setLibraryDirtyState(true)
        setLibrarySyncErrorState({
          code: error?.code || 'library_write_failed',
          message: error?.message || 'A recent change could not be saved to the local library.',
        })
      })
  }, [libraryError, libraryPath, libraryReady, setLibraryDirtyState, setLibrarySyncErrorState])

  const updateBookItem = (bookId, updates) => {
    const prev = libraryStateRef.current
    let nextBookItem = null
    const nextItems = (prev.items || []).map((item) => {
      if (item.id !== bookId) return item
      nextBookItem = mergeBookIntoItem(item, updates)
      return nextBookItem
    })
    if (!nextBookItem) return
    const nextState = { ...prev, items: nextItems }
    commitLibraryState(nextState)
    queueTargetedWrite(() => saveBookItemToDb(libraryPath, nextBookItem))
  }

  const updateDocumentItem = (docId, updates) => {
    const prev = libraryStateRef.current
    let nextDocumentItem = null
    const nextItems = (prev.items || []).map((item) => {
      if (item.id !== docId) return item
      nextDocumentItem = mergeDocumentIntoItem(item, updates)
      return nextDocumentItem
    })
    if (!nextDocumentItem) return
    const nextState = { ...prev, items: nextItems }
    commitLibraryState(nextState)
    queueTargetedWrite(() => saveDocumentItemToDb(libraryPath, nextDocumentItem))
  }

  const updateUserState = (updates) => {
    const prev = libraryStateRef.current
    const nextUserState = { ...(prev.user || {}), ...updates }
    const nextState = {
      ...prev,
      user: nextUserState,
    }
    commitLibraryState(nextState)
    queueTargetedWrite(() => saveUserSettingsToDb(libraryPath, nextUserState))
  }

  const insertBookItem = (bookData) => {
    const nextBookItem = bookData?.kind === 'book' && bookData?.bookMeta
      ? bookData
      : createBookItemFromBook(bookData)
    const prev = libraryStateRef.current
    const nextState = {
      ...prev,
      items: [...(prev.items || []), nextBookItem],
    }
    commitLibraryState(nextState)
    queueTargetedWrite(() => saveBookItemToDb(libraryPath, nextBookItem))
    return nextBookItem
  }

  const insertDocumentItem = (docData) => {
    const nextDocumentItem = (docData?.kind === 'document' || docData?.kind === 'article') && docData?.docMeta
      ? docData
      : createDocumentItemFromDoc(docData)
    const prev = libraryStateRef.current
    const nextState = {
      ...prev,
      items: [nextDocumentItem, ...(prev.items || [])],
    }
    commitLibraryState(nextState)
    queueTargetedWrite(() => saveDocumentItemToDb(libraryPath, nextDocumentItem))
    return nextDocumentItem
  }

  const removeLibraryItem = (itemId) => {
    const prev = libraryStateRef.current
    let removed = false
    const nextItems = (prev.items || []).filter((item) => {
      if (item.id !== itemId) return true
      removed = true
      return false
    })
    if (!removed) return
    const nextState = { ...prev, items: nextItems }
    commitLibraryState(nextState)
    queueTargetedWrite(() => deleteItemFromDb(libraryPath, itemId))
  }

  const updateShelvesState = (updater) => {
    const prev = libraryStateRef.current
    const nextShelves = typeof updater === 'function' ? updater(prev.shelves || []) : updater
    if (!nextShelves) return
    const nextState = { ...prev, shelves: nextShelves }
    commitLibraryState(nextState)
    queueTargetedWrite(() => saveShelvesToDb(libraryPath, nextShelves))
  }

  const updateSpineLibraryState = (updater) => {
    const prev = libraryStateRef.current
    const nextSpineLibrary = typeof updater === 'function'
      ? updater(prev.spineLibrary || {})
      : updater
    if (!nextSpineLibrary) return
    const nextState = { ...prev, spineLibrary: nextSpineLibrary }
    commitLibraryState(nextState)
    queueTargetedWrite(() => saveSpineLibraryToDb(libraryPath, nextSpineLibrary))
  }

  const initializeLibrary = useCallback(async (preferredPath = null) => {
    setLibraryReady(false)
    setLibraryError(null)
    setLibrarySyncErrorState(null)
    try {
      let resolvedPath = null
      if (isTauri()) {
        const storedPath = preferredPath || getStoredLibraryPath()
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
      replaceLibraryState(state)
      setLibraryDirtyState(false)
    } catch (error) {
      setLibraryError({
        code: error?.code || 'library_init_failed',
        message: error?.message || 'Unable to load this library.',
      })
      replaceLibraryState(createEmptyLibraryState())
      setLibraryDirtyState(false)
    } finally {
      setLibraryReady(true)
    }
  }, [replaceLibraryState, setLibraryDirtyState, setLibrarySyncErrorState])

  useEffect(() => {
    initializeLibrary()
  }, [initializeLibrary])

  useEffect(() => {
    if (!libraryReady || isTauri()) return
    persistWebState(libraryState)
  }, [libraryPath, libraryReady, libraryState, persistWebState])

  useEffect(() => {
    if (!libraryReady) return
    if (!isTauri()) {
      try {
        saveUserData(userData)
      } catch (error) {
        console.warn(
          '[library-store] Unable to persist browser user data:',
          error?.message || error
        )
      }
    }
  }, [userData, libraryReady])

  const refreshLibraryState = async () => {
    if (!isTauri() || !libraryPath) return
    try {
      const dbState = await loadLibraryStateFromDb(libraryPath)
      if (!dbState) return
      replaceLibraryState({
        ...dbState,
        user: { ...defaultUserData, ...(dbState.user || {}) },
      })
      setLibraryDirtyState(false)
      setLibraryError(null)
      setLibrarySyncErrorState(null)
    } catch (error) {
      setLibraryError({
        code: error?.code || 'library_refresh_failed',
        message: error?.message || 'Unable to refresh this library.',
      })
      throw error
    }
  }

  const flushLibraryState = async () => {
    if (!libraryReady) return
    try {
      if (isTauri() && libraryPath) {
        await awaitPendingLibraryWrites(libraryPath)
        if (!libraryDirtyRef.current) {
          const currentSyncError = librarySyncErrorRef.current
          if (currentSyncError) {
            const error = new Error(currentSyncError.message || 'Unable to finish saving the local library.')
            error.code = currentSyncError.code || 'library_write_failed'
            throw error
          }
          setLibrarySyncErrorState(null)
          setLibraryError(null)
          return
        }
      }
      await saveLibraryState(libraryStateRef.current, { libraryPath })
      setLibraryDirtyState(false)
      setLibraryError(null)
      setLibrarySyncErrorState(null)
    } catch (error) {
      setLibraryDirtyState(true)
      setLibrarySyncErrorState({
        code: error?.code || 'library_flush_failed',
        message: error?.message || 'Unable to finish saving the local library.',
      })
      throw error
    }
  }

  const retryLibraryLoad = async (preferredPath = null) => {
    await initializeLibrary(preferredPath)
  }

  return {
    libraryState,
    libraryReady,
    libraryDirty,
    libraryError,
    librarySyncError,
    libraryPath,
    setLibraryPath,
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    spineLibraryEntries,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    insertBookItem,
    insertDocumentItem,
    removeLibraryItem,
    updateShelvesState,
    updateSpineLibraryState,
    refreshLibraryState,
    flushLibraryState,
    retryLibraryLoad,
  }
}
