import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import StarRating from './StarRating'
import { normalizeIsbn } from '../utils/storage'
import SpineStylePanel from './book-modal/SpineStylePanel'
import QuotesTab from './book-modal/QuotesTab'
import MemoriesTab from './book-modal/MemoriesTab'

const Icons = {
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
}

function BookModal({
  book,
  shelves,
  allTags,
  onClose,
  onUpdate,
  onDelete,
  onApplyFontToAll,
  exhibits = [],
  onAddToExhibit,
  spineLibrary,
  onSaveSpineToLibrary,
}) {
  const [activeTab, setActiveTab] = useState('details')
  const [newTag, setNewTag] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedExhibit, setSelectedExhibit] = useState(exhibits[0]?.id || '')

  const handleRatingChange = (rating) => {
    onUpdate({ ...book, rating })
  }

  const handleShelfToggle = (shelfId) => {
    const currentShelves = book.shelves || []
    const newShelves = currentShelves.includes(shelfId)
      ? currentShelves.filter(id => id !== shelfId)
      : [...currentShelves, shelfId]
    onUpdate({ ...book, shelves: newShelves })
  }

  const handleAddTag = () => {
    if (newTag.trim() && !book.tags?.includes(newTag.trim())) {
      onUpdate({ ...book, tags: [...(book.tags || []), newTag.trim()] })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag) => {
    onUpdate({ ...book, tags: book.tags.filter(t => t !== tag) })
  }

  const handleNotesChange = (notes) => {
    onUpdate({ ...book, notes })
  }

  useEffect(() => {
    if (!selectedExhibit && exhibits.length > 0) {
      setSelectedExhibit(exhibits[0].id)
    }
  }, [exhibits, selectedExhibit])

  const handleDateChange = (field, value) => {
    onUpdate({ ...book, [field]: value || null })
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content w-full max-w-2xl relative"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#201819]/5 transition-colors text-muted hover:text-[#201819] z-10"
        >
          <span className="w-5 h-5">{Icons.close}</span>
        </button>

        {/* Book Header */}
        <div className="flex gap-6 p-6 pb-4">
          {/* Cover */}
          <div className="flex-shrink-0">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt=""
                className="w-28 h-40 object-cover rounded-lg"
                style={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)' }}
              />
            ) : (
              <div
                className="w-28 h-40 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: book.spineColor || '#654321',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                }}
              >
                <span className="w-10 h-10 text-white/40">{Icons.book}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="mb-2">
              <label className="text-xs uppercase tracking-wider text-muted block mb-2">Title</label>
              <input
                type="text"
                value={book.title || ''}
                onChange={(e) => onUpdate({ ...book, title: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="Book title"
              />
            </div>
            <div className="mb-2">
              <label className="text-xs uppercase tracking-wider text-muted block mb-2">ISBN</label>
              <input
                type="text"
                value={book.isbn || ''}
                onChange={(e) => onUpdate({ ...book, isbn: normalizeIsbn(e.target.value) })}
                className="input-field text-sm py-2"
                placeholder="978..."
              />
            </div>
            <p className="text-muted text-lg mb-4">{book.author}</p>

            {/* Rating */}
            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider text-muted block mb-2">Your Rating</label>
              <StarRating rating={book.rating} onRate={handleRatingChange} size="lg" />
            </div>

            <SpineStylePanel
              book={book}
              onUpdate={onUpdate}
              onApplyFontToAll={onApplyFontToAll}
              spineLibrary={spineLibrary}
              onSaveSpineToLibrary={onSaveSpineToLibrary}
            />

            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider text-muted block mb-2">Book Display</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-muted">
                  Shelf Detail
                  <input
                    type="text"
                    value={book.shelfDetail || ''}
                    onChange={(e) => onUpdate({ ...book, shelfDetail: e.target.value })}
                    className="input-field text-sm py-2 mt-2"
                    placeholder="Short label under the cover"
                  />
                </label>
                <label className="text-sm text-muted">
                  Cover Image URL
                  <input
                    type="url"
                    value={book.coverUrl || ''}
                    onChange={(e) => onUpdate({ ...book, coverUrl: e.target.value })}
                    className="input-field text-sm py-2 mt-2"
                    placeholder="https://example.com/cover.jpg"
                  />
                </label>
              </div>
            </div>

            {exhibits.length > 0 && (
              <div className="mb-4">
                <label className="text-xs uppercase tracking-wider text-muted block mb-2">Exhibits</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={selectedExhibit}
                    onChange={(e) => setSelectedExhibit(e.target.value)}
                    className="input-field text-sm py-1.5"
                  >
                    {exhibits.map(exhibit => (
                      <option key={exhibit.id} value={exhibit.id}>{exhibit.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => selectedExhibit && onAddToExhibit?.(book.id, selectedExhibit)}
                    className="btn-secondary text-xs px-3 py-2"
                  >
                    Add to Exhibit
                  </button>
                </div>
              </div>
            )}

            {/* Reading Dates */}
            <div className="flex gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted block mb-1.5">Started</label>
                <input
                  type="date"
                  value={book.dateStarted || ''}
                  onChange={(e) => handleDateChange('dateStarted', e.target.value)}
                  className="input-field text-sm py-1.5 w-32"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted block mb-1.5">Finished</label>
                <input
                  type="date"
                  value={book.dateFinished || ''}
                  onChange={(e) => handleDateChange('dateFinished', e.target.value)}
                  className="input-field text-sm py-1.5 w-32"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shelves */}
        <div className="px-6 py-4 border-t border-[#201819]/10">
          <label className="text-xs uppercase tracking-wider text-muted block mb-3">Shelves</label>
          <div className="flex flex-wrap gap-2">
                {shelves.filter(s => s.id !== 'all').map(shelf => (
              <button
                key={shelf.id}
                onClick={() => handleShelfToggle(shelf.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                  book.shelves?.includes(shelf.id)
                    ? 'bg-[#201819] text-[#f6f1e9] font-medium'
                    : 'bg-white text-muted hover:bg-[#201819]/5 border border-[#201819]/10'
                }`}
              >
                {shelf.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="px-6 py-4 border-t border-[#201819]/10">
          <label className="text-xs uppercase tracking-wider text-muted block mb-3">Tags</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {book.tags?.map(tag => (
              <span key={tag} className="tag-chip group">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
            {(!book.tags || book.tags.length === 0) && (
              <span className="text-sm text-muted italic">No tags added</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Add a tag..."
              className="input-field text-sm py-2 flex-1"
              list="tag-suggestions"
            />
            <datalist id="tag-suggestions">
              {allTags.filter(t => !book.tags?.includes(t)).map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <button onClick={handleAddTag} className="btn-secondary text-sm py-2">
              Add
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-b border-[#201819]/10">
          {['details', 'notes', 'quotes', 'memories'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-[#201819] border-b-2 border-[#201819] -mb-px'
                  : 'text-muted hover:text-[#201819]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {book.dateFinished && (!book.memories || book.memories.length === 0) && (
          <div className="memory-prompt">
            <div>
              <div className="memory-prompt-title">Capture a memory</div>
              <div className="memory-prompt-text">Add a moment or reflection tied to this finish.</div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => setActiveTab('memories')}
            >
              Add Memory
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 min-h-[180px]">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-muted">
                  Pages
                  <input
                    type="number"
                    min="1"
                    value={book.pageCount || ''}
                    onChange={(e) => onUpdate({ ...book, pageCount: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="input-field text-sm py-2 mt-2"
                    placeholder="e.g. 320"
                  />
                </label>
                <label className="text-sm text-muted">
                  ISBN
                  <input
                    type="text"
                    value={book.isbn || ''}
                    onChange={(e) => onUpdate({ ...book, isbn: normalizeIsbn(e.target.value) })}
                    className="input-field text-sm py-2 mt-2"
                    placeholder="ISBN"
                  />
                </label>
                <label className="text-sm text-muted">
                  Published
                  <input
                    type="text"
                    value={book.publishedDate || ''}
                    onChange={(e) => onUpdate({ ...book, publishedDate: e.target.value })}
                    className="input-field text-sm py-2 mt-2"
                    placeholder="Year or date"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Your Notes</h3>
              <textarea
                value={book.notes || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Write your thoughts about this book..."
                className="input-field h-36 resize-none"
              />
            </div>
          )}

          {activeTab === 'quotes' && (
            <QuotesTab book={book} onUpdate={onUpdate} />
          )}

          {activeTab === 'memories' && (
            <MemoriesTab book={book} onUpdate={onUpdate} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-[#201819]/10">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-red-400/70 hover:text-red-400 transition-colors"
          >
            Remove from Library
          </button>
          <div className="text-xs text-muted">
            Added {new Date(book.addedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 rounded-xl max-w-sm mx-4"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #f4ede2 100%)',
                border: '1px solid rgba(32, 24, 25, 0.1)',
              }}
            >
              <h3 className="heading-display text-lg mb-2 text-[#201819]">Remove this book?</h3>
              <p className="text-muted text-sm mb-5">
                "{book.title}" will be permanently removed from your library.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(book.id)
                    setShowDeleteConfirm(false)
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default BookModal
