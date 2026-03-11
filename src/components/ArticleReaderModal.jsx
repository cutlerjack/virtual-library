import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { buildArticleLocation, findRelatedNotes } from '../reader/readerCore'

function sanitizeHtml(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    doc.querySelectorAll('script,style,noscript').forEach((node) => node.remove())
    return doc.body?.innerHTML || ''
  } catch {
    return html
  }
}

function ArticleReaderModal({
  title,
  html,
  notes = [],
  onAddNote,
  onProgressChange,
  onLocationChange,
  onClose,
  initialScrollOffset = 0,
}) {
  const containerRef = useRef(null)
  const [noteText, setNoteText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(initialScrollOffset || 0)

  const content = useMemo(() => sanitizeHtml(html || ''), [html])
  const relatedNotes = useMemo(() => (
    findRelatedNotes(notes, buildArticleLocation(scrollOffset))
  ), [notes, scrollOffset])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = node
      const max = Math.max(1, scrollHeight - clientHeight)
      const percent = Math.min(100, Math.max(0, Math.round((scrollTop / max) * 100)))
      setScrollOffset(scrollTop)
      onLocationChange?.(buildArticleLocation(scrollTop))
      onProgressChange?.(percent)
    }
    node.addEventListener('scroll', handleScroll, { passive: true })
    return () => node.removeEventListener('scroll', handleScroll)
  }, [onProgressChange, onLocationChange])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTop = initialScrollOffset || 0
  }, [initialScrollOffset, content])

  const handleAddNote = () => {
    if (!noteText.trim()) return
    const scrollOffset = containerRef.current?.scrollTop || 0
    onAddNote?.({ text: noteText.trim(), scrollOffset })
    setNoteText('')
  }

  const handleNavigate = (note) => {
    if (typeof note.scrollOffset === 'number' && containerRef.current) {
      containerRef.current.scrollTop = note.scrollOffset
    }
  }

  return (
    <motion.div
      className="modal-overlay epub-reader-overlay kindle-reader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`epub-reader-modal kindle-reader-shell ${focusMode ? 'focus-mode' : ''}`}
        initial={{ scale: 0.98, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="epub-reader-header kindle-reader-header">
          <div>
            <div className="epub-reader-eyebrow">Article</div>
            <div className="epub-reader-title">{title || 'Untitled Article'}</div>
          </div>
          <div className="kindle-reader-actions">
            <button
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? 'Hide Notes' : 'Show Notes'}
            </button>
            <button
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => setFocusMode((prev) => !prev)}
            >
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </button>
            <button className="btn-secondary text-xs px-3 py-2" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className={`kindle-reader-main ${sidebarOpen ? '' : 'sidebar-hidden'} ${focusMode ? 'focus-mode' : ''}`}>
          <div className="epub-reader-body kindle-reader-body" ref={containerRef}>
            <article className="article-reader" dangerouslySetInnerHTML={{ __html: content }} />
          </div>

          {sidebarOpen && !focusMode && (
            <aside className="reader-sidebar">
              <div className="reader-sidebar-section">
                <div className="reader-sidebar-title">Notes</div>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Write a note about this article..."
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
      </motion.div>
    </motion.div>
  )
}

export default ArticleReaderModal
