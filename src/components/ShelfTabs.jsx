import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function ShelfTabs({ shelves, activeShelf, onSelectShelf, onAddShelf, onDeleteShelf }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const [menuOpenFor, setMenuOpenFor] = useState(null)

  const handleAddShelf = (e) => {
    e.preventDefault()
    if (newShelfName.trim()) {
      onAddShelf(newShelfName.trim())
      setNewShelfName('')
      setShowAddForm(false)
    }
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2" aria-label="Shelf tabs">
      <div className="shelf-tabs flex-shrink-0" role="tablist" aria-label="Library shelves">
        {shelves.map((shelf) => (
          <div key={shelf.id} className="relative">
            <button
              type="button"
              role="tab"
              aria-selected={activeShelf === shelf.id}
              onClick={() => onSelectShelf(shelf.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                if (shelf.id !== 'all') setMenuOpenFor(shelf.id)
              }}
              aria-haspopup={shelf.id === 'all' ? undefined : 'menu'}
              aria-expanded={menuOpenFor === shelf.id}
              className={`shelf-tab ${activeShelf === shelf.id ? 'active' : ''}`}
            >
              {shelf.name}
            </button>

            {/* Context Menu */}
            <AnimatePresence>
              {menuOpenFor === shelf.id && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpenFor(null)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 z-50 overflow-hidden rounded-lg"
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #f4ede2 100%)',
                      border: '1px solid rgba(32, 24, 25, 0.12)',
                      boxShadow: '0 12px 30px rgba(32, 24, 25, 0.2)',
                    }}
                  >
                    <button
                      onClick={() => {
                        onDeleteShelf(shelf.id)
                        setMenuOpenFor(null)
                      }}
                      className="px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 w-full text-left transition-colors"
                    >
                      Delete Shelf
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Add Shelf */}
      {showAddForm ? (
        <form onSubmit={handleAddShelf} className="flex items-end gap-2 flex-shrink-0" aria-label="Create a new shelf">
          <div className="grid gap-1">
            <label htmlFor="new-shelf-name" className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">
              Shelf name
            </label>
            <input
              id="new-shelf-name"
              type="text"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="Favorites"
              className="input-field text-sm py-2 w-36"
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary text-sm py-2">
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false)
              setNewShelfName('')
            }}
            className="btn-secondary text-sm py-2"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[#201819] transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Shelf
        </button>
      )}
    </div>
  )
}

export default ShelfTabs
