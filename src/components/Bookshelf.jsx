import { useMemo } from 'react'
import BookSpine from './BookSpine'
import { getCoverWidth, getSpineWidth } from '../utils/bookDimensions'

function Bookshelf({ books, onSelectBook, viewMode = 'spine', nameplateText }) {
  // Group books into shelf rows
  const shelves = useMemo(() => {
    const rows = []
    let currentRow = []
    let currentWidth = 0
    const maxWidth = 750

    books.forEach((book) => {
      const pageCount = book.pageCount || 250
      const spineWidth = viewMode === 'front'
        ? getCoverWidth(pageCount)
        : getSpineWidth(pageCount)

      if (currentWidth + spineWidth > maxWidth && currentRow.length > 0) {
        rows.push(currentRow)
        currentRow = []
        currentWidth = 0
      }

      currentRow.push(book)
      currentWidth += spineWidth + 3
    })

    if (currentRow.length > 0) {
      rows.push(currentRow)
    }

    return rows
  }, [books, viewMode])

  return (
    <div className="bookshelf-container">
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
            {shelfBooks.map((book, bookIndex) => (
              <div className="book-slot" key={book.id}>
                <BookSpine
                  book={book}
                  index={bookIndex}
                  viewMode={viewMode}
                  onClick={() => onSelectBook(book)}
                />
                {viewMode === 'front' && (
                  <div className="book-caption">
                    {book.shelfDetail || book.author || book.title}
                  </div>
                )}
              </div>
            ))}
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

export default Bookshelf
