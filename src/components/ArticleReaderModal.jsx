import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildArticleLocation, findRelatedNotes } from '../reader/readerCore'
import { prepareCapturedHtml } from '../utils/htmlSanitizer'
import ReaderDialogShell from './ReaderDialogShell'

function ArticleReaderModal({
  title,
  html,
  plainText,
  quarantined = false,
  notes = [],
  onAddNote,
  onProgressChange,
  onLocationChange,
  onClose,
  initialScrollOffset = 0,
  sessionPanel = null,
}) {
  const containerRef = useRef(null)
  const [noteText, setNoteText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(initialScrollOffset || 0)
  const readerContent = useMemo(() => {
    if (!html || quarantined) {
      return {
        html: '',
        plainText: plainText || '',
        quarantined: Boolean(quarantined),
      }
    }

    const prepared = prepareCapturedHtml(html)
    return {
      html: prepared.sanitizedHtml || '',
      plainText: prepared.plainText || plainText || '',
      quarantined: prepared.quarantined,
    }
  }, [html, plainText, quarantined])
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
  }, [initialScrollOffset, html, plainText])

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
    <ReaderDialogShell
      title={title || 'Untitled Article'}
      eyebrow="Article"
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
      banner={readerContent.quarantined ? (
        <div className="reader-security-banner" role="status">
          This article was quarantined during import. Showing plaintext only to keep the reader safe.
        </div>
      ) : null}
    >
        <div className={`kindle-reader-main ${sidebarOpen ? '' : 'sidebar-hidden'} ${focusMode ? 'focus-mode' : ''}`}>
          <div className="epub-reader-body kindle-reader-body" ref={containerRef}>
            {readerContent.html && !readerContent.quarantined ? (
              <article className="article-reader" dangerouslySetInnerHTML={{ __html: readerContent.html }} />
            ) : (
              <article className="article-reader article-reader-plaintext">
                {(readerContent.plainText || 'No readable text was available for this article.')
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                  ))}
              </article>
            )}
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
    </ReaderDialogShell>
  )
}

export default ArticleReaderModal
