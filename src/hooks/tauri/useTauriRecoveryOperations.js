import { useCallback, useEffect, useRef, useState } from 'react'
import { join, normalize } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/tauri'
import { isTauri } from '../../utils/tauri'
import { openDialog, saveDialog } from '../../utils/tauriDialog'
import { addSnapshotRecord, closeLibraryDb, listSnapshots } from '../../data/libraryDb'
import {
  ensureLibraryFolders,
  setStoredLibraryPath,
} from '../../utils/libraryVault'
import { generateId } from '../../utils/storage'

async function normalizePathForComparison(path) {
  if (!path) return ''
  let normalized = String(path)
  if (normalized.startsWith('file://')) {
    normalized = decodeURIComponent(normalized.replace('file://', ''))
  }
  normalized = await normalize(normalized)
  return String(normalized).replace(/[\\/]+$/, '')
}

async function pathsReferToSameLocation(firstPath, secondPath) {
  const [first, second] = await Promise.all([
    normalizePathForComparison(firstPath),
    normalizePathForComparison(secondPath),
  ])
  if (!first || !second) return false
  if (first === second) return true
  try {
    return Boolean(await invoke('paths_refer_to_same_location', {
      firstPath: first,
      secondPath: second,
    }))
  } catch {
    return false
  }
}

