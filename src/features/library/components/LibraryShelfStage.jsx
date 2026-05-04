import React from 'react'
import Bookshelf from '../../../components/Bookshelf'
import ShelfTabs from '../../../components/ShelfTabs'
import TagFilter from '../../../components/TagFilter'

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recent' },
  { id: 'title', label: 'Title' },
  { id: 'genre', label: 'Genre' },
  { id: 'color', label: 'Color' },
]

function LibraryShelfStage({
  books,
  shelves,
  filteredBooks,
  sortedBooks,
  allTags,
  activeShelf,
  selectedTags,
  sortMode,
  viewMode,
  nameplateText,
  icons,
  onRequestAddBook,
  onSelectBook,
  onSelectShelf,
  onAddShelf,
  onDeleteShelf,
  onToggleTag,
  onClearTags,
  onSelectSortMode,
}) {
  const hasActiveFilters = activeShelf !== 'all' || selectedTags.length > 0

  return (
    <section className="library-stage">
      <div className="library-stage-header">
        <div>
          <div className="library-stage-eyebrow">Bookshelf First</div>
          <h3 className="library-stage-title">Browse the shelf first, then open a single volume when you want depth.</h3>
        </div>
        <button type="button" className="btn-primary" onClick={onRequestAddBook}>
          Add to Library
        </button>
      </div>

      <ShelfTabs
        shelves={shelves}
        activeShelf={activeShelf}
        onSelectShelf={onSelectShelf}
        onAddShelf={onAddShelf}
        onDeleteShelf={onDeleteShelf}
      />

      <div className="library-stage-body">
        {allTags.length > 0 && (
          <aside className="library-stage-sidebar">
            <TagFilter
              tags={allTags}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
              onClearTags={onClearTags}
            />
          </aside>
        )}

        <main className="library-stage-main">
          {filteredBooks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {books.length === 0 ? icons.library : icons.book}
              </div>
              <h2 className="heading-display">
                {books.length === 0 ? 'Build the shelf from here' : 'No matches found'}
              </h2>
              <p className="max-w-xl mx-auto">
                {books.length === 0
                  ? 'Search a title, paste a reading list, or add something by hand. Articles and desktop imports live in the same add flow.'
                  : 'These filters are hiding everything right now. Try another shelf or clear the current tags to bring books back.'}
              </p>
              {books.length === 0 ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full border border-[#201819]/10 bg-white/70 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                    Search
                  </span>
                  <span className="rounded-full border border-[#201819]/10 bg-white/70 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                    Bulk import
                  </span>
                  <span className="rounded-full border border-[#201819]/10 bg-white/70 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                    Manual entry
                  </span>
                </div>
              ) : hasActiveFilters ? (
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {activeShelf !== 'all' && (
                    <button type="button" onClick={() => onSelectShelf('all')} className="btn-secondary">
                      Show all shelves
                    </button>
                  )}
                  {selectedTags.length > 0 && (
                    <button type="button" onClick={onClearTags} className="btn-secondary">
                      Clear tags
                    </button>
                  )}
                </div>
              ) : null}
              {books.length === 0 && (
                <button
                  type="button"
                  onClick={onRequestAddBook}
                  className="btn-primary"
                >
                  Add Your First Volume
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bookshelf-controls">
                <div className="bookshelf-title">Arrangement</div>
                <div className="bookshelf-presets">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onSelectSortMode(option.id)}
                      className={`bookshelf-preset ${sortMode === option.id ? 'active' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <Bookshelf
                books={sortedBooks}
                onSelectBook={onSelectBook}
                viewMode={viewMode}
                nameplateText={nameplateText}
                spotlightBookId={viewMode === 'spine' && sortedBooks.length <= 3 ? sortedBooks[0]?.id : null}
              />
            </>
          )}
        </main>
      </div>

      {books.length > 0 && (
        <div className="library-stage-count">
          {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
          {hasActiveFilters ? ' shown' : ' in your library'}
        </div>
      )}
    </section>
  )
}

export default LibraryShelfStage
