import { useEffect, useRef, useState } from 'react'
import { isTauri } from '../../utils/tauri'
import {
  addIntegrityCheck,
  rebuildSearchIndex,
  listIntegrityChecks,
  rescanLibraryFiles,
  runIntegrityCheck,
} from '../../data/libraryDb'
import { generateId } from '../../utils/storage'

export function useTauriMaintenanceOperations({
  libraryPath,
  libraryReady,
  flushLibraryState,
  refreshLibraryState,
  updateUserState,
  showMaintenanceStatus,
}) {
  const [rescanBusy, setRescanBusy] = useState(false)
  const [integrityStatus, setIntegrityStatus] = useState(null)
  const [doctorBusy, setDoctorBusy] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    let cancelled = false
    const loadChecks = async () => {
      try {
        const checks = await listIntegrityChecks(libraryPath)
        if (cancelled || !checks?.length) return
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
        if (mountedRef.current) {
          setIntegrityStatus({
            status: latest.status,
            details: summary,
          })
        }
      } catch (error) {
        if (cancelled) return
        const detail = error?.message ? ` ${error.message}` : ''
        showMaintenanceStatus?.(`Unable to load integrity checks.${detail}`, 6000)
      }
    }
    loadChecks()
    return () => {
      cancelled = true
    }
  }, [libraryPath, libraryReady, showMaintenanceStatus])

  const handleRescanLibrary = async () => {
    if (!isTauri() || !libraryPath || rescanBusy) return
    setRescanBusy(true)
    showMaintenanceStatus('Rescanning files...', 0)
    try {
      await flushLibraryState()
      const result = await rescanLibraryFiles(libraryPath)
      await refreshLibraryState()
      if (mountedRef.current) {
        updateUserState({ lastRescanAt: new Date().toISOString() })
        if (result) {
          const detail = `Missing ${result.missing} · Duplicates ${result.duplicate}`
          showMaintenanceStatus(`Rescan complete. ${detail}`, 5000)
        } else {
          showMaintenanceStatus('Rescan complete.', 3000)
        }
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (mountedRef.current) {
        showMaintenanceStatus(`Rescan failed.${detail}`, 6000)
      }
    } finally {
      if (mountedRef.current) {
        setRescanBusy(false)
      }
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
      if (mountedRef.current) {
        setIntegrityStatus({ status, details: summary })
        showMaintenanceStatus(`Doctor complete. ${summary}`, 5000)
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (mountedRef.current) {
        showMaintenanceStatus(`Doctor failed.${detail}`, 6000)
      }
    } finally {
      if (mountedRef.current) {
        setDoctorBusy(false)
      }
    }
  }

  const handleRebuildIndex = async () => {
    if (!isTauri() || !libraryPath) return
    showMaintenanceStatus('Rebuilding search index...', 0)
    try {
      await rebuildSearchIndex(libraryPath)
      if (mountedRef.current) {
        showMaintenanceStatus('Search index rebuilt.', 4000)
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      if (mountedRef.current) {
        showMaintenanceStatus(`Index rebuild failed.${detail}`, 6000)
      }
    }
  }

  return {
    rescanBusy,
    integrityStatus,
    doctorBusy,
    handleRescanLibrary,
    handleRunDoctor,
    handleRebuildIndex,
  }
}