export function useTauriRecoveryOperations({
  libraryPath,
  setLibraryPath,
  libraryReady,
  userData,
  flushLibraryState,
  updateUserState,
  showMaintenanceStatus,
}) {
  const [backupBusy, setBackupBusy] = useState(false)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [snapshots, setSnapshots] = useState([])
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    let cancelled = false
    const loadSnapshots = async () => {
      try {
        const list = await listSnapshots(libraryPath)
        if (!cancelled) setSnapshots(list || [])
      } catch (error) {
        if (cancelled) return
        const detail = error?.message ? ` ${error.message}` : ''
        setSnapshots([])
        showMaintenanceStatus?.(`Unable to load snapshots.${detail}`, 6000)
      }
    }
    loadSnapshots()
    return () => {
      cancelled = true
    }
  }, [libraryPath, libraryReady, showMaintenanceStatus])

  const handleCreateSnapshot = useCallback(async (note = 'Library Snapshot', options = {}) => {
    if (!isTauri() || !libraryPath || snapshotBusy) return
    const { silent = false } = options
    const snapshotNote = typeof note === 'string' && note.trim() ? note : 'Library Snapshot'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `snapshot-${timestamp}.zip`
    setSnapshotBusy(true)
    if (!silent) showMaintenanceStatus('Creating snapshot...', 0)
    try {
      await ensureLibraryFolders(libraryPath)
      const outputPath = await join(libraryPath, 'snapshots', fileName)
      await flushLibraryState()
      await closeLibraryDb(libraryPath)
      await invoke('export_backup', { libraryPath, outputPath })
      const record = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        note: snapshotNote,
        path: outputPath,
      }
      await addSnapshotRecord(libraryPath, record)
      const list = await listSnapshots(libraryPath)
      if (mountedRef.current) {
        setSnapshots(list)
        updateUserState({ lastSnapshotAt: record.createdAt })
        if (!silent) showMaintenanceStatus('Snapshot saved.', 4000)
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (mountedRef.current && !silent) showMaintenanceStatus(`Snapshot failed.${detail}`, 6000)
    } finally {
      if (mountedRef.current) {
        setSnapshotBusy(false)
      }
    }
  }, [
    flushLibraryState,
    libraryPath,
    showMaintenanceStatus,
    snapshotBusy,
    updateUserState,
  ])

  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    const intervalHours = Number(userData.autoSnapshotIntervalHours ?? 0)
    if (!intervalHours || intervalHours <= 0) return
    const intervalMs = intervalHours * 60 * 60 * 1000
    const checkAndRun = () => {
      if (snapshotBusy) return
      const last = userData.lastSnapshotAt ? new Date(userData.lastSnapshotAt).getTime() : 0
      if (!last || Date.now() - last >= intervalMs) {
        handleCreateSnapshot('Auto Snapshot', { silent: true })
      }
    }
    checkAndRun()
    const timer = setInterval(checkAndRun, Math.min(intervalMs, 60 * 60 * 1000))
    return () => clearInterval(timer)
  }, [
    handleCreateSnapshot,
    libraryPath,
    libraryReady,
    snapshotBusy,
    userData.autoSnapshotIntervalHours,
    userData.lastSnapshotAt,
  ])

  const handleExportBackup = async () => {
    if (!isTauri() || !libraryPath || backupBusy) return
    setBackupBusy(true)
    try {
      const defaultName = `virtual-library-backup-${new Date().toISOString().slice(0, 10)}.zip`
      const defaultPath = await join(libraryPath, defaultName)
      const outputPath = await saveDialog({
        defaultPath,
        filters: [{ name: 'Library Backup', extensions: ['zip'] }],
      })
      if (!outputPath) return
      showMaintenanceStatus('Creating backup...', 0)
      await flushLibraryState()
      await closeLibraryDb(libraryPath)
      await invoke('export_backup', { libraryPath, outputPath })
      if (mountedRef.current) {
        showMaintenanceStatus('Backup created.', 4000)
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (mountedRef.current) {
        showMaintenanceStatus(`Backup failed.${detail}`, 6000)
      }
    } finally {
      if (mountedRef.current) {
        setBackupBusy(false)
      }
    }
  }

  const handleRestoreBackup = async () => {
    if (!isTauri() || restoreBusy) return
    setRestoreBusy(true)
    try {
      const selection = await openDialog({
        multiple: false,
        filters: [{ name: 'Library Backup', extensions: ['zip'] }],
      })
      if (!selection || Array.isArray(selection)) return
      const targetSelection = await openDialog({ directory: true, multiple: false })
      if (!targetSelection || Array.isArray(targetSelection)) return
      showMaintenanceStatus('Restoring backup...', 0)
      if (await pathsReferToSameLocation(targetSelection, libraryPath)) {
        await flushLibraryState()
        await closeLibraryDb(libraryPath)
      }
      await invoke('restore_backup', { backupPath: selection, targetPath: targetSelection })
      setStoredLibraryPath(targetSelection)
      setLibraryPath(targetSelection)
      await ensureLibraryFolders(targetSelection)
      if (mountedRef.current) {
        showMaintenanceStatus('Backup restored. Reloading...', 0)
        setTimeout(() => window.location.reload(), 600)
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (mountedRef.current) {
        showMaintenanceStatus(`Restore failed.${detail}`, 8000)
      }
    } finally {
      if (mountedRef.current) {
        setRestoreBusy(false)
      }
    }
  }

  const handleRestoreSnapshot = async (snapshot) => {
    if (!isTauri() || !libraryPath || restoreBusy) return
    if (!snapshot?.snapshot_path) return
    setRestoreBusy(true)
    showMaintenanceStatus('Restoring snapshot...', 0)
    try {
      await flushLibraryState()
      await closeLibraryDb(libraryPath)
      await invoke('restore_backup', { backupPath: snapshot.snapshot_path, targetPath: libraryPath })
      await ensureLibraryFolders(libraryPath)
      if (mountedRef.current) {
        showMaintenanceStatus('Snapshot restored. Reloading...', 0)
        setTimeout(() => window.location.reload(), 600)
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (mountedRef.current) {
        showMaintenanceStatus(`Restore failed.${detail}`, 8000)
      }
    } finally {
      if (mountedRef.current) {
        setRestoreBusy(false)
      }
    }
  }

  return {
    backupBusy,
    restoreBusy,
    snapshots,
    snapshotBusy,
    handleExportBackup,
    handleRestoreBackup,
    handleCreateSnapshot,
    handleRestoreSnapshot,
  }
}
