import Bookshelf from '../../components/Bookshelf'
import ShelfTabs from '../../components/ShelfTabs'
import TagFilter from '../../components/TagFilter'
import RecommendationsPanel from '../../components/RecommendationsPanel'
import ExhibitShelf from '../../components/ExhibitShelf'
import TimelineShelf from '../../components/TimelineShelf'
import TodayPanel from '../../components/TodayPanel'
import MemoryResurface from '../../components/MemoryResurface'
import SpineLibraryPanel from '../../components/SpineLibraryPanel'
import AnnotationsHub from '../../components/AnnotationsHub'

function LibraryView({
  books,
  shelves,
  userData,
  activeShelf,
  setActiveShelf,
  selectedTags,
  setSelectedTags,
  sortedBooks,
  filteredBooks,
  allTags,
  sortMode,
  setSortMode,
  viewMode,
  setShowAddModal,
  showCustomizer,
  showDailyRitual,
  handleUpdateUserData,
  handleExportLibrary,
  spineLibraryEntries,
  handleUpdateSpineLibraryEntry,
  handleRemoveSpineLibraryEntry,
  handleLogPages,
  handleAddQuoteQuick,
  handleAddReflection,
  handleSelectBook,
  handleCreateExhibit,
  handleAddShelf,
  handleDeleteShelf,
  handleAddToExhibit,
  icons,
  booksFinishedThisYear,
  quoteCount,
  continueReadingDocs,
  handleReadDocument,
  setActiveView,
  shelfFontValue,
  nameplateText,
  showInsights,
  setShowInsights,
  annotations,
  onOpenAnnotation,
}) {
  return (
    <div>
      <section className="press-hero">
        <div>
          <div className="press-hero-eyebrow">Virtual Library</div>
          <h2 className="press-hero-title">Ideas for progress, shelved with care.</h2>
          <p className="press-hero-lede">
            Keep a living record of what you read, what you loved, and the notes that
            changed how you think.
          </p>
        </div>
        <div className="press-hero-metrics">
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{books.length}</div>
            <div className="press-hero-metric-label">Volumes</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{booksFinishedThisYear}</div>
            <div className="press-hero-metric-label">Finished {new Date().getFullYear()}</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{quoteCount}</div>
            <div className="press-hero-metric-label">Quotes Saved</div>
          </div>
        </div>
      </section>

      {continueReadingDocs.length > 0 && (
        <section className="continue-reading">
          <div className="continue-reading-header">
            <div>
              <div className="continue-reading-eyebrow">Continue Reading</div>
              <h3 className="continue-reading-title">Pick up where you left off.</h3>
            </div>
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => setActiveView('documents')}
            >
              View Reading Room
            </button>
          </div>
          <div className="continue-reading-grid">
            {continueReadingDocs.map((doc) => (
              <div key={doc.id} className="continue-reading-card">
                <div className="continue-reading-cover">
                  {doc.thumbnail ? (
                    <img src={doc.thumbnail} alt={doc.title} />
                  ) : (
                    <div className="continue-reading-placeholder">{doc.type.toUpperCase()}</div>
                  )}
                </div>
                <div className="continue-reading-card-title">{doc.title}</div>
                {doc.type === 'pdf' && doc.pageCount && (
                  <div className="continue-reading-progress">
                    <div className="continue-reading-progress-track">
                      <div
                        className="continue-reading-progress-fill"
                        style={{ width: `${Math.round(((doc.lastPage || 0) / doc.pageCount) * 100)}%` }}
                      />
                    </div>
                    <span>{Math.round(((doc.lastPage || 0) / doc.pageCount) * 100)}%</span>
                  </div>
                )}
                {typeof doc.progressPercent === 'number' && (doc.type === 'epub' || doc.type === 'article') && (
                  <div className="continue-reading-progress">
                    <div className="continue-reading-progress-track">
                      <div
                        className="continue-reading-progress-fill"
                        style={{ width: `${Math.round(doc.progressPercent)}%` }}
                      />
                    </div>
                    <span>{Math.round(doc.progressPercent)}%</span>
                  </div>
                )}
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => handleReadDocument(doc, { resume: true })}
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <AnnotationsHub annotations={annotations} onOpenAnnotation={onOpenAnnotation} />

      {showCustomizer && (
        <div>
          <div className="customizer-panel">
            <div>
              <label>
                Library Name
                <input
                  type="text"
                  value={userData.displayName || ''}
                  onChange={(e) => handleUpdateUserData({ displayName: e.target.value })}
                />
              </label>
              <label>
                Theme
                <select
                  value={userData.theme || 'classic'}
                  onChange={(e) => handleUpdateUserData({ theme: e.target.value })}
                >
                  <option value="classic">Classic</option>
                  <option value="scifi">Sci-Fi</option>
                </select>
              </label>
              <label>
                Lighting
                <select
                  value={userData.lightingPreset || 'golden'}
                  onChange={(e) => handleUpdateUserData({ lightingPreset: e.target.value })}
                >
                  <option value="golden">Golden Hour</option>
                  <option value="dawn">Dawn</option>
                  <option value="midnight">Midnight</option>
                </select>
              </label>
              <label>
                Wood Tone
                <select
                  value={userData.woodTone || 'walnut'}
                  onChange={(e) => handleUpdateUserData({ woodTone: e.target.value })}
                >
                  <option value="walnut">Walnut</option>
                  <option value="mahogany">Mahogany</option>
                  <option value="maple">Maple</option>
                </select>
              </label>
            </div>
            <div>
              <label>
                Placard Font
                <select
                  value={userData.shelfFont || 'cinzel'}
                  onChange={(e) => handleUpdateUserData({ shelfFont: e.target.value })}
                >
                  <option value="cinzel">Cinzel</option>
                  <option value="playfair">Playfair Display</option>
                  <option value="fell">IM Fell English</option>
                  <option value="baskerville">Libre Baskerville</option>
                </select>
              </label>
              <div style={{ marginTop: '16px' }}>
                <label>
                  Export Library
                  <button
                    type="button"
                    onClick={handleExportLibrary}
                    className="btn-secondary mt-2"
                  >
                    Export books + notes
                  </button>
                </label>
              </div>
            </div>
          </div>
          <SpineLibraryPanel
            entries={spineLibraryEntries}
            onUpdateEntry={handleUpdateSpineLibraryEntry}
            onRemoveEntry={handleRemoveSpineLibraryEntry}
          />
        </div>
      )}
      {showDailyRitual && (
        <TodayPanel
          books={books}
          streak={userData.readingStreak || { current: 0, best: 0 }}
          onLogPages={handleLogPages}
          onAddQuote={handleAddQuoteQuick}
          onAddReflection={handleAddReflection}
        />
      )}
      <div className="library-insights">
        <div className="library-insights-header">
          <div>
            <div className="library-insights-eyebrow">Insights</div>
            <div className="library-insights-title">Moments and patterns worth revisiting.</div>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => setShowInsights((prev) => !prev)}
          >
            {showInsights ? 'Hide' : 'Show'}
          </button>
        </div>
        {showInsights && (
          <div className="library-insights-body">
            <MemoryResurface
              books={books}
              onOpenBook={handleSelectBook}
            />
            <RecommendationsPanel books={books} />
            <TimelineShelf books={books} />
          </div>
        )}
      </div>

      <ExhibitShelf
        exhibits={userData.exhibits || []}
        books={books}
        onCreateExhibit={handleCreateExhibit}
        onSelectBook={handleSelectBook}
        shelfFont={shelfFontValue}
      />

      <ShelfTabs
        shelves={shelves}
        activeShelf={activeShelf}
        onSelectShelf={setActiveShelf}
        onAddShelf={handleAddShelf}
        onDeleteShelf={handleDeleteShelf}
      />

      <div className="flex gap-8 mt-8">
        {allTags.length > 0 && (
          <aside className="w-44 flex-shrink-0">
            <TagFilter
              tags={allTags}
              selectedTags={selectedTags}
              onToggleTag={(tag) => {
                setSelectedTags((prev) =>
                  prev.includes(tag)
                    ? prev.filter((t) => t !== tag)
                    : [...prev, tag]
                )
              }}
              onClearTags={() => setSelectedTags([])}
            />
          </aside>
        )}

        <main className="flex-1 min-w-0">
          {filteredBooks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {books.length === 0 ? icons.library : icons.book}
              </div>
              <h2 className="heading-display">
                {books.length === 0 ? 'Your library awaits' : 'No matches found'}
              </h2>
              <p>
                {books.length === 0
                  ? 'Begin your collection by adding books you\'ve read, want to read, or simply love.'
                  : 'Try adjusting your shelf or tag filters to find what you\'re looking for.'}
              </p>
              {books.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  Add Your First Book
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bookshelf-controls">
                <div className="bookshelf-title">Arrangement</div>
                <div className="bookshelf-presets">
                  {[
                    { id: 'recent', label: 'Recent' },
                    { id: 'title', label: 'Title' },
                    { id: 'genre', label: 'Genre' },
                    { id: 'color', label: 'Color' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSortMode(option.id)}
                      className={`bookshelf-preset ${sortMode === option.id ? 'active' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <Bookshelf
                books={sortedBooks}
                onSelectBook={handleSelectBook}
                viewMode={viewMode}
                nameplateText={nameplateText}
              />
            </>
          )}
        </main>
      </div>

      {books.length > 0 && (
        <div className="text-center mt-8 text-sm text-muted">
          {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
          {activeShelf !== 'all' || selectedTags.length > 0 ? ' shown' : ' in your library'}
        </div>
      )}
    </div>
  )
}

export default LibraryView
