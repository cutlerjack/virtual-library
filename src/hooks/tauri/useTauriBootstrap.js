import { useEffect, useRef } from 'react'
import { readBinaryFile, readDir } from '@tauri-apps/api/fs'
import { join } from '@tauri-apps/api/path'
import { isTauri } from '../../utils/tauri'
import { inferDocType, inferMime, normalizeDocTitle } from '../../utils/documentUtils'
import { generatePdfThumbnail } from '../../utils/pdfThumbnail'
import { enqueueIngestJobUnique, rescanLibraryFiles } from '../../data/libraryDb'
import { applyAutomaticBookLinks } from './documentLinking'

function makeDiscoveredDocument(entry) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: normalizeDocTitle(entry.name),
    originalName: entry.name,
    fileName: entry.name,
    filePath: entry.path,
    type: inferDocType(entry.name),
    mime: inferMime(entry.name),
    ingestSource: 'watcher',
    addedAt: new Date().toISOString(),
    fileStatus: 'ok',
  }
}

export function useTauriBootstrap({
  libraryPath,
  libraryReady,
  ingestBusy,
  books,
  documents,
  userData,
  updateBookItem,
  insertDocumentItem,
  updateUserState,
  refreshLibraryState,
  actions,
}) {
  const thumbnailJobs = useRef(new Set())
  const completedInitialRescanPaths = useRef(new Set())
  const didMigrateRatings = useRef(false)

  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    if (completedInitialRescanPaths.current.has(libraryPath)) return
    rescanLibraryFiles(libraryPath)
      .then(async () => {
        await refreshLibraryState()
        updateUserState({ lastRescanAt: new Date().toISOString() })
        completedInitialRescanPaths.current.add(libraryPath)
      })
      .catch((err) => console.warn('[rescan] Initial rescan failed:', err?.message || err))
  }, [libraryPath, libraryReady, refreshLibraryState, updateUserState])

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
          const newDoc = makeDiscoveredDocument(entry)
          if (newDoc.type === 'file') continue
          const { docs: preparedDocs } = applyAutomaticBookLinks([newDoc], books)
          const preparedDoc = preparedDocs[0]
          insertDocumentItem(preparedDoc)
          try {
            await enqueueIngestJobUnique(libraryPath, {
              itemId: preparedDoc.id,
              sourcePath: entry.path,
              targetPath: entry.path,
            })
          } catch (err) {
            console.warn('[watcher] Enqueue ingest failed:', err?.message || err)
          }
        }
      }
      await addFileEntries('library').catch((err) => console.warn('[watcher] Scan library/ failed:', err?.message || err))
      await addFileEntries('articles').catch((err) => console.warn('[watcher] Scan articles/ failed:', err?.message || err))
    }
    scanFolders().catch((err) => console.warn('[watcher] Initial scan failed:', err?.message || err))
    const scanTimer = setInterval(() => {
      scanFolders().catch((err) => console.warn('[watcher] Periodic scan failed:', err?.message || err))
    }, 60000)
    return () => {
      clearInterval(scanTimer)
    }
  }, [books, documents, insertDocumentItem, libraryPath, libraryReady])

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
  }, [actions, documents, libraryPath])

  useEffect(() => {
    if (userData.ratingScale === 10 || userData.ratingMigrated || didMigrateRatings.current) return
    didMigrateRatings.current = true
    const hasTenPointRatings = books.some((book) => (book.rating || 0) > 5)
    if (!hasTenPointRatings) {
      books.forEach((book) => {
        const rating = book.rating || 0
        if (rating > 0) {
          updateBookItem(book.id, { rating: rating * 2 })
        }
      })
    }
    updateUserState({
      ratingScale: 10,
      ratingMigrated: true,
    })
  }, [books, updateBookItem, updateUserState, userData.ratingMigrated, userData.ratingScale])
}
