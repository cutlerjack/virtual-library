import React from 'react'
import Bookshelf from '../../components/Bookshelf'

function BookPageContextShelf({
  contextBooks,
  activeBookId,
  onSelectBook,
  viewMode,
  onOpenDetails,
}) {
  if (contextBooks.length <= 1) return null

  return (
    <section className="book-page-context">
      <div className="book-page-context-header">
        <div>
          <div className="book-page-context-eyebrow">Shelf Context</div>
          <h2 className="book-page-context-title">Stay with the shelf while you work on a single volume.</h2>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onOpenDetails}
        >
          Edit Library Details
        </button>
      </div>
      <Bookshelf
        books={contextBooks}
        onSelectBook={onSelectBook}
        viewMode={viewMode}
        activeBookId={activeBookId}
      />
    </section>
  )
}

export default BookPageContextShelf
