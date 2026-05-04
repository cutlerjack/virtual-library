import { readBinaryFile, readTextFile } from '@tauri-apps/api/fs'
import { isTauri } from '../utils/tauri'
import { generateEpubThumbnail } from '../utils/epubThumbnail'
import { prepareCapturedHtml } from '../utils/htmlSanitizer'
import {
  endReaderSessionBestEffort,
  startReaderSessionBestEffort,
} from '../reader/readerSessionLifecycle'

export function useReaderController({
  libraryPath,
  books,
  documents,
  actions,
  onOpenBook,
  setActivePdf,
  setActiveEpub,
  setActiveArticle,
  setVaultError,
  setActiveView,
  setSearchOpen,
}) {
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
    const studySession = options.studySession || null
    const lastLocationJson = doc.lastLocationJson || null
    const openedAt = new Date().toISOString()
    let sessionId = null
    try {
      setVaultError('')
      await updateDocumentMeta(doc.id, { lastOpened: openedAt })
      sessionId = await startReaderSessionBestEffort(libraryPath, {
        itemId: doc.id,
        mode: doc.type,
      })
      if (doc.type === 'article') {
        let sanitizedHtml = doc.sanitizedHtml || null
        let plainText = doc.plainText || null
        let quarantined = Boolean(doc.quarantined)
        if (!sanitizedHtml && !plainText) {
          const raw = await readTextFile(doc.filePath)
          const prepared = prepareCapturedHtml(raw)
          sanitizedHtml = prepared.sanitizedHtml || null
          plainText = prepared.plainText || null
          quarantined = prepared.quarantined
          updateDocumentMeta(doc.id, {
            sanitizedHtml,
            plainText,
            quarantined,
            fileStatus: quarantined ? 'quarantined' : (doc.fileStatus || 'ok'),
            searchText: plainText || doc.searchText || null,
          })
        }
        const initialScrollOffset = typeof location?.scrollOffset === 'number'
          ? location.scrollOffset
          : (resume && typeof lastLocationJson?.scrollOffset === 'number'
            ? lastLocationJson.scrollOffset
            : 0)
        setActiveArticle({
          doc,
          html: sanitizedHtml,
          plainText: plainText || doc.searchText || '',
          quarantined,
          initialScrollOffset,
          sessionId,
          studySession,
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
          studySession,
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
          studySession,
        })
        return
      }
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      setVaultError(`Unable to open document.${detail}`)
      await endReaderSessionBestEffort(libraryPath, sessionId)
      setActivePdf(null)
      setActiveEpub(null)
      setActiveArticle(null)
    }
  }

  const addDocumentNote = async (docId, note) => {
    try {
      const nextNotes = await actions.addDocumentNote(docId, note)
      if (!nextNotes) return false
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
      return true
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : ''
      setVaultError(`Unable to save note.${detail}`)
      return false
    }
  }

  const handleOpenAnnotation = (annotation) => {
    if (!annotation) return
    if (annotation.format === 'book') {
      const book = books.find((entry) => entry.id === annotation.itemId)
      if (book) {
        onOpenBook?.(book.id)
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

  const openStudyEntry = async (bookId, studyEntryId) => {
    if (!bookId || !studyEntryId) return
    const book = books.find((entry) => entry.id === bookId)
    const studyEntry = (book?.studyStack || []).find((entry) => entry.id === studyEntryId)
    if (!book || !studyEntry) return

    actions.reviewStudyEntry(bookId, studyEntryId)

    if (studyEntry.format === 'book') {
      onOpenBook?.(bookId)
      setActiveView('library')
      return
    }

    const sourceItemId = studyEntry.sourceItemId || studyEntry.itemId
    const doc = documents.find((entry) => entry.id === sourceItemId)
    if (!doc) return

    await handleReadDocument(doc, {
      resume: true,
      location: studyEntry.location,
      studySession: {
        bookId,
        entryId: studyEntryId,
      },
    })
    setActiveView('documents')
  }

  const openSearchResult = (result) => {
    if (!result?.itemId) return
    const book = books.find((entry) => entry.id === result.itemId)
    if (book) {
      onOpenBook?.(book.id)
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

  return {
    handleReadDocument,
    addDocumentNote,
    updateDocumentMeta,
    scheduleDocumentMetaUpdate,
    handleOpenAnnotation,
    openStudyEntry,
    openSearchResult,
  }
}
