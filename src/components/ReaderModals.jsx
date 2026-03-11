import { lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import ErrorBoundary from './ErrorBoundary'
import { endReadingSession } from '../data/libraryDb'
import { buildEpubLocation } from '../reader/readerCore'

const PdfReaderModal = lazy(() => import('./PdfReaderModal'))
const EpubReaderModal = lazy(() => import('./EpubReaderModal'))
const ArticleReaderModal = lazy(() => import('./ArticleReaderModal'))

export default function ReaderModals({
  activePdf, setActivePdf,
  activeEpub, setActiveEpub,
  activeArticle, setActiveArticle,
  libraryPath,
  readerSettings,
  addDocumentNote,
  updateDocumentMeta,
  scheduleDocumentMetaUpdate,
}) {
  return (
    <ErrorBoundary fallback={({ error, reset }) => (
      <div className="reader-error-overlay">
        <div className="reader-error-content">
          <h3>Reader Error</h3>
          <p>{error?.message || 'The reader encountered an error.'}</p>
          <button type="button" onClick={reset} className="btn-primary">Close</button>
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
    </ErrorBoundary>
  )
}
