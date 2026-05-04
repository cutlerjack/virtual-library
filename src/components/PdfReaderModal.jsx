import React, { useEffect, useMemo, useRef, useState } from 'react'
import { readBinaryFile } from '@tauri-apps/api/fs'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker?url'
import { buildPdfLocation, findRelatedNotes } from '../reader/readerCore'
import { isTauri } from '../utils/tauri'
import { toCloneSafeArrayBuffer } from '../utils/binary'
import { usePdfLayoutIndex } from '../reader/pdf/usePdfLayoutIndex'
import { usePdfViewportWindow } from '../reader/pdf/usePdfViewportWindow'
import { usePdfRenderScheduler } from '../reader/pdf/usePdfRenderScheduler'
import ReaderDialogShell from './ReaderDialogShell'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const PAGE_GAP = 18
const MAX_PAGE_WIDTH = 820

function clampPage(page, pageCount) {
  return Math.min(Math.max(1, page || 1), Math.max(1, pageCount || 1))
}

function resolveInitialPage(initialLocation, initialPage, pageCount) {
  const candidate = typeof initialLocation?.page === 'number'
    ? initialLocation.page
    : initialPage
  return clampPage(candidate || 1, pageCount)
}

function PdfReaderModal({
  title,
  filePath,
  data = null,
  initialPage = 1,
  initialLocation = null,
  initialMode = 'scroll',
  initialLayout = 'single',
  onPageChange,
  onLocationChange,
  onMetaChange,
  onClose,
  notes = [],
  onAddNote,
  cachePages = 2,
  maxMemoryMb = 512,
  overscanPages = 8,
  sessionPanel = null,
}) {
  const scrollContainerRef = useRef(null)
  const pageRefs = useRef([])
  const scrollJumpRef = useRef(false)
  const scrollRafRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [isRendering, setIsRendering] = useState(false)
  const [mode, setMode] = useState(initialMode || 'scroll')
  const [layout, setLayout] = useState(initialLayout || 'single')
  const [noteText, setNoteText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [scrollMetrics, setScrollMetrics] = useState({ scrollTop: 0, height: 0 })
  const [loadError, setLoadError] = useState('')
  const { enqueueRenderTask, clearRenderQueue } = usePdfRenderScheduler()

  const deviceScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const scrollScale = 1
  const parsedMemoryMb = Number(maxMemoryMb)
  const safeMemoryMb = Number.isFinite(parsedMemoryMb) && parsedMemoryMb > 0 ? parsedMemoryMb : 512
  const memoryScaleFactor = Math.max(0.75, Math.min(1, safeMemoryMb / 512))
  const scrollOutputScale = Number.isFinite(memoryScaleFactor)
    ? Math.min(deviceScale, memoryScaleFactor * deviceScale)
    : deviceScale
  const pageOutputScale = Math.min(deviceScale, 2)
  const effectiveOverscan = Math.max(2, Number(overscanPages) || 8, Number(cachePages) || 2)

  const layoutIndex = usePdfLayoutIndex({
    pdfDoc,
    scale: scrollScale,
    gap: PAGE_GAP,
  })

  const virtualWindow = usePdfViewportWindow({
    pageCount,
    scrollTop: scrollMetrics.scrollTop,
    viewportHeight: scrollMetrics.height,
    overscanPages: effectiveOverscan,
    offsetToPage: layoutIndex.offsetToPage,
  })

  const relatedNotes = useMemo(() => (
    findRelatedNotes(notes, buildPdfLocation(page))
  ), [notes, page])

  useEffect(() => {
    if (!pdfDoc || mode !== 'page') return
    setIsRendering(true)
    const timeout = setTimeout(() => setIsRendering(false), 120)
    return () => clearTimeout(timeout)
  }, [pdfDoc, page, scale, mode, layout, pageCount])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onPageChange?.(page)
    }, mode === 'scroll' ? 160 : 0)
    return () => clearTimeout(timeout)
  }, [page, onPageChange, mode])

  useEffect(() => {
    if (mode !== 'scroll') {
      onLocationChange?.(buildPdfLocation(page, 0))
      return
    }
    const yOffsetWithinPage = Math.max(
      0,
      (scrollMetrics.scrollTop || 0) - (layoutIndex.getPageTop(page) || 0)
    )
    onLocationChange?.(buildPdfLocation(page, yOffsetWithinPage))
  }, [page, mode, onLocationChange, scrollMetrics.scrollTop, layoutIndex])

  useEffect(() => {
    onMetaChange?.({ mode, layout, pageCount })
  }, [mode, layout, pageCount, onMetaChange])

  useEffect(() => {
    clearRenderQueue()
  }, [clearRenderQueue, mode, scale, pageCount])

  useEffect(() => {
    if (!filePath && !data) {
      setLoadError('Missing PDF source')
      setPdfDoc(null)
      return
    }

    let cancelled = false
    let loadingTask = null
    setLoadError('')
    setMode(initialMode || 'scroll')
    setLayout(initialLayout || 'single')

    const load = async () => {
      try {
        let sourceData = data
        if (!sourceData && filePath && isTauri()) {
          sourceData = await readBinaryFile(filePath)
        }
        if (!sourceData) {
          throw new Error('Unable to load PDF data')
        }

        loadingTask = pdfjsLib.getDocument({ data: toCloneSafeArrayBuffer(sourceData) })
        const doc = await loadingTask.promise
        if (cancelled) return
        setPdfDoc(doc)
        pageRefs.current = []
        setPageCount(doc.numPages)
        const startPage = resolveInitialPage(initialLocation, initialPage, doc.numPages)
        setPage(startPage)
      } catch (error) {
        if (cancelled) return
        setLoadError(error?.message || 'Unable to open PDF')
        setPdfDoc(null)
      }
    }

    load()
    return () => {
      cancelled = true
      if (loadingTask) loadingTask.destroy()
    }
  }, [filePath, data, initialLocation, initialPage, initialMode, initialLayout])

  useEffect(() => () => {
    pdfDoc?.destroy?.()
  }, [pdfDoc])

  useEffect(() => {
    if (!scrollContainerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || 0
      setContainerWidth(width)
    })
    observer.observe(scrollContainerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (mode !== 'scroll' || !scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const handleScroll = () => {
      if (scrollJumpRef.current) return
      if (scrollRafRef.current) return
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null
        const scrollTop = container.scrollTop
        const height = container.clientHeight
        setScrollMetrics({ scrollTop, height })
        const current = layoutIndex.offsetToPage(scrollTop + 12)
        if (current !== page) {
          setPage(current)
        }
      })
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    setScrollMetrics({ scrollTop: container.scrollTop, height: container.clientHeight })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [mode, layoutIndex, page])

  const jumpToPage = (targetPage, behavior = 'smooth') => {
    const nextPage = clampPage(targetPage, pageCount)
    if (mode === 'scroll') {
      if (!scrollContainerRef.current) return
      scrollJumpRef.current = true
      const top = layoutIndex.getPageTop(nextPage)
      scrollContainerRef.current.scrollTo({ top, behavior })
      setTimeout(() => {
        scrollJumpRef.current = false
      }, 250)
      return
    }
    const node = pageRefs.current[nextPage - 1]
    if (node) {
      scrollJumpRef.current = true
      node.scrollIntoView({ block: 'start', behavior: 'smooth' })
      setTimeout(() => {
        scrollJumpRef.current = false
      }, 250)
    }
  }

  useEffect(() => {
    if (mode !== 'scroll') return
    jumpToPage(page, 'auto')
    // run only when switching mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleAddNote = () => {
    if (!noteText.trim()) return
    onAddNote?.({
      text: noteText.trim(),
      page,
    })
    setNoteText('')
  }

  const pageColumnWidth = Math.min(
    MAX_PAGE_WIDTH,
    Math.max(420, Math.round(containerWidth || MAX_PAGE_WIDTH))
  )
  const totalVirtualHeight = Math.max(layoutIndex.totalHeight || 0, scrollMetrics.height || 0)

  return (
    <ReaderDialogShell
      title={title || 'Untitled PDF'}
      eyebrow="Reader"
      onClose={() => onClose?.(page)}
      focusMode={focusMode}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      onToggleFocusMode={() => setFocusMode((prev) => !prev)}
      overlayClassName="pdf-reader-overlay kindle-reader"
      panelClassName={`pdf-reader-modal kindle-reader-shell ${focusMode ? 'focus-mode' : ''}`}
      headerClassName="pdf-reader-header kindle-reader-header"
      eyebrowClassName="pdf-reader-eyebrow"
      titleClassName="pdf-reader-title"
      sessionPanel={sessionPanel}
    >
        <div className="pdf-reader-toolbar kindle-reader-toolbar">
          <div className="pdf-reader-controls">
            <button
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => {
                const step = layout === 'spread' && mode === 'page' ? 2 : 1
                const nextPage = clampPage(page - step, pageCount)
                setPage(nextPage)
                jumpToPage(nextPage)
              }}
              disabled={page <= 1 || isRendering}
            >
              Prev
            </button>
            <span className="pdf-reader-page">
              Page {page} / {pageCount}
            </span>
            <button
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => {
                const step = layout === 'spread' && mode === 'page' ? 2 : 1
                const nextPage = clampPage(page + step, pageCount)
                setPage(nextPage)
                jumpToPage(nextPage)
              }}
              disabled={page >= pageCount || isRendering}
            >
              Next
            </button>
            <button
              className={`btn-secondary text-xs px-3 py-2 ${mode === 'scroll' ? 'active' : ''}`}
              onClick={() => setMode('scroll')}
            >
              Scroll
            </button>
            <button
              className={`btn-secondary text-xs px-3 py-2 ${mode === 'page' ? 'active' : ''}`}
              onClick={() => setMode('page')}
            >
              Page
            </button>
            <button
              className={`btn-secondary text-xs px-3 py-2 ${layout === 'single' ? 'active' : ''}`}
              onClick={() => setLayout('single')}
              disabled={mode !== 'page'}
            >
              Single
            </button>
            <button
              className={`btn-secondary text-xs px-3 py-2 ${layout === 'spread' ? 'active' : ''}`}
              onClick={() => setLayout('spread')}
              disabled={mode !== 'page'}
            >
              Spread
            </button>
          </div>
          {mode === 'page' && (
            <div className="pdf-reader-controls">
              <button
                className="btn-secondary text-xs px-3 py-2"
                onClick={() => setScale((prev) => Math.max(0.6, prev - 0.1))}
                disabled={isRendering}
              >
                -
              </button>
              <span className="pdf-reader-page">{Math.round(scale * 100)}%</span>
              <button
                className="btn-secondary text-xs px-3 py-2"
                onClick={() => setScale((prev) => Math.min(2.2, prev + 0.1))}
                disabled={isRendering}
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className={`kindle-reader-main ${sidebarOpen ? '' : 'sidebar-hidden'} ${focusMode ? 'focus-mode' : ''}`}>
          <div className="pdf-reader-body kindle-reader-body" ref={scrollContainerRef}>
            {loadError && (
              <div className="pdf-reader-loading">
                {loadError}
              </div>
            )}
            {!loadError && mode === 'page' ? (
              <div className={`pdf-reader-page-wrap ${layout === 'spread' ? 'spread' : ''}`}>
                <PdfPageCanvas
                  pdfDoc={pdfDoc}
                  pageNumber={page}
                  scale={scale}
                  outputScale={pageOutputScale}
                  enqueueRenderTask={enqueueRenderTask}
                  priority={0}
                  fixedHeight={layoutIndex.getPageHeight(page)}
                  pageRef={(node) => {
                    pageRefs.current[page - 1] = node
                  }}
                />
                {layout === 'spread' && page + 1 <= pageCount && (
                  <PdfPageCanvas
                    pdfDoc={pdfDoc}
                    pageNumber={page + 1}
                    scale={scale}
                    outputScale={pageOutputScale}
                    enqueueRenderTask={enqueueRenderTask}
                    priority={1}
                    fixedHeight={layoutIndex.getPageHeight(page + 1)}
                    pageRef={(node) => {
                      pageRefs.current[page] = node
                    }}
                  />
                )}
                {isRendering && <div className="pdf-reader-loading">Rendering...</div>}
              </div>
            ) : (
              <div
                className="pdf-reader-scroll"
                style={{
                  position: 'relative',
                  display: 'block',
                  width: '100%',
                  minHeight: `${totalVirtualHeight}px`,
                }}
              >
                {virtualWindow.pages.map((pageNumber) => {
                  const top = layoutIndex.getPageTop(pageNumber)
                  const fixedHeight = layoutIndex.getPageHeight(pageNumber)
                  const priority = Math.abs(pageNumber - page)
                  return (
                    <PdfPageCanvas
                      key={pageNumber}
                      absoluteTop={top}
                      pdfDoc={pdfDoc}
                      pageNumber={pageNumber}
                      scale={scrollScale}
                      outputScale={scrollOutputScale}
                      enqueueRenderTask={enqueueRenderTask}
                      priority={priority}
                      fixedHeight={fixedHeight}
                      pageWidth={pageColumnWidth}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {sidebarOpen && !focusMode && (
            <aside className="reader-sidebar">
              <div className="reader-sidebar-section">
                <div className="reader-sidebar-title">Notes</div>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Write a note about this page..."
                />
                <button className="btn-primary text-xs px-3 py-2" onClick={handleAddNote}>
                  Add Note
                </button>
                {relatedNotes.length > 0 && (
                  <div className="reader-sidebar-subsection">
                    <div className="reader-sidebar-meta">Related</div>
                    <div className="reader-sidebar-list">
                      {relatedNotes.map((note) => (
                        <button
                          key={`related-${note.id}`}
                          type="button"
                          className="reader-sidebar-item"
                          onClick={() => {
                            if (note.page) {
                              setPage(note.page)
                              jumpToPage(note.page)
                            }
                          }}
                        >
                          <div className="reader-sidebar-meta">Page {note.page || page}</div>
                          <div className="reader-sidebar-text">{note.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="reader-sidebar-list">
                  {notes.length === 0 && <div className="reader-sidebar-empty">No notes yet.</div>}
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className="reader-sidebar-item"
                      onClick={() => {
                        if (note.page) {
                          setPage(note.page)
                          jumpToPage(note.page)
                        }
                      }}
                    >
                      <div className="reader-sidebar-meta">Page {note.page || 1}</div>
                      <div className="reader-sidebar-text">{note.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}
          {focusMode && (
            <button
              type="button"
              className="focus-exit-button"
              onClick={() => setFocusMode(false)}
            >
              Exit Focus
            </button>
          )}
        </div>
    </ReaderDialogShell>
  )
}

function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  scale,
  outputScale = 1,
  enqueueRenderTask,
  priority = 0,
  fixedHeight = 1100,
  pageWidth = MAX_PAGE_WIDTH,
  absoluteTop = null,
  pageRef,
}) {
  const canvasRef = useRef(null)
  const [rendered, setRendered] = useState(false)
  const safeOutputScale = Number.isFinite(outputScale) && outputScale > 0 ? outputScale : 1

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let cancelled = false

    const renderPage = async () => {
      const pdfPage = await pdfDoc.getPage(pageNumber)
      if (cancelled) return
      const viewport = pdfPage.getViewport({ scale })
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext('2d')
      if (!context) return
      canvas.width = Math.max(1, Math.floor(viewport.width * safeOutputScale))
      canvas.height = Math.max(1, Math.floor(viewport.height * safeOutputScale))
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      context.setTransform(safeOutputScale, 0, 0, safeOutputScale, 0, 0)
      await pdfPage.render({ canvasContext: context, viewport }).promise
      if (!cancelled) setRendered(true)
    }

    setRendered(false)
    enqueueRenderTask({
      key: `pdf-${pageNumber}-${scale}-${safeOutputScale}`,
      priority,
      run: renderPage,
      cancelled: () => cancelled,
    })

    return () => {
      cancelled = true
    }
  }, [pdfDoc, pageNumber, scale, safeOutputScale, enqueueRenderTask])

  return (
    <div
      className="pdf-reader-page-wrap page-canvas"
      ref={pageRef}
      data-page={pageNumber}
      style={{
        ...(typeof absoluteTop === 'number'
          ? {
              position: 'absolute',
              top: `${absoluteTop}px`,
              left: 0,
              right: 0,
              zIndex: 0,
            }
          : {}),
        minHeight: `${fixedHeight}px`,
        maxWidth: `${pageWidth}px`,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <canvas ref={canvasRef} className={rendered ? 'is-rendered' : ''} />
      {!rendered && (
        <div
          className="pdf-page-placeholder"
          style={{ height: `${fixedHeight}px` }}
        />
      )}
    </div>
  )
}

export default PdfReaderModal
