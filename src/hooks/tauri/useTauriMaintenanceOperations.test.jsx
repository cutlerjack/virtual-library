/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listIntegrityChecks, rescanLibraryFiles } from '../../data/libraryDb'
import { useTauriMaintenanceOperations } from './useTauriMaintenanceOperations'

vi.mock('../../utils/tauri', () => ({
  isTauri: () => true,
}))

vi.mock('../../data/libraryDb', () => ({
  addIntegrityCheck: vi.fn(),
  rebuildSearchIndex: vi.fn(),
  listIntegrityChecks: vi.fn(),
  rescanLibraryFiles: vi.fn(),
  runIntegrityCheck: vi.fn(),
}))

let container = null
let root = null
let currentOperations = null
let defaultShowMaintenanceStatus = vi.fn()

function MaintenanceHarness(props) {
  currentOperations = useTauriMaintenanceOperations({
    libraryPath: '/library',
    libraryReady: true,
    flushLibraryState: vi.fn(),
    refreshLibraryState: vi.fn(),
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
  throw new Error('Timed out waiting for maintenance hook')
}

beforeEach(() => {
  vi.clearAllMocks()
  currentOperations = null
  defaultShowMaintenanceStatus = vi.fn()
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

describe('useTauriMaintenanceOperations', () => {
  it('surfaces integrity check load failures without an unhandled rejection', async () => {
    const showMaintenanceStatus = vi.fn()
    listIntegrityChecks.mockRejectedValue(new Error('database locked'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<MaintenanceHarness showMaintenanceStatus={showMaintenanceStatus} />)
    })
    await waitFor(() => showMaintenanceStatus.mock.calls.length > 0)

    expect(currentOperations.integrityStatus).toBeNull()
    expect(showMaintenanceStatus).toHaveBeenCalledWith(
      'Unable to load integrity checks. database locked',
      6000
    )
  })

  it('loads the latest integrity check summary on startup', async () => {
    listIntegrityChecks.mockResolvedValue([{
      status: 'warning',
      details_json: JSON.stringify({ summary: 'Missing files detected.' }),
    }])
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<MaintenanceHarness />)
    })
    await waitFor(() => currentOperations.integrityStatus?.status === 'warning')

    expect(currentOperations.integrityStatus).toEqual({
      status: 'warning',
      details: 'Missing files detected.',
    })
  })

  it('does not publish rescan completion after unmounting mid-action', async () => {
    const updateUserState = vi.fn()
    const showMaintenanceStatus = vi.fn()
    let resolveRescan
    listIntegrityChecks.mockResolvedValue([])
    rescanLibraryFiles.mockReturnValue(new Promise((resolve) => {
      resolveRescan = resolve
    }))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <MaintenanceHarness
          updateUserState={updateUserState}
          showMaintenanceStatus={showMaintenanceStatus}
        />
      )
    })
    let rescanPromise
    act(() => {
      rescanPromise = currentOperations.handleRescanLibrary()
    })

    act(() => {
      root.unmount()
    })
    root = null

    await act(async () => {
      resolveRescan({ missing: 0, duplicate: 0 })
      await rescanPromise
    })

    expect(updateUserState).not.toHaveBeenCalled()
    expect(showMaintenanceStatus).toHaveBeenCalledWith('Rescanning files...', 0)
    expect(showMaintenanceStatus).not.toHaveBeenCalledWith(
      'Rescan complete. Missing 0 · Duplicates 0',
      5000
    )
  })
})
