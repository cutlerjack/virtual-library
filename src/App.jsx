import { useState, useMemo, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AddBookModal from './components/AddBookModal'
import BookModal from './components/BookModal'
import StatsDashboard from './components/StatsDashboard'
import PreferencesPanel from './components/PreferencesPanel'
const PdfReaderModal = lazy(() => import('./components/PdfReaderModal'))
const EpubReaderModal = lazy(() => import('./components/EpubReaderModal'))
const ArticleReaderModal = lazy(() => import('./components/ArticleReaderModal'))
const BookPage = lazy(() => import('./pages/BookPage'))
import LibraryView from './features/library/LibraryView'
import ReadingRoomView from './features/reading-room/ReadingRoomView'
import { useLibraryStore } from './store/useLibraryStore'
import { createLibraryActions } from './store/libraryActions'
import {
  selectAllTags,
  selectBooksFinishedThisYear,
  selectQuoteCount,
  selectContinueReadingDocs,
  selectFilteredBooks,
  selectSortedBooks,
  selectAllAnnotations,
} from './store/librarySelectors'
import { open, save } from '@tauri-apps/api/dialog'
import { readBinaryFile, readTextFile, readDir } from '@tauri-apps/api/fs'
import { join } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/tauri'
import { isTauri } from './utils/tauri'
import { generatePdfThumbnail } from './utils/pdfThumbnail'
import { generateEpubThumbnail } from './utils/epubThumbnail'
import { captureArticle } from './utils/articleCapture'
import {
  rescanLibraryFiles,
  enqueueIngestJobUnique,
  listSnapshots,
  addSnapshotRecord,
  listIntegrityChecks,
  addIntegrityCheck,
  runIntegrityCheck,
  rebuildSearchIndex,
  startReadingSession,
  endReadingSession,
} from './data/libraryDb'
import { buildEpubLocation } from './reader/readerCore'
import { useSearchController } from './hooks/useSearchController'
import { useIngestionController } from './hooks/useIngestionController'
import {
  generateId,
  updateSpineInLibraryMap,
  removeSpineFromLibraryMap,
  addSpineToLibraryMap,
  normalizeIsbn,
} from './utils/storage'
import {
  createBookItemFromBook,
  createDocumentItemFromDoc,
  mergeBookIntoItem,
} from './data/libraryAdapters'
import {
  importLibraryFiles,
  findLatestExportFile,
  loadExportPayload,
  migrateExportToLibraryState,
  ensureLibraryFolders,
  setStoredLibraryPath,
} from './utils/libraryVault'

const IconsClassic = {
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" />
      <path d="M7 16v-4" />
      <path d="M11 16v-8" />
      <path d="M15 16v-6" />
      <path d="M19 16v-10" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19h16M4 15h16M4 11h16M4 7h16M6 3v4M10 3v4M14 3v4M18 3v4" />
    </svg>
  ),
  ritual: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  view: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  tune: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16M6 12h12M8 18h8" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="14" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  ),
}

const IconsSciFi = {
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 18V6M4 18H20" />
      <path d="M8 14V9M12 16V7M16 12V5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M12 4v16M4 12h16" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M5 5h12a2 2 0 012 2v12H7a2 2 0 01-2-2z" />
      <path d="M7 5v14" />
      <path d="M10 9h7M10 13h7" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 19h16" />
      <path d="M6 5h12v12H6z" />
      <path d="M8 5v12M12 5v12M16 5v12" />
    </svg>
  ),
  view: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M3.5 12c2.5-4 6-6 8.5-6s6 2 8.5 6c-2.5 4-6 6-8.5 6s-6-2-8.5-6Z" />
      <path d="M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5Z" />
    </svg>
  ),
  tune: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <rect x="6" y="5" width="4" height="4" rx="1" />
      <rect x="13" y="10" width="4" height="4" rx="1" />
      <rect x="9" y="15" width="4" height="4" rx="1" />
    </svg>
  ),
  ritual: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
}

function inferDocType(filename) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.epub')) return 'epub'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'article'
  return 'file'
}

function inferMime(filename) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.epub')) return 'application/epub+zip'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html'
  return 'application/octet-stream'
}

function normalizeDocTitle(filename) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

