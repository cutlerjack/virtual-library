import { readBinaryFile, readTextFile } from '@tauri-apps/api/fs'
import { isTauri } from '../utils/tauri'
import { generateEpubThumbnail } from '../utils/epubThumbnail'
import { startReadingSession, endReadingSession } from '../data/libraryDb'

export function useReaderController({
  libraryPath,
  books,
  documents,
  actions,
  setActivePdf,
  setActiveEpub,
  setActiveArticle,
  setSelectedBook,
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

  return {
    handleReadDocument,
    addDocumentNote,
    updateDocumentMeta,
    scheduleDocumentMetaUpdate,
    handleOpenAnnotation,
    openSearchResult,
  }
}
