import React, { useEffect, useRef, useState } from 'react'
import { normalizeCoverUrl } from '../../utils/coverImages'
import { normalizeIsbn } from '../../utils/storage'
import { extractAddBookSpineColor } from './coverColor'

export default function ManualEntryMode({ onAddBook, onClose, initialTitle = '' }) {
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const mountedRef = useRef(true)
  const [manualForm, setManualForm] = useState({
    title: initialTitle,
    author: '',
    coverUrl: '',
    isbn: '',
    pageCount: '',
  })

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    const coverUrl = normalizeCoverUrl(manualForm.coverUrl, { preferLarge: true })
    try {
      const spineColor = coverUrl
        ? await extractAddBookSpineColor(coverUrl)
        : null

      await Promise.resolve(onAddBook({
        title: manualForm.title,
        author: manualForm.author,
        coverUrl,
        isbn: manualForm.isbn ? normalizeIsbn(manualForm.isbn) : null,
        pageCount: manualForm.pageCount ? parseInt(manualForm.pageCount) : null,
        spineColor,
        shelfDetail: manualForm.author || '',
      }))
    } finally {
      submittingRef.current = false
      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
  }

  return (
    <form onSubmit={handleManualSubmit} className="space-y-4">
      <div className="rounded-xl border border-[#201819]/10 bg-white/70 p-3 text-sm text-muted">
        Use manual entry for obscure titles, local files, or anything search misses.
      </div>

      <div>
        <label htmlFor="manual-book-title" className="block text-xs uppercase tracking-wider text-muted mb-2">
          Book title
        </label>
        <input
          id="manual-book-title"
          type="text"
          value={manualForm.title}
          onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="manual-book-author" className="block text-xs uppercase tracking-wider text-muted mb-2">
          Author
        </label>
        <input
          id="manual-book-author"
          type="text"
          value={manualForm.author}
          onChange={(e) => setManualForm(prev => ({ ...prev, author: e.target.value }))}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="manual-book-cover-url" className="block text-xs uppercase tracking-wider text-muted mb-2">
          Cover URL
        </label>
        <input
          id="manual-book-cover-url"
          type="url"
          value={manualForm.coverUrl}
          onChange={(e) => setManualForm(prev => ({ ...prev, coverUrl: e.target.value }))}
          className="input-field"
          placeholder="https://..."
        />
      </div>

      <div>
        <label htmlFor="manual-book-isbn" className="block text-xs uppercase tracking-wider text-muted mb-2">
          ISBN
        </label>
        <input
          id="manual-book-isbn"
          type="text"
          value={manualForm.isbn}
          onChange={(e) => setManualForm(prev => ({ ...prev, isbn: normalizeIsbn(e.target.value) }))}
          className="input-field"
          placeholder="978..."
        />
      </div>

      <div>
        <label htmlFor="manual-book-page-count" className="block text-xs uppercase tracking-wider text-muted mb-2">
          Pages
        </label>
        <input
          id="manual-book-page-count"
          type="number"
          value={manualForm.pageCount}
          onChange={(e) => setManualForm(prev => ({ ...prev, pageCount: e.target.value }))}
          className="input-field"
          min="1"
        />
      </div>

      <div className="flex justify-end gap-3 pt-3">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Book'}
        </button>
      </div>
    </form>
  )
}
