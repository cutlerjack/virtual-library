/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join, normalize } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/tauri'
import { openDialog, saveDialog } from '../../utils/tauriDialog'
import { ensureLibraryFolders } from '../../utils/libraryVault'
import { addSnapshotRecord, closeLibraryDb, listSnapshots } from '../../data/libraryDb'
import { useTauriRecoveryOperations } from './useTauriRecoveryOperations'

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts) => Promise.resolve(parts.join('/'))),
  normalize: vi.fn((path) => Promise.resolve(String(path).replace(/[\\/]+$/, ''))),
}))

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}))

vi.mock('../../utils/tauri', () => ({
  isTauri: () => true,
}))

vi.mock('../../utils/tauriDialog', () => ({
  openDialog: vi.fn(),
  saveDialog: vi.fn(),
}))

vi.mock('../../utils/libraryVault', () => ({
  ensureLibraryFolders: vi.fn(),
  setStoredLibraryPath: vi.fn(),
}))

vi.mock('../../data/libraryDb', () => ({
  addSnapshotRecord: vi.fn(),
  closeLibraryDb: vi.fn(),
  listSnapshots: vi.fn(),
}))

let container = null
let root = null
let currentOperations = null
let defaultShowMaintenanceStatus = vi.fn()

function RecoveryHarness(props) {
  currentOperations = useTauriRecoveryOperations({
    libraryPath: '/library',
    setLibraryPath: vi.fn(),
    libraryReady: true,
    userData: {},
    flushLibraryState: vi.fn(),
    updateUserState: vi.fn(),
    showMaintenanceStatus: defaultShowMaintenanceStatus,
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
  throw new Error('Timed out waiting for recovery hook')
}

beforeEach(() => {
  vi.clearAllMocks()
  currentOperations = null
  defaultShowMaintenanceStatus = vi.fn()
  listSnapshots.mockResolvedValue([])
  join.mockImplementation((...parts) => Promise.resolve(parts.join('/')))
  normalize.mockImplementation((path) => Promise.resolve(String(path).replace(/[\\/]+$/, '')))
  openDialog.mockResolvedValue(null)
  saveDialog.mockResolvedValue(null)
  ensureLibraryFolders.mockResolvedValue(undefined)
  closeLibraryDb.mockResolvedValue(undefined)
  invoke.mockResolvedValue(undefined)
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
})

describe('useTauriRecoveryOperations', () => {
  it('surfaces snapshot load failures without an unhandled rejection', async () => {
    const showMaintenanceStatus = vi.fn()
    listSnapshots.mockRejectedValue(new Error('database locked'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await waitFor(() => showMaintenanceStatus.mock.calls.length > 0)

    expect(currentOperations.snapshots).toEqual([])
    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Unable to load snapshots. database locked',
      6000
    )
  })

  it('surfaces snapshot path failures without rejecting the action', async () => {
    const showMaintenanceStatus = vi.fn()
    join.mockRejectedValue(new Error('path unavailable'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await act(async () => {
      await expect(currentOperations.handleCreateSnapshot()).resolves.toBeUndefined()
    })

    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Snapshot failed. path unavailable',
      6000
    )
  })

  it('surfaces snapshot folder failures without rejecting the action', async () => {
    const showMaintenanceStatus = vi.fn()
    ensureLibraryFolders.mockRejectedValue(new Error('folder unavailable'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await act(async () => {
      await expect(currentOperations.handleCreateSnapshot()).resolves.toBeUndefined()
    })

    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Snapshot failed. folder unavailable',
      6000
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it('normalizes non-string snapshot notes before recording', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness />)
    })
    await act(async () => {
      await currentOperations.handleCreateSnapshot({ type: 'click' })
    })

    expect(addSnapshotRecord).toHaveBeenCalledWith(
      '/library',
      expect.objectContaining({ note: 'Library Snapshot' })
    )
  })

  it('flushes and closes the active database before exporting a snapshot', async () => {
    const flushLibraryState = vi.fn().mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness flushLibraryState={flushLibraryState} />)
    })
    await act(async () => {
      await currentOperations.handleCreateSnapshot('Before risky import')
    })

    expect(flushLibraryState).toHaveBeenCalledTimes(1)
    expect(closeLibraryDb).toHaveBeenCalledWith('/library')
    expect(invoke).toHaveBeenCalledWith('export_backup', {
      libraryPath: '/library',
      outputPath: expect.stringContaining('/library/snapshots/snapshot-'),
    })
    expect(flushLibraryState.mock.invocationCallOrder[0]).toBeLessThan(
      closeLibraryDb.mock.invocationCallOrder[0]
    )
    expect(closeLibraryDb.mock.invocationCallOrder[0]).toBeLessThan(
      invoke.mock.invocationCallOrder[0]
    )
  })

  it('surfaces backup path failures without rejecting the action', async () => {
    const showMaintenanceStatus = vi.fn()
    join.mockRejectedValue(new Error('path unavailable'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await act(async () => {
      await expect(currentOperations.handleExportBackup()).resolves.toBeUndefined()
    })

    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Backup failed. path unavailable',
      6000
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it('surfaces backup dialog failures without rejecting the action', async () => {
    const showMaintenanceStatus = vi.fn()
    saveDialog.mockRejectedValue(new Error('dialog unavailable'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await act(async () => {
      await expect(currentOperations.handleExportBackup()).resolves.toBeUndefined()
    })

    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Backup failed. dialog unavailable',
      6000
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it('flushes and closes the active database before exporting a manual backup', async () => {
    const flushLibraryState = vi.fn().mockResolvedValue(undefined)
    saveDialog.mockResolvedValue('/library/manual-backup.zip')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness flushLibraryState={flushLibraryState} />)
    })
    await act(async () => {
      await currentOperations.handleExportBackup()
    })

    expect(flushLibraryState).toHaveBeenCalledTimes(1)
    expect(closeLibraryDb).toHaveBeenCalledWith('/library')
    expect(invoke).toHaveBeenCalledWith('export_backup', {
      libraryPath: '/library',
      outputPath: '/library/manual-backup.zip',
    })
    expect(flushLibraryState.mock.invocationCallOrder[0]).toBeLessThan(
      closeLibraryDb.mock.invocationCallOrder[0]
    )
    expect(closeLibraryDb.mock.invocationCallOrder[0]).toBeLessThan(
      invoke.mock.invocationCallOrder[0]
    )
  })

  it('surfaces restore dialog failures without rejecting the action', async () => {
    const showMaintenanceStatus = vi.fn()
    openDialog.mockRejectedValue(new Error('dialog unavailable'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await act(async () => {
      await expect(currentOperations.handleRestoreBackup()).resolves.toBeUndefined()
    })

    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Restore failed. dialog unavailable',
      8000
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it('surfaces restore target dialog failures without rejecting the action', async () => {
    const showMaintenanceStatus = vi.fn()
    openDialog
      .mockResolvedValueOnce('/library/backup.zip')
      .mockRejectedValueOnce(new Error('target unavailable'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await act(async () => {
      await expect(currentOperations.handleRestoreBackup()).resolves.toBeUndefined()
    })

    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Restore failed. target unavailable',
      8000
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it('closes the cached database before restoring into the active library folder', async () => {
    const flushLibraryState = vi.fn().mockResolvedValue(undefined)
    openDialog
      .mockResolvedValueOnce('/library/backup.zip')
      .mockResolvedValueOnce('/library')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness flushLibraryState={flushLibraryState} />)
    })
    await act(async () => {
      await currentOperations.handleRestoreBackup()
    })

    expect(flushLibraryState).toHaveBeenCalledTimes(1)
    expect(closeLibraryDb).toHaveBeenCalledWith('/library')
    expect(invoke).toHaveBeenCalledWith('restore_backup', {
      backupPath: '/library/backup.zip',
      targetPath: '/library',
    })
    expect(flushLibraryState.mock.invocationCallOrder[0]).toBeLessThan(
      closeLibraryDb.mock.invocationCallOrder[0]
    )
    expect(closeLibraryDb.mock.invocationCallOrder[0]).toBeLessThan(
      invoke.mock.invocationCallOrder[0]
    )
  })

  it('closes the cached database before restoring into a path-equivalent active library folder', async () => {
    const flushLibraryState = vi.fn().mockResolvedValue(undefined)
    openDialog
      .mockResolvedValueOnce('/library/backup.zip')
      .mockResolvedValueOnce('/Volumes/Library Alias')
    invoke.mockImplementation(async (command) => (
      command === 'paths_refer_to_same_location' ? true : undefined
    ))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness flushLibraryState={flushLibraryState} />)
    })
    await act(async () => {
      await currentOperations.handleRestoreBackup()
    })

    expect(invoke).toHaveBeenCalledWith('paths_refer_to_same_location', {
      firstPath: '/Volumes/Library Alias',
      secondPath: '/library',
    })
    expect(flushLibraryState).toHaveBeenCalledTimes(1)
    expect(closeLibraryDb).toHaveBeenCalledWith('/library')
    expect(invoke).toHaveBeenCalledWith('restore_backup', {
      backupPath: '/library/backup.zip',
      targetPath: '/Volumes/Library Alias',
    })
    expect(closeLibraryDb.mock.invocationCallOrder[0]).toBeLessThan(
      invoke.mock.invocationCallOrder.find((order, index) => (
        invoke.mock.calls[index]?.[0] === 'restore_backup'
      ))
    )
  })

  it('leaves the active database open when restoring a backup into another folder', async () => {
    const flushLibraryState = vi.fn().mockResolvedValue(undefined)
    openDialog
      .mockResolvedValueOnce('/library/backup.zip')
      .mockResolvedValueOnce('/other-library')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness flushLibraryState={flushLibraryState} />)
    })
    await act(async () => {
      await currentOperations.handleRestoreBackup()
    })

    expect(flushLibraryState).not.toHaveBeenCalled()
    expect(closeLibraryDb).not.toHaveBeenCalled()
    expect(invoke).toHaveBeenCalledWith('restore_backup', {
      backupPath: '/library/backup.zip',
      targetPath: '/other-library',
    })
  })

  it('closes the cached database before restoring a snapshot over the active library', async () => {
    const flushLibraryState = vi.fn().mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<RecoveryHarness flushLibraryState={flushLibraryState} />)
    })
    await act(async () => {
      await currentOperations.handleRestoreSnapshot({ snapshot_path: '/library/snapshots/snapshot.zip' })
    })

    expect(flushLibraryState).toHaveBeenCalledTimes(1)
    expect(closeLibraryDb).toHaveBeenCalledWith('/library')
    expect(invoke).toHaveBeenCalledWith('restore_backup', {
      backupPath: '/library/snapshots/snapshot.zip',
      targetPath: '/library',
    })
    expect(flushLibraryState.mock.invocationCallOrder[0]).toBeLessThan(
      closeLibraryDb.mock.invocationCallOrder[0]
    )
    expect(closeLibraryDb.mock.invocationCallOrder[0]).toBeLessThan(
      invoke.mock.invocationCallOrder[0]
    )
  })

  it('does not publish snapshot success after unmounting mid-action', async () => {
    const updateUserState = vi.fn()
    const showMaintenanceStatus = vi.fn()
    let resolveExport
    invoke.mockReturnValue(new Promise((resolve) => {
      resolveExport = resolve
    }))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <RecoveryHarness
          updateUserState={updateUserState}
          showMaintenanceStatus={showMaintenanceStatus}
        />
      )
    })
    let createPromise
    act(() => {
      createPromise = currentOperations.handleCreateSnapshot()
    })

    act(() => {
      root.unmount()
    })
    root = null

    await act(async () => {
      resolveExport()
      await createPromise
    })

    expect(updateUserState).not.toHaveBeenCalled()
    expect(showMaintenanceStatus).toHaveBeenCalledWith('Creating snapshot...', 0)
    expect(showMaintenanceStatus).not.toHaveBeenCalledWith('Snapshot saved.', 4000)
  })
})
