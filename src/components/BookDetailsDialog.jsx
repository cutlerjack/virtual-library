import React, { useEffect, useMemo, useState } from 'react'
import DialogShell from './DialogShell'
import { normalizeIsbn } from '../utils/storage'

function createDraft(book) {
  return {
    title: book?.title || '',
    author: book?.author || '',
    isbn: book?.isbn || '',
    pageCount: book?.pageCount || '',
    publishedDate: book?.publishedDate || '',
    shelfDetail: book?.shelfDetail || '',
    coverUrl: book?.coverUrl || '',
    shelves: book?.shelves || [],
    tags: book?.tags || [],
  }
}

function BookDetailsDialog({
  open,
  book,
  shelves,
  allTags,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => createDraft(book))
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(createDraft(book))
    setNewTag('')
  }, [book, open])

  const availableTags = useMemo(() => (
    (allTags || []).filter((tag) => !(draft.tags || []).includes(tag))
  ), [allTags, draft.tags])

  if (!book) return null

  const handleShelfToggle = (shelfId) => {
    setDraft((prev) => ({
      ...prev,
      shelves: prev.shelves.includes(shelfId)
        ? prev.shelves.filter((id) => id !== shelfId)
        : [...prev.shelves, shelfId],
    }))
  }

  const handleAddTag = () => {
    const nextTag = newTag.trim()
    if (!nextTag || draft.tags.includes(nextTag)) return
    setDraft((prev) => ({
      ...prev,
      tags: [...prev.tags, nextTag],
    }))
    setNewTag('')
  }

  const handleRemoveTag = (tag) => {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.filter((entry) => entry !== tag),
    }))
  }

  const handleSave = () => {
    onSave?.({
      id: book.id,
      title: draft.title.trim() || book.title,
      author: draft.author.trim() || book.author,
      isbn: normalizeIsbn(draft.isbn),
      pageCount: draft.pageCount ? Number(draft.pageCount) : null,
      publishedDate: draft.publishedDate.trim() || null,
      shelfDetail: draft.shelfDetail.trim(),
      coverUrl: draft.coverUrl.trim() || null,
      shelves: draft.shelves,
      tags: draft.tags,
      lastTouched: new Date().toISOString(),
    })
    onClose?.()
  }

  return (
    <DialogShell
      open={open}
      title={`Edit ${book.title}`}
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save Details
          </button>
        </>
      )}
    >
      <div className="book-details-grid">
        <label className="book-page-field">
          Title
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="input-field"
          />
        </label>
        <label className="book-page-field">
          Author
          <input
            type="text"
            value={draft.author}
            onChange={(event) => setDraft((prev) => ({ ...prev, author: event.target.value }))}
            className="input-field"
          />
        </label>
        <label className="book-page-field">
          ISBN
          <input
            type="text"
            value={draft.isbn}
            onChange={(event) => setDraft((prev) => ({ ...prev, isbn: event.target.value }))}
            className="input-field"
            placeholder="978..."
          />
        </label>
        <label className="book-page-field">
          Page Count
          <input
            type="number"
            min="1"
            value={draft.pageCount}
            onChange={(event) => setDraft((prev) => ({ ...prev, pageCount: event.target.value }))}
            className="input-field"
            placeholder="320"
          />
        </label>
        <label className="book-page-field">
          Published
          <input
            type="text"
            value={draft.publishedDate}
            onChange={(event) => setDraft((prev) => ({ ...prev, publishedDate: event.target.value }))}
            className="input-field"
            placeholder="Year or date"
          />
        </label>
        <label className="book-page-field">
          Shelf Detail
          <input
            type="text"
            value={draft.shelfDetail}
            onChange={(event) => setDraft((prev) => ({ ...prev, shelfDetail: event.target.value }))}
            className="input-field"
            placeholder="Short label under the cover"
          />
        </label>
      </div>

      <label className="book-page-field">
        Cover Image URL
        <input
          type="url"
          value={draft.coverUrl}
          onChange={(event) => setDraft((prev) => ({ ...prev, coverUrl: event.target.value }))}
          className="input-field"
          placeholder="https://example.com/cover.jpg"
        />
      </label>

      <div className="book-details-section">
        <div className="book-details-label">Shelves</div>
        <div className="book-details-choice-row">
          {shelves.filter((shelf) => shelf.id !== 'all').map((shelf) => (
            <button
              key={shelf.id}
              type="button"
              onClick={() => handleShelfToggle(shelf.id)}
              className={`book-details-choice ${draft.shelves.includes(shelf.id) ? 'active' : ''}`}
            >
              {shelf.name}
            </button>
          ))}
        </div>
      </div>

      <div className="book-details-section">
        <div className="book-details-label">Tags</div>
        <div className="book-details-tags">
          {draft.tags.length > 0 ? (
            draft.tags.map((tag) => (
              <span key={tag} className="tag-chip group">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="book-details-empty">No tags yet.</span>
          )}
        </div>
        <div className="book-details-tag-input">
          <input
            type="text"
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddTag()
              }
            }}
            list="book-details-tag-suggestions"
            className="input-field"
            placeholder="Add a tag"
          />
          <datalist id="book-details-tag-suggestions">
            {availableTags.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
          <button type="button" className="btn-secondary" onClick={handleAddTag}>
            Add Tag
          </button>
        </div>
      </div>
    </DialogShell>
  )
}

export default BookDetailsDialog
