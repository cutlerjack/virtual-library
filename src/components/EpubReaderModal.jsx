import React, { useEffect, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'
import { buildEpubLocation, findRelatedNotes } from '../reader/readerCore'
import ReaderDialogShell from './ReaderDialogShell'

function EpubReaderModal({
  title,
  data,
  initialLocation,
  initialMode = 'scroll',
  initialLayout = 'single',
  initialFontSize = 100,
  onLocationChange,
  onProgressChange,
  onMetaChange,
  onCoverReady,
  onClose,
  notes = [],
  onAddNote,
  onNavigateTo,
  sessionPanel = null,
}) {
  const containerRef = useRef(null)
  const renditionRef = useRef(null)
  const [book, setBook] = useState(null)
  const [ready, setReady] = useState(false)
  const [fontSize, setFontSize] = useState(initialFontSize || 100)
  const [mode, setMode] = useState(initialMode || 'scroll')
  const [layout, setLayout] = useState(initialLayout || 'single')
  const [noteText, setNoteText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [currentCfi, setCurrentCfi] = useState(initialLocation || '')
  const relatedNotes = useMemo(() => (
    findRelatedNotes(notes, buildEpubLocation(currentCfi))
  ), [notes, currentCfi])

  useEffect(() => {
    if (!data) return undefined
    const buffer = data instanceof ArrayBuffer ? data : data.buffer
    const nextBook = ePub(buffer)
    setBook(nextBook)
    setReady(false)
    setCurrentCfi(initialLocation || '')
    setMode(initialMode || 'scroll')
    setLayout(initialLayout || 'single')
    setFontSize(initialFontSize || 100)
    return () => {
      nextBook.destroy()
    }
  }, [data, initialLocation, initialMode, initialLayout, initialFontSize])

  useEffect(() => {
    if (!book || !containerRef.current) return undefined
    const rendition = book.renderTo(containerRef.current, {
      width: '100%',
      height: '100%',
    })
    renditionRef.current = rendition
    const handleRelocated = (location) => {
      const cfi = location?.start?.cfi || ''
      setCurrentCfi(cfi)
      onLocationChange?.(cfi)
      if (book.locations && cfi) {
        const percent = Math.round(book.locations.percentageFromCfi(cfi) * 100)
        onProgressChange?.(Number.isFinite(percent) ? percent : 0)
      }
    }
    rendition.on('relocated', handleRelocated)
    let cancelled = false
    const prepare = async () => {
      try {
        await book.ready
        await book.locations.generate(1000)
        const coverUrl = await book.coverUrl()
        if (!cancelled && coverUrl) onCoverReady?.(coverUrl)
      } catch {
        // ignore metadata errors
      }
      try {
        await rendition.display(initialLocation || undefined)
        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) setReady(false)
      }
    }
    prepare()
    return () => {
      cancelled = true
      if (renditionRef.current === rendition) {
        renditionRef.current = null
      }
      if (typeof rendition.off === 'function') {
        rendition.off('relocated', handleRelocated)
      } else if (typeof rendition.removeListener === 'function') {
        rendition.removeListener('relocated', handleRelocated)
      }
      rendition.destroy()
    }
  }, [book, initialLocation, onLocationChange, onProgressChange, onCoverReady])

  useEffect(() => {
    if (!renditionRef.current) return
    renditionRef.current.themes.fontSize(`${fontSize}%`)
  }, [fontSize])

  useEffect(() => {
    if (!renditionRef.current) return
    renditionRef.current.flow(mode === 'scroll' ? 'scrolled' : 'paginated')
    renditionRef.current.spread(layout === 'spread' && mode === 'page' ? 'always' : 'none')
  }, [mode, layout])

  useEffect(() => {
    onMetaChange?.({ mode, layout, fontSize })
  }, [mode, layout, fontSize, onMetaChange])

  const handleAddNote = () => {
    if (!noteText.trim()) return
    onAddNote?.({ text: noteText.trim(), cfi: currentCfi || '' })
    setNoteText('')
  }

  const handleNavigate = (note) => {
    if (note?.cfi) {
      renditionRef.current?.display(note.cfi)
      onNavigateTo?.(note.cfi)
    }
  }

  return (
    <ReaderDialogShell
      title={title || 'Untitled EPUB'}
      eyebrow="Reader"
      onClose={onClose}
      focusMode={focusMode}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      onToggleFocusMode={() => setFocusMode((prev) => !prev)}
      overlayClassName="epub-reader-overlay kindle-reader"
      panelClassName={`epub-reader-modal kindle-reader-shell ${focusMode ? 'focus-mode' : ''}`}
      headerClassName="epub-reader-header kindle-reader-header"
      eyebrowClassName="epub-reader-eyebrow"
      titleClassName="epub-reader-title"
      sessionPanel={sessionPanel}
    >
        <div className="epub-reader-toolbar kindle-reader-toolbar">
          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => renditionRef.current?.prev()}
            disabled={!ready}
          >
            Prev
          </button>
          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => renditionRef.current?.next()}
            disabled={!ready}
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
          <div className="epub-reader-controls">
            <span>Text</span>
            <button
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => setFontSize((prev) => Math.max(80, prev - 10))}
              disabled={!ready}
            >
              −
            </button>
            <span>{fontSize}%</span>
            <button
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => setFontSize((prev) => Math.min(160, prev + 10))}
              disabled={!ready}
            >
              +
            </button>
          </div>
        </div>

        <div className={`kindle-reader-main ${sidebarOpen ? '' : 'sidebar-hidden'} ${focusMode ? 'focus-mode' : ''}`}>
          <div className="epub-reader-body kindle-reader-body">
            <div ref={containerRef} className="epub-reader-frame" />
            {!ready && <div className="epub-reader-loading">Loading…</div>}
          </div>

          {sidebarOpen && !focusMode && (
            <aside className="reader-sidebar">
              <div className="reader-sidebar-section">
                <div className="reader-sidebar-title">Notes</div>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Write a note about this section..."
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
                          onClick={() => handleNavigate(note)}
                        >
                          <div className="reader-sidebar-meta">Location</div>
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
                      onClick={() => handleNavigate(note)}
                    >
                      <div className="reader-sidebar-meta">Location</div>
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

export default EpubReaderModal
