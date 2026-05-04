import { isTauri } from '../utils/tauri'
import { defaultShelves, defaultUserData } from '../utils/storage'
import { loadLibraryStateFromDb, saveLibraryStateToDb } from './libraryDb'
import {
  createBookItemFromBook,
  createDocumentItemFromDoc,
  normalizeBookItem,
  normalizeDocumentItem,
  migrateLibraryState as migrateLibraryStateInternal,
} from './librarySchema'

export const LIBRARY_SCHEMA_VERSION = 3
export const LIBRARY_STORAGE_KEY = 'virtual-library-state-v1'

export function createEmptyLibraryState() {
  return {
    version: LIBRARY_SCHEMA_VERSION,
    items: [],
    shelves: defaultShelves,
    user: { ...defaultUserData },
    spineLibrary: {},
  }
}

export function mapBookToItem(book) {
  return createBookItemFromBook(book)
}

export function mapDocumentToItem(doc) {
  return createDocumentItemFromDoc(doc)
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function migrateLibraryStateToV2(state) {
  return migrateLibraryStateInternal(state)
}

export function migrateLegacyState({ books = [], shelves = [], userData = {}, spineLibrary = {}, documents = [] }) {
  const legacyBooks = safeArray(books)
  const legacyDocuments = safeArray(documents)
  const legacyShelves = safeArray(shelves)
  const baseState = {
    version: 1,
    items: [
      ...legacyBooks.map(mapBookToItem),
      ...legacyDocuments.map(mapDocumentToItem),
    ],
    shelves: legacyShelves.length > 0 ? legacyShelves : defaultShelves,
    user: { ...defaultUserData, ...safeObject(userData) },
    spineLibrary: safeObject(spineLibrary),
  }

  return migrateLibraryStateInternal(baseState)
}

export function extractBooks(state) {
  return state.items.filter((item) => item.kind === 'book')
}

export function extractDocuments(state) {
  return state.items.filter((item) => item.kind === 'document' || item.kind === 'article')
}

function normalizeParsedState(parsed) {
  if (!parsed || typeof parsed !== 'object') return null
  if (!parsed.version || parsed.version > LIBRARY_SCHEMA_VERSION) return null
  if (parsed.version <= LIBRARY_SCHEMA_VERSION) {
    return migrateLibraryStateInternal({
      version: 1,
      items: safeArray(parsed.items),
      shelves: safeArray(parsed.shelves),
      user: safeObject(parsed.user),
      spineLibrary: safeObject(parsed.spineLibrary),
    })
  }
  return null
}

function persistBrowserLibraryState(state, { pretty = false } = {}) {
  const payload = pretty
    ? JSON.stringify(state, null, 2)
    : JSON.stringify(state)
  localStorage.setItem(LIBRARY_STORAGE_KEY, payload)
}

function tryPersistBrowserLibraryState(state) {
  try {
    persistBrowserLibraryState(state)
  } catch (error) {
    console.warn(
      '[library-store] Unable to persist browser library state:',
      error?.message || error
    )
  }
}

export async function loadLibraryState({ libraryPath, legacy }) {
  if (!isTauri()) {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const normalized = normalizeParsedState(parsed)
        if (normalized) {
          if (normalized.version !== parsed.version) {
            tryPersistBrowserLibraryState(normalized)
          }
          return normalized
        }
      } catch {
        // ignore
      }
    }
    const migrated = migrateLegacyState(legacy)
    tryPersistBrowserLibraryState(migrated)
    return migrated
  }

  if (!libraryPath) {
    const migrated = migrateLegacyState(legacy)
    return migrated
  }

  const dbState = await loadLibraryStateFromDb(libraryPath)
  if (dbState) {
    return {
      ...dbState,
      user: { ...defaultUserData, ...(dbState.user || legacy.userData || {}) },
    }
  }

  const migrated = migrateLegacyState(legacy)
  await saveLibraryStateToDb(libraryPath, migrated)
  return migrated
}

export async function saveLibraryState(state, { libraryPath } = {}) {
  if (!isTauri()) {
    persistBrowserLibraryState(state, { pretty: true })
    return
  }
  if (!libraryPath) return
  await saveLibraryStateToDb(libraryPath, state)
}

export { normalizeBookItem, normalizeDocumentItem }