function App() {
  const {
    libraryReady,
    libraryDirty,
    libraryPath,
    setLibraryPath,
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    spineLibraryEntries,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
    refreshLibraryState,
    flushLibraryState,
  } = useLibraryStore()

  const [activeShelf, setActiveShelf] = useState('all')
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [viewMode, setViewMode] = useState('spine')
  const [sortMode, setSortMode] = useState('recent')
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [showDailyRitual, setShowDailyRitual] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const activeView = location.pathname.startsWith('/documents') ? 'documents' : 'library'
  const setActiveView = useCallback((view) => {
    navigate(view === 'documents' ? '/documents' : '/')
  }, [navigate])
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1)
  const didMigrateRatings = useRef(false)
  const [migrationStatus, setMigrationStatus] = useState('idle')
  const [activePdf, setActivePdf] = useState(null)
  const [activeEpub, setActiveEpub] = useState(null)
  const [activeArticle, setActiveArticle] = useState(null)
  const [vaultError, setVaultError] = useState('')
  const [maintenanceStatus, setMaintenanceStatus] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [rescanBusy, setRescanBusy] = useState(false)
  const [snapshots, setSnapshots] = useState([])
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [integrityStatus, setIntegrityStatus] = useState(null)
  const [doctorBusy, setDoctorBusy] = useState(false)
  const thumbnailJobs = useRef(new Set())
  const docUpdateTimers = useRef(new Map())
  const didInitialRescan = useRef(false)
  const maintenanceTimer = useRef(null)
  const fileWatchRef = useRef(null)
  const theme = userData.theme || 'classic'
  const Icons = theme === 'scifi' ? IconsSciFi : IconsClassic
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchOpen,
    setSearchOpen,
    searchStatus,
    searchBusy,
  } = useSearchController({ libraryPath })

  const actions = useMemo(() => createLibraryActions({
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
    docUpdateTimersRef: docUpdateTimers,
  }), [
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
  ])

  const {
    ingestBusy,
    visibleIngestJobs,
    retryIngest: handleRetryIngest,
    cancelIngest: handleCancelIngest,
    runAllOcr: handleRunAllOcr,
  } = useIngestionController({
    libraryPath,
    libraryReady: libraryReady && isTauri(),
    documents,
    ingestRetentionDays: userData.ingestJobRetentionDays,
    updateDocumentMeta: actions.updateDocumentMeta,
  })

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

  const handleExportLibrary = () => {
    const shelfLookup = shelves.reduce((acc, shelf) => {
      acc[shelf.id] = shelf.name
      return acc
    }, {})

    const payload = books.map((book) => ({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      rating: book.rating || 0,
      notes: book.notes || '',
      quotes: book.quotes || [],
      tags: book.tags || [],
      shelves: (book.shelves || []).map((id) => shelfLookup[id] || id),
      pageCount: book.pageCount || null,
      dateStarted: book.dateStarted || null,
      dateFinished: book.dateFinished || null,
      publishedDate: book.publishedDate || null,
      addedAt: book.addedAt || null,
      coverUrl: book.coverUrl || null,
    }))

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `virtual-library-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const allTags = useMemo(() => selectAllTags(books), [books])

  const booksFinishedThisYear = useMemo(() => (
    selectBooksFinishedThisYear(books)
  ), [books])

  const quoteCount = useMemo(() => selectQuoteCount(books), [books])

  const continueReadingDocs = useMemo(() => (
    selectContinueReadingDocs(documents)
  ), [documents])

  const annotations = useMemo(() => (
    selectAllAnnotations(books, documents)
  ), [books, documents])

  const groupedSearchResults = useMemo(() => {
    const buckets = new Map([
      ['book', []],
      ['document', []],
      ['article', []],
      ['other', []],
    ])
    searchResults.forEach((result) => {
      if (!result) return
      const kind = result.kind || 'other'
      if (!buckets.has(kind)) {
        buckets.set(kind, [])
      }
      buckets.get(kind).push(result)
    })
    const labels = {
      book: 'Books',
      document: 'Documents',
      article: 'Articles',
      other: 'Other',
    }
    return Array.from(buckets.entries())
      .filter(([, items]) => items.length > 0)
      .map(([kind, items]) => ({ kind, label: labels[kind] || 'Other', items }))
  }, [searchResults])

  const flatSearchResults = useMemo(
    () => groupedSearchResults.flatMap((group) => group.items),
    [groupedSearchResults]
  )

  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    if (didInitialRescan.current) return
    didInitialRescan.current = true
    rescanLibraryFiles(libraryPath)
      .then(async () => {
        await refreshLibraryState()
        updateUserState({ lastRescanAt: new Date().toISOString() })
      })
      .catch(() => {})
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
      await addFileEntries('library')
      await addFileEntries('articles')
    }
    scanFolders()
    fileWatchRef.current = setInterval(scanFolders, 60000)
    return () => {
      if (fileWatchRef.current) clearInterval(fileWatchRef.current)
    }
  }, [documents, libraryPath, libraryReady, updateLibraryState])

  useEffect(() => {
    if (!isTauri() || !libraryPath || !libraryReady) return
    const loadSnapshots = async () => {
      const list = await listSnapshots(libraryPath)
      setSnapshots(list)
    }
    loadSnapshots()
  }, [libraryPath, libraryReady])

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

  useEffect(() => {
    setSearchActiveIndex(-1)
  }, [searchQuery, searchResults.length, searchOpen])

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
            await updateDocumentMeta(doc.id, { thumbnail: thumb })
          }
        } catch {
          // ignore thumbnail failures
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

  useEffect(() => () => {
    docUpdateTimers.current.forEach((timer) => clearTimeout(timer))
    docUpdateTimers.current.clear()
  }, [])

  useEffect(() => {
    if (!libraryReady || !libraryDirty || ingestBusy) return
    const timer = setTimeout(() => {
      flushLibraryState().catch(() => {})
    }, 5000)
    return () => clearTimeout(timer)
  }, [libraryReady, libraryDirty, flushLibraryState, ingestBusy])

  const filteredBooks = useMemo(() => (
    selectFilteredBooks(books, activeShelf, selectedTags)
  ), [books, activeShelf, selectedTags])

  const sortedBooks = useMemo(() => (
    selectSortedBooks(filteredBooks, sortMode)
  ), [filteredBooks, sortMode])

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

  const handleUpdateSpineLibraryEntry = (isbn, spineImage, crop) => {
    updateLibraryState((prev) => {
      const nextMap = updateSpineInLibraryMap(prev.spineLibrary || {}, { isbn, spineImage, crop })
      const normalized = normalizeIsbn(isbn)
      const items = prev.items.map((item) => {
        if (item.kind !== 'book') return item
        const meta = item.bookMeta || {}
        if (!meta.isbn || normalizeIsbn(meta.isbn) !== normalized) return item
        return {
          ...item,
          bookMeta: {
            ...meta,
            spineImage,
            spineSource: 'photo',
            spineCrop: crop || meta.spineCrop || null,
          },
        }
      })
      return { ...prev, spineLibrary: nextMap, items }
    })
  }

  const handleRemoveSpineLibraryEntry = (isbn) => {
    updateLibraryState((prev) => ({
      ...prev,
      spineLibrary: removeSpineFromLibraryMap(prev.spineLibrary || {}, isbn),
    }))
  }

  const handleAddBook = (bookData) => {
    actions.addBook(bookData)
    setShowAddModal(false)
  }

  const handleAddArticle = async (url) => {
    if (!isTauri() || !libraryPath) return
    const article = await captureArticle({ url, libraryPath })
    if (!article) return
    updateLibraryState((prev) => ({
      ...prev,
      items: [...prev.items, createDocumentItemFromDoc(article)],
    }))
  }

  const handleUpdateBook = (updatedBook) => {
    actions.updateBook(updatedBook)
    setSelectedBook(updatedBook)
  }

  const handleDeleteBook = (bookId) => {
    actions.deleteBook(bookId)
    setSelectedBook(null)
  }

  const handleSelectBook = (book) => {
    const updatedBook = {
      ...book,
      lastTouched: new Date().toISOString(),
      wearLevel: Math.min((book.wearLevel || 0) + 0.03, 1),
    }
    actions.updateBook(updatedBook)
    setSelectedBook(updatedBook)
  }

  const handleViewBookPage = useCallback((bookId) => {
    navigate(`/book/${bookId}`)
  }, [navigate])

  const handleLogPages = (bookId, pages) => {
    actions.logPages(bookId, pages)
  }

  const handleAddQuoteQuick = (bookId, text) => {
    actions.addQuote(bookId, text)
  }

  const handleAddReflection = (bookId, text) => {
    actions.addReflection(bookId, text)
  }

  const handleApplyFontToAll = (fontKey) => {
    updateLibraryState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (
        item.kind === 'book'
          ? mergeBookIntoItem(item, { spineFont: fontKey })
          : item
      )),
    }))
    setSelectedBook(prev => (prev ? { ...prev, spineFont: fontKey } : prev))
  }

  const handleAddShelf = (name) => {
    actions.addShelf(name)
  }

  const handleDeleteShelf = (shelfId) => {
    actions.deleteShelf(shelfId)
    if (activeShelf === shelfId) setActiveShelf('all')
  }

  const handleUpdateGoal = (goal) => {
    updateUserState({ yearlyGoal: goal })
  }

  const handleUpdateUserData = (updates) => {
    updateUserState(updates)
  }

  const handleCreateExhibit = () => {
    const name = prompt('Name your exhibit')
    if (!name) return
    const description = prompt('Optional exhibit description') || ''
    updateUserState({
      exhibits: [
        ...(userData.exhibits || []),
        { id: generateId(), name, description, bookIds: [] },
      ],
    })
  }

  const handleAddToExhibit = (bookId, exhibitId) => {
    updateUserState({
      exhibits: (userData.exhibits || []).map((exhibit) => {
        if (exhibit.id !== exhibitId) return exhibit
        const current = exhibit.bookIds || []
        if (current.includes(bookId)) return exhibit
        return { ...exhibit, bookIds: [...current, bookId] }
      }),
    })
  }

  const handleSaveSpineToLibrary = ({ isbn, spineImage, crop, title, author }) => {
    if (!isbn || !spineImage) return
    updateLibraryState((prev) => ({
      ...prev,
      spineLibrary: addSpineToLibraryMap(prev.spineLibrary || {}, { isbn, spineImage, crop, title, author }),
    }))
  }

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

  const updateDocumentMeta = (docId, updates) => {
    actions.updateDocumentMeta(docId, updates)
  }

  const scheduleDocumentMetaUpdate = (docId, updates, delay = 300) => {
    actions.scheduleDocumentMetaUpdate(docId, updates, delay)
  }

  const handleReadDocument = async (doc, options = {}) => {
    if (!isTauri() || !doc?.filePath) return
    if (doc.type !== 'pdf' && doc.type !== 'epub' && doc.type !== 'article') return
    if (doc.fileStatus === 'missing') return
    const resume = Boolean(options.resume)
    const location = options.location || null
    const lastLocationJson = doc.lastLocationJson || null
    const openedAt = new Date().toISOString()
    await updateDocumentMeta(doc.id, { lastOpened: openedAt })
    const sessionId = await startReadingSession(libraryPath, {
      itemId: doc.id,
      mode: doc.type,
      device: 'desktop',
    })
    try {
      setVaultError('')
      if (doc.type === 'article') {
        const html = await readTextFile(doc.filePath)
        const initialScrollOffset = typeof location?.scrollOffset === 'number'
          ? location.scrollOffset
          : (resume && typeof lastLocationJson?.scrollOffset === 'number'
            ? lastLocationJson.scrollOffset
            : 0)
        setActiveArticle({
          doc,
          html,
          initialScrollOffset,
          sessionId,
        })
        return
      }

      if (doc.type === 'pdf') {
        const locationPage = typeof location?.page === 'number' ? location.page : null
        const lastPage = lastLocationJson?.page || doc.lastPage || 1
        const startPage = locationPage || (resume ? lastPage : 1)
        setActivePdf({
          doc,
          filePath: doc.filePath,
          initialLocation: {
            kind: 'pdf',
            page: startPage,
            yOffsetWithinPage: location?.yOffsetWithinPage
              ?? (resume ? (lastLocationJson?.yOffsetWithinPage ?? 0) : 0),
          },
          initialMode: doc.mode || 'scroll',
          initialLayout: doc.layout || 'single',
          sessionId,
        })
        return
      }
      if (doc.type === 'epub') {
        const data = await readBinaryFile(doc.filePath)
        const startLocation = location?.cfi
          || (resume ? (doc.lastLocation || lastLocationJson?.cfi) : null)
        if (!doc.thumbnail) {
          generateEpubThumbnail(data).then((thumb) => {
            if (thumb) updateDocumentMeta(doc.id, { thumbnail: thumb })
          })
        }
        setActiveEpub({
          doc,
          data,
          initialLocation: startLocation,
          initialMode: doc.mode || 'scroll',
          initialLayout: doc.layout || 'single',
          initialFontSize: doc.fontSize || 100,
          sessionId,
        })
        return
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      setVaultError(`Unable to open document.${detail}`)
      if (sessionId) {
        await endReadingSession(libraryPath, sessionId)
      }
      setActivePdf(null)
      setActiveEpub(null)
      setActiveArticle(null)
    }
  }

  const openSearchResult = (result) => {
    if (!result?.itemId) return
    const book = books.find((entry) => entry.id === result.itemId)
    if (book) {
      setSelectedBook(book)
      setActiveView('library')
      setSearchOpen(false)
      return
    }
    const doc = documents.find((entry) => entry.id === result.itemId)
    if (doc) {
      handleReadDocument(doc, { resume: true })
      setActiveView('documents')
      setSearchOpen(false)
    }
  }

  const handleSearchKeyDown = (event) => {
    if (!searchOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setSearchOpen(true)
    }
    if (event.key === 'Escape') {
      setSearchOpen(false)
      setSearchActiveIndex(-1)
      return
    }
    if (flatSearchResults.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSearchActiveIndex((prev) => (prev + 1) % flatSearchResults.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSearchActiveIndex((prev) => (prev <= 0 ? flatSearchResults.length - 1 : prev - 1))
      return
    }
    if (event.key === 'Enter') {
      if (searchActiveIndex >= 0 && searchActiveIndex < flatSearchResults.length) {
        event.preventDefault()
        openSearchResult(flatSearchResults[searchActiveIndex])
      }
    }
  }

  const handleOpenAnnotation = (annotation) => {
    if (!annotation) return
    if (annotation.format === 'book') {
      const book = books.find((entry) => entry.id === annotation.itemId)
      if (book) {
        setSelectedBook(book)
        setActiveView('library')
      }
      return
    }
    const doc = documents.find((entry) => entry.id === annotation.itemId)
    if (doc) {
      handleReadDocument(doc, { resume: true, location: annotation.location })
      setActiveView('documents')
    }
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

  const addDocumentNote = async (docId, note) => {
    const nextNotes = await actions.addDocumentNote(docId, note)
    if (!nextNotes) return
    setActivePdf((prev) => {
      if (!prev?.doc || prev.doc.id !== docId) return prev
      return { ...prev, doc: { ...prev.doc, notes: nextNotes } }
    })
    setActiveEpub((prev) => {
      if (!prev?.doc || prev.doc.id !== docId) return prev
      return { ...prev, doc: { ...prev.doc, notes: nextNotes } }
    })
    setActiveArticle((prev) => {
      if (!prev?.doc || prev.doc.id !== docId) return prev
      return { ...prev, doc: { ...prev.doc, notes: nextNotes } }
    })
  }

  return (
    <div
      className={`library-wrapper theme-${userData.theme || 'classic'} lighting-${userData.lightingPreset || 'golden'} wood-${userData.woodTone || 'walnut'} ${activePdf || activeEpub || activeArticle ? 'reader-open' : ''}`}
      style={{ '--placard-font': resolveShelfFont(userData.shelfFont) }}
    >
      <div className="library-atmosphere" aria-hidden="true" />
      {/* Header */}
      <header className="site-header">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <h1 className="logo-text">
              {userData.displayName ? userData.displayName : 'My '}
              {!userData.displayName && <span>Library</span>}
            </h1>
            <div className="flex items-center gap-3">
              <div className="view-toggle">
                <button
                  type="button"
                  className={`view-toggle-btn ${activeView === 'library' ? 'active' : ''}`}
                  onClick={() => navigate('/')}
                >
                  Library
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${activeView === 'documents' ? 'active' : ''}`}
                  onClick={() => navigate('/documents')}
                >
                  Documents
                </button>
              </div>
              {isTauri() && (
                <div className="global-search">
                  <div className="global-search-input-wrap">
                    <input
                      type="search"
                      placeholder="Search library..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => setSearchOpen(true)}
                      onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                      onKeyDown={handleSearchKeyDown}
                    />
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        className="global-search-clear"
                        onClick={() => {
                          setSearchQuery('')
                          setSearchOpen(false)
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {searchOpen && (groupedSearchResults.length > 0 || searchBusy || searchQuery.trim()) && (
                    <div className="global-search-results">
                      <div className="global-search-summary">
                        {searchBusy ? 'Searching...' : `${flatSearchResults.length} result${flatSearchResults.length === 1 ? '' : 's'}`}
                      </div>
                      {searchBusy && (
                        <div className="global-search-loading">
                          <div className="global-search-skeleton" />
                          <div className="global-search-skeleton" />
                          <div className="global-search-skeleton short" />
                        </div>
                      )}
                      {searchStatus === 'error' && !searchBusy && (
                        <div className="global-search-empty">Search unavailable</div>
                      )}
                      {!searchBusy && (() => {
                        let visibleIndex = -1
                        return groupedSearchResults.map((group) => (
                          <div key={group.kind} className="global-search-group">
                            <div className="global-search-group-title">{group.label}</div>
                            {group.items.map((result, itemIndex) => {
                              visibleIndex += 1
                              const isActive = visibleIndex === searchActiveIndex
                              return (
                                <button
                                  key={`${result.itemId}-${itemIndex}-${group.kind}`}
                                  type="button"
                                  className={`global-search-result ${isActive ? 'active' : ''}`}
                                  onMouseEnter={() => setSearchActiveIndex(visibleIndex)}
                                  onClick={() => openSearchResult(result)}
                                >
                                  <div className="global-search-title-row">
                                    <div className="global-search-title">{result.title}</div>
                                    <span className="global-search-kind">
                                      {group.kind === 'book'
                                        ? 'Book'
                                        : group.kind === 'document'
                                          ? 'Document'
                                          : group.kind === 'article'
                                            ? 'Article'
                                            : 'Item'}
                                    </span>
                                  </div>
                                  {result.snippet && (
                                    <div
                                      className="global-search-snippet"
                                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                                    />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        ))
                      })()}
                      {!searchBusy && flatSearchResults.length === 0 && (
                        <div className="global-search-empty">No matches</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {activeView === 'library' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <span className="w-4 h-4">{Icons.plus}</span>
                  <span>Add Book</span>
                </button>
              )}
              <button
                onClick={() => setShowPreferences((prev) => !prev)}
                className="btn-secondary flex items-center gap-2"
              >
                <span className="w-4 h-4">{Icons.tune}</span>
                <span>Preferences</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="library-content relative z-10 max-w-6xl mx-auto px-6 py-8">
        <Suspense fallback={null}>
          <Routes>
            <Route
              path="/"
              element={
                <LibraryView
                  books={books}
                  shelves={shelves}
                  userData={userData}
                  activeShelf={activeShelf}
                  setActiveShelf={setActiveShelf}
                  selectedTags={selectedTags}
                  setSelectedTags={setSelectedTags}
                  sortedBooks={sortedBooks}
                  filteredBooks={filteredBooks}
                  allTags={allTags}
                  sortMode={sortMode}
                  setSortMode={setSortMode}
                  viewMode={viewMode}
                  setShowAddModal={setShowAddModal}
                  showCustomizer={showCustomizer}
                  showDailyRitual={showDailyRitual}
                  handleUpdateUserData={handleUpdateUserData}
                  handleExportLibrary={handleExportLibrary}
                  spineLibraryEntries={spineLibraryEntries}
                  handleUpdateSpineLibraryEntry={handleUpdateSpineLibraryEntry}
                  handleRemoveSpineLibraryEntry={handleRemoveSpineLibraryEntry}
                  handleLogPages={handleLogPages}
                  handleAddQuoteQuick={handleAddQuoteQuick}
                  handleAddReflection={handleAddReflection}
                  handleSelectBook={handleSelectBook}
                  handleCreateExhibit={handleCreateExhibit}
                  handleAddShelf={handleAddShelf}
                  handleDeleteShelf={handleDeleteShelf}
                  handleAddToExhibit={handleAddToExhibit}
                  icons={Icons}
                  booksFinishedThisYear={booksFinishedThisYear}
                  quoteCount={quoteCount}
                  continueReadingDocs={continueReadingDocs}
                  handleReadDocument={handleReadDocument}
                  setActiveView={setActiveView}
                  shelfFontValue={resolveShelfFont(userData.shelfFont)}
                  nameplateText={userData.displayName}
                  showInsights={showInsights}
                  setShowInsights={setShowInsights}
                  annotations={annotations}
                  onOpenAnnotation={handleOpenAnnotation}
                />
              }
            />
            <Route
              path="/documents"
              element={
                <ReadingRoomView
                  documents={documents}
                  libraryPath={libraryPath}
                  onImport={handleImportDocuments}
                  onReadDocument={handleReadDocument}
                  vaultError={vaultError}
                  lastRescanAt={userData.lastRescanAt}
                  ingestJobs={visibleIngestJobs}
                  ingestBusy={ingestBusy}
                  onRetryIngest={handleRetryIngest}
                  onCancelIngest={handleCancelIngest}
                  onRunAllOcr={handleRunAllOcr}
                />
              }
            />
            <Route
              path="/book/:bookId"
              element={
                <BookPage
                  books={books}
                  shelves={shelves}
                  allTags={allTags}
                  onUpdate={handleUpdateBook}
                  onDelete={handleDeleteBook}
                  onLogPages={handleLogPages}
                  onAddQuote={handleAddQuoteQuick}
                  onAddReflection={handleAddReflection}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddBookModal
            onClose={() => setShowAddModal(false)}
            onAddBook={handleAddBook}
            onAddArticle={handleAddArticle}
            onMigrateExport={handleMigrateExportFile}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreferences && (
          <PreferencesPanel
            open={showPreferences}
            onClose={() => setShowPreferences(false)}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showStats={showStats}
            setShowStats={setShowStats}
            showDailyRitual={showDailyRitual}
            setShowDailyRitual={setShowDailyRitual}
            showCustomizer={showCustomizer}
            setShowCustomizer={setShowCustomizer}
            isDesktop={isTauri()}
            onRescanLibrary={handleRescanLibrary}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
            maintenanceStatus={maintenanceStatus}
            backupBusy={backupBusy}
            restoreBusy={restoreBusy}
            rescanBusy={rescanBusy}
            lastRescanAt={userData.lastRescanAt}
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
            snapshots={snapshots}
            onCreateSnapshot={handleCreateSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
            snapshotBusy={snapshotBusy}
            integrityStatus={integrityStatus}
            onRunDoctor={handleRunDoctor}
            doctorBusy={doctorBusy}
            onRebuildIndex={handleRebuildIndex}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBook && (
          <BookModal
            book={selectedBook}
            shelves={shelves}
            allTags={allTags}
            onClose={() => setSelectedBook(null)}
            onUpdate={handleUpdateBook}
            onDelete={handleDeleteBook}
            onApplyFontToAll={handleApplyFontToAll}
            exhibits={userData.exhibits || []}
            onAddToExhibit={handleAddToExhibit}
            spineLibrary={spineLibraryMap}
            onSaveSpineToLibrary={handleSaveSpineToLibrary}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStats && (
          <StatsDashboard
            books={books}
            yearlyGoal={userData.yearlyGoal}
            onUpdateGoal={handleUpdateGoal}
            quests={userData.quests || []}
            statsAdjustments={userData.statsAdjustments || {}}
            onUpdateUserData={handleUpdateUserData}
            theme={theme}
            onClose={() => setShowStats(false)}
          />
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <AnimatePresence>
        {activePdf && (
          <PdfReaderModal
            title={activePdf.doc?.title}
            filePath={activePdf.filePath}
            initialLocation={activePdf.initialLocation}
            initialMode={activePdf.initialMode}
            initialLayout={activePdf.initialLayout}
            cachePages={Number(userData.readerCachePages) || 8}
            maxMemoryMb={Number(userData.pdfRenderMemoryMb ?? userData.readerMaxMemoryMb) || 512}
            overscanPages={Number(userData.pdfVirtualOverscanPages) || 8}
            notes={activePdf.doc?.notes || []}
            onAddNote={(note) => addDocumentNote(activePdf.doc?.id, note)}
            onLocationChange={(location) => {
              if (!activePdf.doc?.id) return
              scheduleDocumentMetaUpdate(activePdf.doc.id, { lastLocationJson: location }, 250)
            }}
            onMetaChange={(meta) => {
              if (!activePdf.doc?.id) return
              if (meta.pageCount) {
                setActivePdf((prev) => prev ? { ...prev, pageCount: meta.pageCount } : prev)
              }
              scheduleDocumentMetaUpdate(activePdf.doc.id, {
                ...(meta.pageCount ? { pageCount: meta.pageCount } : {}),
                ...(meta.mode ? { mode: meta.mode } : {}),
                ...(meta.layout ? { layout: meta.layout } : {}),
              }, 200)
            }}
            onClose={async (page) => {
              if (activePdf.doc?.id) {
                const totalPages = activePdf.pageCount || activePdf.doc?.pageCount
                const progress = totalPages
                  ? Math.round(((page || 1) / totalPages) * 100)
                  : null
                await updateDocumentMeta(activePdf.doc.id, { lastPage: page || 1, progressPercent: progress })
              }
              if (activePdf.sessionId) {
                await endReadingSession(libraryPath, activePdf.sessionId)
              }
              setActivePdf(null)
            }}
            onPageChange={(page) => {
              if (!activePdf.doc?.id) return
              const totalPages = activePdf.pageCount || activePdf.doc?.pageCount
              const progress = totalPages
                ? Math.round((page / totalPages) * 100)
                : null
              scheduleDocumentMetaUpdate(activePdf.doc.id, { lastPage: page, progressPercent: progress }, 300)
            }}
          />
        )}
        </AnimatePresence>

        <AnimatePresence>
        {activeEpub && (
          <EpubReaderModal
            title={activeEpub.doc?.title}
            data={activeEpub.data}
            initialLocation={activeEpub.initialLocation}
            initialMode={activeEpub.initialMode}
            initialLayout={activeEpub.initialLayout}
            initialFontSize={activeEpub.initialFontSize}
            notes={activeEpub.doc?.notes || []}
            onAddNote={(note) => addDocumentNote(activeEpub.doc?.id, note)}
            onLocationChange={(location) => {
              if (!activeEpub.doc?.id) return
              scheduleDocumentMetaUpdate(activeEpub.doc.id, {
                lastLocation: location,
                lastLocationJson: buildEpubLocation(location),
              }, 300)
            }}
            onMetaChange={(meta) => {
              if (!activeEpub.doc?.id) return
              scheduleDocumentMetaUpdate(activeEpub.doc.id, {
                ...(meta.mode ? { mode: meta.mode } : {}),
                ...(meta.layout ? { layout: meta.layout } : {}),
                ...(meta.fontSize ? { fontSize: meta.fontSize } : {}),
              }, 300)
            }}
            onProgressChange={(percent) => {
              if (!activeEpub.doc?.id) return
              scheduleDocumentMetaUpdate(activeEpub.doc.id, { progressPercent: percent }, 300)
            }}
            onClose={async () => {
              if (activeEpub.sessionId) {
                await endReadingSession(libraryPath, activeEpub.sessionId)
              }
              setActiveEpub(null)
            }}
          />
        )}
        </AnimatePresence>

        <AnimatePresence>
        {activeArticle && (
          <ArticleReaderModal
            title={activeArticle.doc?.title}
            html={activeArticle.html}
            initialScrollOffset={activeArticle.initialScrollOffset || 0}
            notes={activeArticle.doc?.notes || []}
            onAddNote={(note) => addDocumentNote(activeArticle.doc?.id, note)}
            onLocationChange={(location) => {
              if (!activeArticle.doc?.id) return
              scheduleDocumentMetaUpdate(activeArticle.doc.id, { lastLocationJson: location }, 300)
            }}
            onProgressChange={(percent) => {
              if (!activeArticle.doc?.id) return
              scheduleDocumentMetaUpdate(activeArticle.doc.id, { progressPercent: percent }, 300)
            }}
            onClose={async () => {
              if (activeArticle.sessionId) {
                await endReadingSession(libraryPath, activeArticle.sessionId)
              }
              setActiveArticle(null)
            }}
          />
        )}
        </AnimatePresence>
      </Suspense>

    </div>
  )
}

function resolveShelfFont(fontKey) {
  switch (fontKey) {
    case 'playfair':
      return "'Playfair Display', serif"
    case 'fell':
      return "'IM Fell English', serif"
    case 'baskerville':
      return "'Libre Baskerville', serif"
    case 'cinzel':
    default:
      return "'Cinzel', serif"
  }
}

export default App
