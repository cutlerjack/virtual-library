import React, { lazy, Suspense, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import ErrorBoundary from './ErrorBoundary'
import { buildEpubLocation } from '../reader/readerCore'
import { endReaderSessionBestEffort } from '../reader/readerSessionLifecycle'
import { selectBookStudyStack, selectStudySessionState } from '../store/librarySelectors'
import { buildStudyStackNavigation } from '../utils/studyStack'

const PdfReaderModal = lazy(() => import('./PdfReaderModal'))
const EpubReaderModal = lazy(() => import('./EpubReaderModal'))
const ArticleReaderModal = lazy(() => import('./ArticleReaderModal'))

function buildReaderStudyContext(studySession, books) {
  if (!studySession?.bookId || !studySession?.entryId) return null

  const book = (books || []).find((entry) => entry.id === studySession.bookId)
  if (!book) return null

  const stack = selectBookStudyStack(book, Number.MAX_SAFE_INTEGER)
  const navigation = buildStudyStackNavigation({ studyStack: stack }, studySession.entryId)
  if (!navigation.currentEntry) return null

  return {
    book,
    stack: navigation.stack,
    currentEntry: navigation.currentEntry,
    currentIndex: navigation.currentIndex,
    nextEntry: navigation.nextEntry,
    session: selectStudySessionState(book),
  }
}

export default function ReaderModals({
  activePdf, setActivePdf,
  activeEpub, setActiveEpub,
  activeArticle, setActiveArticle,
  libraryPath,
  readerSettings,
  addDocumentNote,
  updateDocumentMeta,
  scheduleDocumentMetaUpdate,
  flushPendingDocumentMetaUpdates,
  books = [],
  onOpenStudyEntry,
  onOpenBook,
  onToggleStudyEntryComplete,
}) {
  const activeStudyContext = buildReaderStudyContext(
    activePdf?.studySession || activeEpub?.studySession || activeArticle?.studySession,
    books
  )
  const endedSessionIdsRef = useRef(new Set())

  const endReaderSessionOnce = (sessionId) => {
    if (!libraryPath || !sessionId) return Promise.resolve(false)
    const key = `${libraryPath}:${sessionId}`
    if (endedSessionIdsRef.current.has(key)) return Promise.resolve(false)
    endedSessionIdsRef.current.add(key)
    return endReaderSessionBestEffort(libraryPath, sessionId)
  }

  useEffect(() => {
    const sessionIds = [
      activePdf?.sessionId,
      activeEpub?.sessionId,
      activeArticle?.sessionId,
    ].filter(Boolean)
    return () => {
      sessionIds.forEach((sessionId) => {
        endReaderSessionOnce(sessionId)
      })
    }
  }, [activePdf?.sessionId, activeEpub?.sessionId, activeArticle?.sessionId, libraryPath])

  const clearCurrentReader = async () => {
    const currentPdf = activePdf
    const currentEpub = activeEpub
    const currentArticle = activeArticle
    flushPendingDocumentMetaUpdates?.()
    await Promise.all([
      endReaderSessionOnce(currentPdf?.sessionId),
      endReaderSessionOnce(currentEpub?.sessionId),
      endReaderSessionOnce(currentArticle?.sessionId),
    ])
    if (currentPdf) setActivePdf(null)
    if (currentEpub) setActiveEpub(null)
    if (currentArticle) setActiveArticle(null)
  }

  const closeReaderErrorFallback = async (reset) => {
    await clearCurrentReader()
    reset()
  }

  const closePdfReader = async (page = activePdf?.doc?.lastPage || 1) => {
    const currentPdf = activePdf
    if (!currentPdf) return
    try {
      flushPendingDocumentMetaUpdates?.()
      if (currentPdf.doc?.id) {
        const totalPages = currentPdf.pageCount || currentPdf.doc?.pageCount
        const progress = totalPages
          ? Math.round(((page || 1) / totalPages) * 100)
          : currentPdf.doc?.progressPercent ?? null
        await updateDocumentMeta(currentPdf.doc.id, { lastPage: page || 1, progressPercent: progress })
      }
    } catch (error) {
      console.warn('[reader-session] Unable to persist PDF close state:', error?.message || error)
    } finally {
      await endReaderSessionOnce(currentPdf.sessionId)
      setActivePdf(null)
    }
  }

  const closeEpubReader = async () => {
    const currentEpub = activeEpub
    if (!currentEpub) return
    flushPendingDocumentMetaUpdates?.()
    await endReaderSessionOnce(currentEpub.sessionId)
    setActiveEpub(null)
  }

  const closeArticleReader = async () => {
    const currentArticle = activeArticle
    if (!currentArticle) return
    flushPendingDocumentMetaUpdates?.()
    await endReaderSessionOnce(currentArticle.sessionId)
    setActiveArticle(null)
  }

  const closeCurrentReader = async () => {
    if (activePdf) {
      await closePdfReader(activePdf.doc?.lastPage || 1)
      return
    }
    if (activeEpub) {
      await closeEpubReader()
      return
    }
    if (activeArticle) {
      await closeArticleReader()
    }
  }

  const handleOpenStudyBook = async () => {
    if (!activeStudyContext) return
    await closeCurrentReader()
    onOpenBook?.(activeStudyContext.book.id)
  }

  const handleOpenNextStudyEntry = async () => {
    if (!activeStudyContext?.nextEntry) return
    await closeCurrentReader()
    await onOpenStudyEntry?.(activeStudyContext.book.id, activeStudyContext.nextEntry.id)
  }

  const handleToggleCurrentStudyEntry = () => {
    if (!activeStudyContext?.currentEntry) return
    onToggleStudyEntryComplete?.(activeStudyContext.book.id, activeStudyContext.currentEntry.id)
  }

  const studySessionPanel = activeStudyContext ? (
    <div className="reader-session-banner">
      <div className="reader-session-copy">
        <div className="reader-session-eyebrow">Study Session</div>
        <div className="reader-session-title">{activeStudyContext.book.title}</div>
        <div className="reader-session-meta">
          <span>Item {activeStudyContext.currentIndex + 1} of {activeStudyContext.stack.length}</span>
          <span>{activeStudyContext.session.remainingCount} active</span>
          <span>{activeStudyContext.session.completedCount} complete</span>
        </div>
        {activeStudyContext.nextEntry && (
          <div className="reader-session-next">
            Next: {activeStudyContext.nextEntry.format === 'book'
              ? 'Return to the volume'
              : activeStudyContext.nextEntry.itemTitle}
          </div>
        )}
      </div>
      <div className="reader-session-actions">
        <button type="button" className="btn-secondary text-xs px-3 py-2" onClick={handleOpenStudyBook}>
          Open Book
        </button>
        <button type="button" className="btn-secondary text-xs px-3 py-2" onClick={handleToggleCurrentStudyEntry}>
          {activeStudyContext.currentEntry.completedAt ? 'Mark Active' : 'Mark Done'}
        </button>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={handleOpenNextStudyEntry}
          disabled={!activeStudyContext.nextEntry}
        >
          Next Item
        </button>
      </div>
    </div>
  ) : null

  return (
    <ErrorBoundary fallback={({ error, reset }) => (
      <div className="reader-error-overlay">
        <div className="reader-error-content">
          <h3>Reader Error</h3>
          <p>{error?.message || 'The reader encountered an error.'}</p>
          <button type="button" onClick={() => closeReaderErrorFallback(reset)} className="btn-primary">Close</button>
        </div>
      </div>
    )}>
    <Suspense fallback={<div className="loading-placeholder" />}>
      <AnimatePresence>
      {activePdf && (
        <PdfReaderModal
          title={activePdf.doc?.title}
          filePath={activePdf.filePath}
          initialLocation={activePdf.initialLocation}
          initialMode={activePdf.initialMode}
          initialLayout={activePdf.initialLayout}
          cachePages={readerSettings.cachePages}
          maxMemoryMb={readerSettings.maxMemoryMb}
          overscanPages={readerSettings.overscanPages}
          notes={activePdf.doc?.notes || []}
          sessionPanel={studySessionPanel}
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
          onClose={closePdfReader}
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
          sessionPanel={studySessionPanel}
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
          onClose={closeEpubReader}
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {activeArticle && (
        <ArticleReaderModal
          title={activeArticle.doc?.title}
          html={activeArticle.html}
          plainText={activeArticle.plainText}
          quarantined={activeArticle.quarantined}
          initialScrollOffset={activeArticle.initialScrollOffset || 0}
          notes={activeArticle.doc?.notes || []}
          sessionPanel={studySessionPanel}
          onAddNote={(note) => addDocumentNote(activeArticle.doc?.id, note)}
          onLocationChange={(location) => {
            if (!activeArticle.doc?.id) return
            scheduleDocumentMetaUpdate(activeArticle.doc.id, { lastLocationJson: location }, 300)
          }}
          onProgressChange={(percent) => {
            if (!activeArticle.doc?.id) return
            scheduleDocumentMetaUpdate(activeArticle.doc.id, { progressPercent: percent }, 300)
          }}
          onClose={closeArticleReader}
        />
      )}
      </AnimatePresence>
    </Suspense>
    </ErrorBoundary>
  )
}
