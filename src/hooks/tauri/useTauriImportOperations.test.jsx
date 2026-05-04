/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openDialog } from '../../utils/tauriDialog'
import { findLatestExportFile, importLibraryFiles, loadExportPayload, migrateExportToLibraryState } from '../../utils/libraryVault'
import { useTauriImportOperations } from './useTauriImportOperations'

vi.mock('../../utils/tauri', () => ({
  isTauri: () => true,
}))

vi.mock('../../utils/tauriDialog', () => ({
  openDialog: vi.fn(),
}))

vi.mock('../../utils/libraryVault', () => ({
  findLatestExportFile: vi.fn(),
  importLibraryFiles: vi.fn(),
  loadExportPayload: vi.fn(),
  migrateExportToLibraryState: vi.fn(),
}))

let container = null
let root = null
let currentOperations = null

function ImportHarness(props) {
  currentOperations = useTauriImportOperations({
    libraryPath: '/library',
    books: [],
    shelves: [],
    updateBookItem: vi.fn(),
    insertBookItem: vi.fn(),
    insertDocumentItem: vi.fn(),
    updateShelvesState: vi.fn(),
    updateUserState: vi.fn(),
    flushLibraryState: vi.fn(),
    setVaultError: vi.fn(),
    showMaintenanceStatus: vi.fn(),
    ...props,
  })
  return null
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve()
  })
}

async function waitFor(predicate) {
  for (let index = 0; index < 20; index += 1) {
    await flushReact()
    if (predicate()) return
  }
  throw new Error('Timed out waiting for import hook')
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  currentOperations = null
  findLatestExportFile.mockResolvedValue(null)
  openDialog.mockResolvedValue(null)
  loadExportPayload.mockResolvedValue(null)
  migrateExportToLibraryState.mockReturnValue({ books: [], shelves: [] })
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
  currentOperations = null
  localStorage.clear()
})

describe('useTauriImportOperations', () => {
  it('marks automatic migration failed when export discovery rejects', async () => {
    const setVaultError = vi.fn()
    findLatestExportFile.mockRejectedValue(new Error('permission denied'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<ImportHarness setVaultError={setVaultError} />)
    })
    await waitFor(() => currentOperations.migrationStatus === 'failed')

    expect(localStorage.getItem('virtual-library-migration-v1')).toBe('failed')
    expect(setVaultError).toHaveBeenCalledWith('Migration failed. permission denied')
  })

  it('returns false and surfaces manual migration dialog failures', async () => {
    const setVaultError = vi.fn()
    openDialog.mockRejectedValue(new Error('dialog denied'))
    localStorage.setItem('virtual-library-migration-v1', 'manual')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<ImportHarness setVaultError={setVaultError} />)
    })
    await flushReact()

    await act(async () => {
      await expect(currentOperations.handleMigrateExportFile()).resolves.toBe(false)
    })

    expect(currentOperations.migrationStatus).toBe('failed')
    expect(setVaultError).toHaveBeenCalledWith('Migration failed. dialog denied')
  })

  it('returns false and surfaces manual migration payload failures', async () => {
    const setVaultError = vi.fn()
    openDialog.mockResolvedValue('/library/export.json')
    loadExportPayload.mockRejectedValue(new Error('invalid json'))
    localStorage.setItem('virtual-library-migration-v1', 'manual')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<ImportHarness setVaultError={setVaultError} />)
    })
    await flushReact()

    await act(async () => {
      await expect(currentOperations.handleMigrateExportFile()).resolves.toBe(false)
    })

    expect(currentOperations.migrationStatus).toBe('failed')
    expect(setVaultError).toHaveBeenCalledWith('Migration failed. invalid json')
  })

  it('surfaces partial document import failures in the status message', async () => {
    const insertDocumentItem = vi.fn()
    const showMaintenanceStatus = vi.fn()
    const docs = [{
      id: 'doc-1',
      title: 'Imported PDF',
      filePath: '/library/Imported.pdf',
      type: 'pdf',
    }]
    docs.failures = ['Unable to copy second.pdf. unreadable']
    importLibraryFiles.mockResolvedValue(docs)
    localStorage.setItem('virtual-library-migration-v1', 'manual')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <ImportHarness
          insertDocumentItem={insertDocumentItem}
          showMaintenanceStatus={showMaintenanceStatus}
        />
      )
    })
    await flushReact()

    await act(async () => {
      await currentOperations.handleImportDocuments()
    })

    expect(insertDocumentItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc-1' }))
    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Imported 1 document. 1 file could not be imported.'
    )
  })

  it('does not announce imported documents until persistence flush succeeds', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const insertDocumentItem = vi.fn()
    const setVaultError = vi.fn()
    const showMaintenanceStatus = vi.fn()
    const flushLibraryState = vi.fn(() => Promise.reject(new Error('database locked')))
    importLibraryFiles.mockResolvedValue([{
      id: 'doc-1',
      title: 'Imported PDF',
      filePath: '/library/Imported.pdf',
      type: 'pdf',
    }])
    localStorage.setItem('virtual-library-migration-v1', 'manual')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <ImportHarness
          insertDocumentItem={insertDocumentItem}
          setVaultError={setVaultError}
          showMaintenanceStatus={showMaintenanceStatus}
          flushLibraryState={flushLibraryState}
        />
      )
    })
    await flushReact()

    await act(async () => {
      await currentOperations.handleImportDocuments()
    })

    expect(insertDocumentItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc-1' }))
    expect(flushLibraryState).toHaveBeenCalled()
    expect(showMaintenanceStatus).not.toHaveBeenCalled()
    expect(setVaultError).toHaveBeenCalledWith('Import failed. database locked')
    errorSpy.mockRestore()
  })

  it('does not mark manual migration done until persistence flush succeeds', async () => {
    const insertBookItem = vi.fn()
    const setVaultError = vi.fn()
    const flushLibraryState = vi.fn(() => Promise.reject(new Error('database locked')))
    openDialog.mockResolvedValue('/library/export.json')
    loadExportPayload.mockResolvedValue({ books: [] })
    migrateExportToLibraryState.mockReturnValue({
      books: [{ id: 'book-1', title: 'Migrated Book' }],
      shelves: [],
    })
    localStorage.setItem('virtual-library-migration-v1', 'manual')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <ImportHarness
          insertBookItem={insertBookItem}
          setVaultError={setVaultError}
          flushLibraryState={flushLibraryState}
        />
      )
    })
    await flushReact()

    await act(async () => {
      await expect(currentOperations.handleMigrateExportFile()).resolves.toBe(false)
    })

    expect(insertBookItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'book-1' }))
    expect(flushLibraryState).toHaveBeenCalled()
    expect(currentOperations.migrationStatus).toBe('failed')
    expect(localStorage.getItem('virtual-library-migration-v1')).toBe('manual')
    expect(setVaultError).toHaveBeenCalledWith('Migration failed. database locked')
  })

  it('continues automatic migration when the migration flag cannot be persisted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    findLatestExportFile.mockResolvedValue(null)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<ImportHarness />)
    })
    await waitFor(() => currentOperations.migrationStatus === 'no-file')

    expect(warnSpy).toHaveBeenCalledWith(
      '[migration] Unable to persist migration flag:',
      'storage blocked'
    )

    setItemSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
