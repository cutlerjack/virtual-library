import { useEffect, useState } from 'react'
import { isTauri } from '../../utils/tauri'
import { openDialog } from '../../utils/tauriDialog'
import {
  importLibraryFiles,
  findLatestExportFile,
  loadExportPayload,
  migrateExportToLibraryState,
} from '../../utils/libraryVault'
import { applyAutomaticBookLinks } from './documentLinking'

const MIGRATION_FLAG_KEY = 'virtual-library-migration-v1'

function getMigrationFlag() {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY)
  } catch (error) {
    console.warn('[migration] Unable to read migration flag:', error?.message || error)
    return null
  }
}

function setMigrationFlag(value) {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, value)
  } catch (error) {
    console.warn('[migration] Unable to persist migration flag:', error?.message || error)
  }
}

export function useTauriImportOperations({
  libraryPath,
  books,
  shelves,
  updateBookItem,
  insertBookItem,
  insertDocumentItem,
  updateShelvesState,
  updateUserState,
  flushLibraryState = async () => {},
  setVaultError,
  showMaintenanceStatus,
}) {
  const [migrationStatus, setMigrationStatus] = useState('idle')

  const applyMigratedLibraryState = (migratedBooks, migratedShelves) => {
    const existingBookIds = new Set(books.map((book) => book.id))

    updateShelvesState(migratedShelves)
    migratedBooks.forEach((book) => {
      if (existingBookIds.has(book.id)) {
        updateBookItem(book.id, book)
        return
      }
      insertBookItem(book)
    })
    updateUserState({ ratingScale: 10 })
  }

  useEffect(() => {
    if (!isTauri()) return
    if (!libraryPath) return
    if (migrationStatus !== 'idle') return
    if (books.length > 0) {
      setMigrationStatus('skipped')
      return
    }
    const storedFlag = getMigrationFlag()
    if (storedFlag) {
      setMigrationStatus(storedFlag)
      return
    }
    const runMigration = async () => {
      try {
        setMigrationStatus('searching')
        const latest = await findLatestExportFile(libraryPath)
        if (!latest?.path) {
          setMigrationFlag('no-file')
          setMigrationStatus('no-file')
          return
        }
        const payload = await loadExportPayload(latest.path)
        if (!payload) {
          setMigrationFlag('failed')
          setMigrationStatus('failed')
          return
        }
        const { books: migratedBooks, shelves: migratedShelves } = migrateExportToLibraryState(payload, shelves, books)
        applyMigratedLibraryState(migratedBooks, migratedShelves)
        await flushLibraryState()
        setMigrationFlag('done')
        setMigrationStatus('done')
      } catch (error) {
        const detail = error?.message ? ` ${error.message}` : ''
        setMigrationFlag('failed')
        setMigrationStatus('failed')
        setVaultError?.(`Migration failed.${detail}`)
      }
    }
    runMigration()
  }, [
    books,
    insertBookItem,
    libraryPath,
    migrationStatus,
    shelves,
    updateBookItem,
    updateShelvesState,
    updateUserState,
    flushLibraryState,
  ])

  const handleImportDocuments = async () => {
    if (!isTauri() || !libraryPath) return
    setVaultError('')
    try {
      const newDocs = await importLibraryFiles(libraryPath)
      if (newDocs.length === 0) return
      const importFailures = Array.isArray(newDocs.failures) ? newDocs.failures : []
      const { docs: preparedDocs, linkedCount } = applyAutomaticBookLinks(newDocs, books)
      preparedDocs.forEach((doc) => {
        insertDocumentItem(doc)
      })
      await flushLibraryState()
      const failureDetail = importFailures.length > 0
        ? ` ${importFailures.length} file${importFailures.length === 1 ? '' : 's'} could not be imported.`
        : ''
      showMaintenanceStatus(
        linkedCount > 0
          ? `Imported ${preparedDocs.length} document${preparedDocs.length === 1 ? '' : 's'}. Auto-linked ${linkedCount} to books.${failureDetail}`
          : `Imported ${preparedDocs.length} document${preparedDocs.length === 1 ? '' : 's'}.${failureDetail}`
      )
    } catch (error) {
      console.error('Import failed:', error)
      const detail = error?.message ? error.message : JSON.stringify(error)
      setVaultError(`Import failed. ${detail || ''}`.trim())
    }
  }

  const handleMigrateExportFile = async () => {
    if (!isTauri()) return false
    try {
      const selection = await openDialog({
        multiple: false,
        filters: [{ name: 'Library Export', extensions: ['json'] }],
      })
      if (!selection || Array.isArray(selection)) return false
      const payload = await loadExportPayload(selection)
      if (!payload) return false
      const { books: migratedBooks, shelves: migratedShelves } = migrateExportToLibraryState(payload, shelves, books)
      applyMigratedLibraryState(migratedBooks, migratedShelves)
      await flushLibraryState()
      setMigrationFlag('done')
      setMigrationStatus('done')
      return true
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      setMigrationStatus('failed')
      setVaultError?.(`Migration failed.${detail}`)
      return false
    }
  }

  return {
    migrationStatus,
    handleImportDocuments,
    handleMigrateExportFile,
  }
}
