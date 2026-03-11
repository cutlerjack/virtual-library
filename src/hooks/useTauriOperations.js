import { useState, useEffect, useRef } from 'react'
import { open, save } from '@tauri-apps/api/dialog'
import { readBinaryFile, readDir } from '@tauri-apps/api/fs'
import { join } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/tauri'
import { isTauri } from '../utils/tauri'
import { inferDocType, inferMime, normalizeDocTitle } from '../utils/documentUtils'
import { generatePdfThumbnail } from '../utils/pdfThumbnail'
import { generateId } from '../utils/storage'
import { createBookItemFromBook, createDocumentItemFromDoc } from '../data/libraryAdapters'
import {
  rescanLibraryFiles,
  enqueueIngestJobUnique,
  listSnapshots,
  addSnapshotRecord,
  listIntegrityChecks,
  addIntegrityCheck,
  runIntegrityCheck,
  rebuildSearchIndex,
} from '../data/libraryDb'
import {
  importLibraryFiles,
  findLatestExportFile,
  loadExportPayload,
  migrateExportToLibraryState,
  ensureLibraryFolders,
  setStoredLibraryPath,
} from '../utils/libraryVault'

export function useTauriOperations({
  libraryPath,
  setLibraryPath,
  libraryReady,
  libraryDirty,
  books,
  documents,
  shelves,
  userData,
  updateLibraryState,
  updateUserState,
  refreshLibraryState,
  flushLibraryState,
  setVaultError,
  actions,
  ingestBusy,
}) {
  const [migrationStatus, setMigrationStatus] = useState('idle')
  const [maintenanceStatus, setMaintenanceStatus] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [rescanBusy, setRescanBusy] = useState(false)
  const [snapshots, setSnapshots] = useState([])
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [integrityStatus, setIntegrityStatus] = useState(null)
  const [doctorBusy, setDoctorBusy] = useState(false)

  const thumbnailJobs = useRef(new Set())
  const didInitialRescan = useRef(false)
  const maintenanceTimer = useRef(null)
  const fileWatchRef = useRef(null)
  const didMigrateRatings = useRef(false)

  const showMaintenanceStatus = (message, timeout = 4000) => {
    if (maintenanceTimer.current) {
      clearTimeout(maintenanceTimer.current)
    }
    setMaintenanceStatus(message)
    if (timeout) {
      maintenanceTimer.current = setTimeout(() => {
        setMaintenanceStatus('')
        maintenanceTimer.current = null
      }, timeout)
    }
  }

  // Initial rescan on startup
  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    if (didInitialRescan.current) return
    didInitialRescan.current = true
    rescanLibraryFiles(libraryPath)
      .then(async () => {
        await refreshLibraryState()
        updateUserState({ lastRescanAt: new Date().toISOString() })
      })
      .catch((err) => console.warn('[rescan] Initial rescan failed:', err?.message || err))
  }, [libraryPath, libraryReady, refreshLibraryState, updateUserState])

  // File scanner / watcher
  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    const scanFolders = async () => {
      const knownPaths = new Set(documents.map((doc) => doc.filePath))
      const addFileEntries = async (folder) => {
        const folderPath = await join(libraryPath, folder)
        const entries = await readDir(folderPath, { recursive: false })
        for (const entry of entries) {
          if (!entry.name || entry.children) continue
          if (knownPaths.has(entry.path)) continue
          const type = inferDocType(entry.name)
          if (type === 'file') continue
          const newDoc = {
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: normalizeDocTitle(entry.name),
            originalName: entry.name,
            fileName: entry.name,
            filePath: entry.path,
            type,
            mime: inferMime(entry.name),
            ingestSource: 'watcher',
            addedAt: new Date().toISOString(),
            fileStatus: 'ok',
          }
          updateLibraryState((prev) => ({
            ...prev,
            items: [createDocumentItemFromDoc(newDoc), ...prev.items],
          }))
          enqueueIngestJobUnique(libraryPath, {
            itemId: newDoc.id,
            sourcePath: entry.path,
            targetPath: entry.path,
          })
        }
      }
      await addFileEntries('library').catch((err) => console.warn('[watcher] Scan library/ failed:', err?.message || err))
      await addFileEntries('articles').catch((err) => console.warn('[watcher] Scan articles/ failed:', err?.message || err))
    }
    scanFolders().catch((err) => console.warn('[watcher] Initial scan failed:', err?.message || err))
    fileWatchRef.current = setInterval(scanFolders, 60000)
    return () => {
      if (fileWatchRef.current) clearInterval(fileWatchRef.current)
    }
  }, [documents, libraryPath, libraryReady, updateLibraryState])

  // Load snapshots
  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    const loadSnapshots = async () => {
      const list = await listSnapshots(libraryPath)
      setSnapshots(list)
    }
    loadSnapshots()
  }, [libraryPath, libraryReady])

  // Load integrity checks
  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    const loadChecks = async () => {
      const checks = await listIntegrityChecks(libraryPath)
      if (checks.length > 0) {
        const latest = checks[0]
        let parsed = null
        try {
          parsed = latest.details_json ? JSON.parse(latest.details_json) : null
        } catch {
          parsed = null
        }
        const summary = parsed?.summary
          || (Array.isArray(parsed?.rows)
            ? parsed.rows.map((row) => row.integrity_check).filter(Boolean).join(' · ')
            : (typeof parsed === 'string' ? parsed : null))
        setIntegrityStatus({
          status: latest.status,
          details: summary,
        })
      }
    }
    loadChecks()
  }, [libraryPath, libraryReady])

  // Auto-migration from export file
  useEffect(() => {
    if (!isTauri()) return
    if (!libraryPath) return
    if (migrationStatus !== 'idle') return
    if (books.length > 0) {
      setMigrationStatus('skipped')
      return
    }
    const storedFlag = localStorage.getItem('virtual-library-migration-v1')
    if (storedFlag) {
      setMigrationStatus(storedFlag)
      return
    }
    const runMigration = async () => {
      setMigrationStatus('searching')
      const latest = await findLatestExportFile(libraryPath)
      if (!latest?.path) {
        localStorage.setItem('virtual-library-migration-v1', 'no-file')
        setMigrationStatus('no-file')
        return
      }
      const payload = await loadExportPayload(latest.path)
      if (!payload) {
        localStorage.setItem('virtual-library-migration-v1', 'failed')
        setMigrationStatus('failed')
        return
      }
      const { books: migratedBooks, shelves: migratedShelves } = migrateExportToLibraryState(payload, shelves, books)
      updateLibraryState((prev) => ({
        ...prev,
        items: [
          ...prev.items.filter((item) => item.kind !== 'book'),
          ...migratedBooks.map(createBookItemFromBook),
        ],
        shelves: migratedShelves,
        user: { ...prev.user, ratingScale: 10 },
      }))
      localStorage.setItem('virtual-library-migration-v1', 'done')
      setMigrationStatus('done')
    }
    runMigration()
  }, [libraryPath, books.length, shelves, migrationStatus])

  // PDF thumbnail generation
  useEffect(() => {
    if (!isTauri() || !libraryPath || documents.length === 0) return
    let cancelled = false
    const targets = documents.filter((doc) => (
      doc.type === 'pdf' && !doc.thumbnail && !thumbnailJobs.current.has(doc.id)
    ))
    if (targets.length === 0) return
    const run = async () => {
      for (const doc of targets) {
        if (cancelled) return
        thumbnailJobs.current.add(doc.id)
        try {
          const data = await readBinaryFile(doc.filePath)
          const thumb = await generatePdfThumbnail(data, 220)
          if (!cancelled) {
            await actions.updateDocumentMeta(doc.id, { thumbnail: thumb })
          }
        } catch (err) {
          console.warn(`[thumbnails] Failed for ${doc.title}:`, err?.message || err)
        } finally {
          thumbnailJobs.current.delete(doc.id)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [documents, libraryPath])

  // Auto-flush dirty state
  useEffect(() => {
    if (!libraryReady || !libraryDirty || ingestBusy) return
    const timer = setTimeout(() => {
      flushLibraryState().catch((err) => console.warn('[flush] Auto-flush failed:', err?.message || err))
    }, 5000)
    return () => clearTimeout(timer)
  }, [libraryReady, libraryDirty, flushLibraryState, ingestBusy])

  // Rating migration (5→10 point scale)
  useEffect(() => {
    if (userData.ratingScale === 10 || userData.ratingMigrated || didMigrateRatings.current) return
    didMigrateRatings.current = true
    updateLibraryState((prev) => {
      const hasTenPointRatings = prev.items
        .filter((item) => item.kind === 'book')
        .some((item) => (item.rating || 0) > 5)
      if (hasTenPointRatings) {
        return {
          ...prev,
          user: { ...prev.user, ratingScale: 10, ratingMigrated: true },
        }
      }
      const items = prev.items.map((item) => {
        if (item.kind !== 'book') return item
        const rating = item.rating || 0
        return rating > 0 ? { ...item, rating: rating * 2 } : item
      })
      return {
        ...prev,
        items,
        user: { ...prev.user, ratingScale: 10, ratingMigrated: true },
      }
    })
  }, [userData.ratingScale, userData.ratingMigrated])

  // Auto-snapshot timer
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
  }, [libraryPath, libraryReady, userData.autoSnapshotIntervalHours, userData.lastSnapshotAt, snapshotBusy])

  const handleImportDocuments = async () => {
    if (!isTauri() || !libraryPath) return
    setVaultError('')
    try {
      const newDocs = await importLibraryFiles(libraryPath)
      if (newDocs.length === 0) return
      updateLibraryState((prev) => ({
        ...prev,
        items: [
          ...newDocs.map(createDocumentItemFromDoc),
          ...prev.items,
        ],
      }))
    } catch (error) {
      console.error('Import failed:', error)
      const detail = error?.message ? error.message : JSON.stringify(error)
      setVaultError(`Import failed. ${detail || ''}`.trim())
    }
  }

  const handleRescanLibrary = async () => {
    if (!isTauri() || !libraryPath || rescanBusy) return
    setRescanBusy(true)
    showMaintenanceStatus('Rescanning files...', 0)
    try {
      await flushLibraryState()
      const result = await rescanLibraryFiles(libraryPath)
      await refreshLibraryState()
      updateUserState({ lastRescanAt: new Date().toISOString() })
      if (result) {
        const detail = `Missing ${result.missing} · Duplicates ${result.duplicate}`
        showMaintenanceStatus(`Rescan complete. ${detail}`, 5000)
      } else {
        showMaintenanceStatus('Rescan complete.', 3000)
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      showMaintenanceStatus(`Rescan failed.${detail}`, 6000)
    } finally {
      setRescanBusy(false)
    }
  }

  const handleExportBackup = async () => {
    if (!isTauri() || !libraryPath || backupBusy) return
    const defaultName = `virtual-library-backup-${new Date().toISOString().slice(0, 10)}.zip`
    const defaultPath = await join(libraryPath, defaultName)
    const outputPath = await save({
      defaultPath,
      filters: [{ name: 'Library Backup', extensions: ['zip'] }],
    })
    if (!outputPath) return
    setBackupBusy(true)
    showMaintenanceStatus('Creating backup...', 0)
    try {
      await flushLibraryState()
      await invoke('export_backup', { libraryPath, outputPath })
      showMaintenanceStatus('Backup created.', 4000)
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      showMaintenanceStatus(`Backup failed.${detail}`, 6000)
    } finally {
      setBackupBusy(false)
    }
  }

  const handleRestoreBackup = async () => {
    if (!isTauri() || restoreBusy) return
    const selection = await open({
      multiple: false,
      filters: [{ name: 'Library Backup', extensions: ['zip'] }],
    })
    if (!selection || Array.isArray(selection)) return
    const targetSelection = await open({ directory: true, multiple: false })
    if (!targetSelection || Array.isArray(targetSelection)) return
    setRestoreBusy(true)
    showMaintenanceStatus('Restoring backup...', 0)
    try {
      await invoke('restore_backup', { backupPath: selection, targetPath: targetSelection })
      setStoredLibraryPath(targetSelection)
      setLibraryPath(targetSelection)
      await ensureLibraryFolders(targetSelection)
      showMaintenanceStatus('Backup restored. Reloading...', 0)
      setTimeout(() => window.location.reload(), 600)
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      showMaintenanceStatus(`Restore failed.${detail}`, 8000)
    } finally {
      setRestoreBusy(false)
    }
  }

  const handleMigrateExportFile = async () => {
    if (!isTauri()) return
    const selection = await open({
      multiple: false,
      filters: [{ name: 'Library Export', extensions: ['json'] }],
    })
    if (!selection || Array.isArray(selection)) return
    const payload = await loadExportPayload(selection)
    if (!payload) return
    const { books: migratedBooks, shelves: migratedShelves } = migrateExportToLibraryState(payload, shelves, books)
    updateLibraryState((prev) => ({
      ...prev,
      items: [
        ...prev.items.filter((item) => item.kind !== 'book'),
        ...migratedBooks.map(createBookItemFromBook),
      ],
      shelves: migratedShelves,
      user: { ...prev.user, ratingScale: 10 },
    }))
    localStorage.setItem('virtual-library-migration-v1', 'done')
    setMigrationStatus('done')
  }

  const handleCreateSnapshot = async (note = 'Library Snapshot', options = {}) => {
    if (!isTauri() || !libraryPath || snapshotBusy) return
    const { silent = false } = options
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `snapshot-${timestamp}.zip`
    await ensureLibraryFolders(libraryPath)
    const outputPath = await join(libraryPath, 'snapshots', fileName)
    setSnapshotBusy(true)
    if (!silent) showMaintenanceStatus('Creating snapshot...', 0)
    try {
      await flushLibraryState()
      await invoke('export_backup', { libraryPath, outputPath })
      const record = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        note,
        path: outputPath,
      }
      await addSnapshotRecord(libraryPath, record)
      const list = await listSnapshots(libraryPath)
      setSnapshots(list)
      updateUserState({ lastSnapshotAt: record.createdAt })
      if (!silent) showMaintenanceStatus('Snapshot saved.', 4000)
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (!silent) showMaintenanceStatus(`Snapshot failed.${detail}`, 6000)
    } finally {
      setSnapshotBusy(false)
    }
  }

  const handleRestoreSnapshot = async (snapshot) => {
    if (!isTauri() || !libraryPath || restoreBusy) return
    if (!snapshot?.snapshot_path) return
    const confirmed = window.confirm('Restore this snapshot? Current data will be overwritten.')
    if (!confirmed) return
    setRestoreBusy(true)
    showMaintenanceStatus('Restoring snapshot...', 0)
    try {
      await flushLibraryState()
      await invoke('restore_backup', { backupPath: snapshot.snapshot_path, targetPath: libraryPath })
      await ensureLibraryFolders(libraryPath)
      showMaintenanceStatus('Snapshot restored. Reloading...', 0)
      setTimeout(() => window.location.reload(), 600)
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      showMaintenanceStatus(`Restore failed.${detail}`, 8000)
    } finally {
      setRestoreBusy(false)
    }
  }

  const handleRunDoctor = async () => {
    if (!isTauri() || !libraryPath || doctorBusy) return
    setDoctorBusy(true)
    showMaintenanceStatus('Running library doctor...', 0)
    try {
      const result = await runIntegrityCheck(libraryPath)
      const status = result?.status || 'error'
      const messages = Array.isArray(result?.details)
        ? result.details.map((row) => row.integrity_check).filter(Boolean)
        : []
      const summary = status === 'ok' ? 'No issues found.' : (messages.join(' · ') || 'Issues detected.')
      const record = {
        id: generateId(),
        type: 'db',
        status,
        details: { summary, rows: result?.details || [] },
        createdAt: new Date().toISOString(),
      }
      await addIntegrityCheck(libraryPath, record)
      setIntegrityStatus({ status, details: summary })
      showMaintenanceStatus(`Doctor complete. ${summary}`, 5000)
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      showMaintenanceStatus(`Doctor failed.${detail}`, 6000)
    } finally {
      setDoctorBusy(false)
    }
  }

  const handleRebuildIndex = async () => {
    if (!isTauri() || !libraryPath) return
    showMaintenanceStatus('Rebuilding search index...', 0)
    try {
      await rebuildSearchIndex(libraryPath)
      showMaintenanceStatus('Search index rebuilt.', 4000)
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      showMaintenanceStatus(`Index rebuild failed.${detail}`, 6000)
    }
  }

  return {
    maintenanceStatus,
    backupBusy,
    restoreBusy,
    rescanBusy,
    snapshots,
    snapshotBusy,
    integrityStatus,
    doctorBusy,
    handleImportDocuments,
    handleRescanLibrary,
    handleExportBackup,
    handleRestoreBackup,
    handleMigrateExportFile,
    handleCreateSnapshot,
    handleRestoreSnapshot,
    handleRunDoctor,
    handleRebuildIndex,
  }
}
