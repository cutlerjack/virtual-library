import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  enqueueIngestJobUnique,
  listIngestJobsPaged,
  claimNextIngestJob,
  pruneIngestJobs,
  updateIngestJob,
  saveTextChunks,
  saveOcrPages,
  updateSearchDoc,
} from '../data/libraryDb'
import { processIngestJob } from '../utils/ingestPipeline'

export function useIngestionController({
  libraryPath,
  libraryReady,
  documents,
  ingestRetentionDays = 14,
  updateDocumentMeta,
}) {
  const [ingestJobs, setIngestJobs] = useState([])
  const [ingestBusy, setIngestBusy] = useState(false)
  const ingestWorkerRef = useRef(false)
  const pollTimerRef = useRef(null)
  const rerunTimerRef = useRef(null)
  const updateDocumentMetaRef = useRef(updateDocumentMeta)

  useEffect(() => {
    updateDocumentMetaRef.current = updateDocumentMeta
  }, [updateDocumentMeta])

  const loadJobs = useCallback(async () => {
    if (!libraryPath || !libraryReady) return
    const page = await listIngestJobsPaged(libraryPath, {
      statusSet: ['queued', 'processing', 'failed', 'orphaned'],
      limit: 500,
    })
    setIngestJobs(page.rows || [])
  }, [libraryPath, libraryReady])

  useEffect(() => {
    if (!libraryPath || !libraryReady) return
    let cancelled = false
    const retentionDays = Math.max(1, Number(ingestRetentionDays) || 14)

    const tick = async () => {
      if (cancelled) return
      await loadJobs()
    }
    const prune = async () => {
      if (cancelled) return
      await pruneIngestJobs(libraryPath, { retentionDays, maxRows: 10000 })
    }

    tick().catch((err) => console.warn('[ingest] Tick failed:', err?.message || err))
    prune().catch((err) => console.warn('[ingest] Prune failed:', err?.message || err))
    pollTimerRef.current = setInterval(tick, 4000)
    const pruneTimer = setInterval(prune, 5 * 60 * 1000)

    return () => {
      cancelled = true
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      clearInterval(pruneTimer)
    }
  }, [libraryPath, libraryReady, ingestRetentionDays, loadJobs])

  useEffect(() => {
    if (!libraryPath || !libraryReady) return
    const existing = new Set(ingestJobs.map((job) => job.item_id).filter(Boolean))
    documents.forEach((doc) => {
      if (!doc?.id || !doc?.filePath) return
      if (doc.fileStatus === 'missing') return
      if (typeof doc.searchText === 'string') return
      if (existing.has(doc.id)) return
      enqueueIngestJobUnique(libraryPath, {
        itemId: doc.id,
        sourcePath: doc.filePath,
        targetPath: doc.filePath,
      }).catch((err) => console.warn('[ingest] Enqueue failed:', err?.message || err))
    })
  }, [documents, ingestJobs, libraryPath, libraryReady])

  useEffect(() => {
    if (!libraryPath || !libraryReady) return
    let cancelled = false

    const runQueue = async () => {
      if (ingestWorkerRef.current) return
      ingestWorkerRef.current = true
      setIngestBusy(true)
      try {
        while (!cancelled) {
          const claimed = await claimNextIngestJob(libraryPath)
          if (!claimed) break
          const job = claimed
          const doc = claimed.doc

          if (!doc?.id || !doc?.filePath) {
            await updateIngestJob(libraryPath, job.id, {
              status: 'orphaned',
              error: 'Missing item.',
              lastErrorCode: 'missing_item',
            })
            continue
          }

          try {
            await processIngestJob({
              job,
              doc,
              updateJob: (id, updates) => updateIngestJob(libraryPath, id, updates),
              updateDoc: (id, updates) => updateDocumentMetaRef.current?.(id, updates),
              saveChunks: (id, chunks, source) => saveTextChunks(libraryPath, { itemId: id, chunks, source }),
              saveOcrPages: (id, pages) => saveOcrPages(libraryPath, { itemId: id, pages }),
              updateSearchDoc: (id, kind, title, body) => updateSearchDoc(libraryPath, {
                itemId: id,
                kind,
                title,
                body,
                updatedAt: new Date().toISOString(),
              }),
            })
          } catch (error) {
            await updateIngestJob(libraryPath, job.id, {
              status: 'failed',
              error: error?.message || 'Ingest failed',
              lastErrorCode: 'ingest_failed',
            })
          }
        }
      } catch (error) {
        console.error('Ingestion worker failed', error)
      } finally {
        setIngestBusy(false)
        ingestWorkerRef.current = false
      }
      if (!cancelled) {
        if (rerunTimerRef.current) clearTimeout(rerunTimerRef.current)
        rerunTimerRef.current = setTimeout(runQueue, 500)
      }
    }

    runQueue()
    const interval = setInterval(runQueue, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
      if (rerunTimerRef.current) {
        clearTimeout(rerunTimerRef.current)
        rerunTimerRef.current = null
      }
    }
  }, [libraryPath, libraryReady])

  const visibleIngestJobs = useMemo(() => {
    const filtered = ingestJobs.filter((job) => ['queued', 'processing', 'failed', 'orphaned'].includes(job.status))
    const byKey = new Map()
    filtered.forEach((job) => {
      const key = job.item_id || job.target_path || job.id
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, job)
        return
      }
      const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime()
      const jobTime = new Date(job.updated_at || job.created_at || 0).getTime()
      if (jobTime > existingTime) {
        byKey.set(key, job)
      }
    })
    return Array.from(byKey.values()).sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime()
      const bTime = new Date(b.created_at || 0).getTime()
      return bTime - aTime
    })
  }, [ingestJobs])

  const retryIngest = useCallback(async (job) => {
    if (!libraryPath || !job?.id) return
    await updateIngestJob(libraryPath, job.id, {
      status: 'queued',
      progress: 0,
      error: null,
      lastErrorCode: null,
    })
    await loadJobs()
  }, [libraryPath, loadJobs])

  const cancelIngest = useCallback(async (job) => {
    if (!libraryPath || !job?.id) return
    await updateIngestJob(libraryPath, job.id, { status: 'cancelled', progress: 0 })
    await loadJobs()
  }, [libraryPath, loadJobs])

  const runAllOcr = useCallback(async () => {
    if (!libraryPath) return
    const activeJobs = new Map(ingestJobs.map((job) => [job.item_id, job]))
    const targets = documents.filter((doc) => (
      doc.type === 'pdf' && doc?.id && doc?.filePath && doc.fileStatus !== 'missing'
    ))
    for (const doc of targets) {
      const existing = activeJobs.get(doc.id)
      if (existing) {
        if (existing.status === 'queued' || existing.status === 'processing') {
          await updateIngestJob(libraryPath, existing.id, { forceOcr: true })
          continue
        }
        await updateIngestJob(libraryPath, existing.id, {
          status: 'queued',
          progress: 0,
          error: null,
          forceOcr: true,
          lastErrorCode: null,
        })
        continue
      }
      await enqueueIngestJobUnique(libraryPath, {
        itemId: doc.id,
        sourcePath: doc.filePath,
        targetPath: doc.filePath,
        forceOcr: true,
      })
    }
    await loadJobs()
  }, [documents, ingestJobs, libraryPath, loadJobs])

  return {
    ingestBusy,
    visibleIngestJobs,
    retryIngest,
    cancelIngest,
    runAllOcr,
  }
}
