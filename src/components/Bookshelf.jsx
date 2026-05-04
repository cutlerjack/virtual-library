import React, { useEffect, useMemo, useRef, useState } from 'react'
import BookSpine from './BookSpine'
import { getCoverWidth, getSpineWidth } from '../utils/bookDimensions'

function Bookshelf({
  books,
  onSelectBook,
  viewMode = 'spine',
  nameplateText,
  activeBookId = null,
  spotlightBookId = null,
}) {
  const [previewBookId, setPreviewBookId] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return undefined

    const updateWidth = (nextWidth) => {
      const rounded = Math.max(320, Math.floor(nextWidth))
      setContainerWidth((current) => (current === rounded ? current : rounded))
    }

    updateWidth(node.getBoundingClientRect().width || node.clientWidth || 0)

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => {
        updateWidth(node.getBoundingClientRect().width || node.clientWidth || 0)
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || node.getBoundingClientRect().width || 0
      updateWidth(width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Group books into shelf rows
  const shelves = useMemo(() => {
    const rows = []
    let currentRow = []
    let currentWidth = 0
    const previewAllowance = viewMode === 'front' ? 0 : 108
    const availableWidth = containerWidth > 0 ? containerWidth : 750
    const maxWidth = Math.max(320, availableWidth - previewAllowance - 24)

    books.forEach((book) => {
      const slotWidth = getShelfSlotWidth(book, viewMode)

      if (currentWidth + slotWidth > maxWidth && currentRow.length > 0) {
        rows.push(currentRow)
        currentRow = []
        currentWidth = 0
      }

      currentRow.push(book)
      currentWidth += slotWidth + 8
    })

    if (currentRow.length > 0) {
      rows.push(currentRow)
    }

    return rows
  }, [books, viewMode])

  const resolvedPreviewBookId = previewBookId || activeBookId || spotlightBookId

  return (
    <div ref={containerRef} className="bookshelf-container">
      {shelves.map((shelfBooks, shelfIndex) => (
        <div
          key={shelfIndex}
          className="shelf-unit animate-slide-up"
          style={{ animationDelay: `${shelfIndex * 0.1}s` }}
        >
          {/* Back panel of shelf */}
          <div className="shelf-back-panel" />

          {/* Books on shelf */}
          <div className="books-row">
            {shelfBooks.map((book, bookIndex) => {
              const isPreviewed = resolvedPreviewBookId === book.id
              const slotWidth = getShelfSlotWidth(book, viewMode, isPreviewed)

              return (
                <div
                  className={`book-slot ${isPreviewed ? 'is-previewed' : ''}`}
                  key={book.id}
                  style={{
                    '--book-slot-width': `${slotWidth}px`,
                    '--book-caption-width': `${Math.max(140, slotWidth)}px`,
                  }}
                >
                  <BookSpine
                    book={book}
                    index={bookIndex}
                    viewMode={viewMode}
                    isActive={activeBookId === book.id}
                    isPreviewed={isPreviewed}
                    slotWidth={slotWidth}
                    onPreviewStart={() => setPreviewBookId(book.id)}
                    onPreviewEnd={() => {
                      setPreviewBookId((currentBookId) => (
                        currentBookId === book.id ? null : currentBookId
                      ))
                    }}
                    onClick={() => onSelectBook(book)}
                  />
                  {viewMode === 'front' && (
                    <div className="book-caption">
                      {book.shelfDetail || book.author || book.title}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Wooden shelf */}
          <div className="shelf-wood" />

          {/* Shadow below shelf */}
          <div className="shelf-shadow" />

          {nameplateText && shelfIndex === shelves.length - 1 && (
            <div className="shelf-nameplate">
              <span>{nameplateText}</span>
            </div>
          )}
        </div>
      ))}

      {/* Decorative bottom */}
      {shelves.length > 0 && (
        <div className="divider">
          <div className="divider-line" />
          <div className="divider-ornament" />
          <div className="divider-line" />
        </div>
      )}
    </div>
  )
}

function getShelfSlotWidth(book, viewMode, isPreviewed = false) {
  const pageCount = book.pageCount || 250
  const spineWidth = getSpineWidth(pageCount)

  if (viewMode === 'front') {
    return getCoverWidth(pageCount)
  }

  if (!isPreviewed) {
    return spineWidth
  }

  const coverWidth = getCoverWidth(pageCount)
  const visibleCoverWidth = Math.max(58, Math.round(coverWidth * 0.8))
  return spineWidth + visibleCoverWidth
}

export default Bookshelf
