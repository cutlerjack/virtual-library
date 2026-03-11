import BookSpine from './BookSpine'

function ExhibitShelf({ exhibits, books, onCreateExhibit, onSelectBook, shelfFont }) {
  return (
    <section className="exhibit-section">
      <div className="exhibit-header">
        <div className="exhibit-title">Exhibits</div>
        <button className="btn-secondary text-xs" onClick={onCreateExhibit}>
          New Exhibit
        </button>
      </div>
      <div className="exhibit-grid">
        {exhibits.length === 0 ? (
          <div className="exhibit-empty">Create an exhibit to curate a special collection.</div>
        ) : (
          exhibits.map((exhibit) => {
            const exhibitBooks = books.filter((book) => exhibit.bookIds?.includes(book.id))
            return (
              <div key={exhibit.id} className="exhibit-card" style={{ '--placard-font': shelfFont }}>
                <div className="exhibit-placard">
                  <div className="placard-label">Exhibit</div>
                  <div className="placard-title">{exhibit.name}</div>
                  {exhibit.description && <div className="placard-subtitle">{exhibit.description}</div>}
                </div>
                <div className="exhibit-books">
                  {exhibitBooks.length === 0 ? (
                    <div className="exhibit-empty-books">Add books to this exhibit.</div>
                  ) : (
                    exhibitBooks.slice(0, 6).map((book) => (
                      <BookSpine
                        key={book.id}
                        book={book}
                        viewMode="front"
                        onClick={() => onSelectBook(book)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export default ExhibitShelf
