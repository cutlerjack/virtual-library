import { useState } from 'react'
import { extractDominantColor } from '../../utils/colorExtract'
import { normalizeIsbn } from '../../utils/storage'

export default function ManualEntryMode({ onAddBook, onClose, initialTitle = '' }) {
  const [manualForm, setManualForm] = useState({
    title: initialTitle,
    author: '',
    coverUrl: '',
    isbn: '',
    pageCount: '',
  })

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    const spineColor = manualForm.coverUrl
      ? await extractDominantColor(manualForm.coverUrl)
      : null

    onAddBook({
      title: manualForm.title,
      author: manualForm.author,
      coverUrl: manualForm.coverUrl || null,
      isbn: manualForm.isbn ? normalizeIsbn(manualForm.isbn) : null,
      pageCount: manualForm.pageCount ? parseInt(manualForm.pageCount) : null,
      spineColor,
      shelfDetail: manualForm.author || '',
    })
  }

  return (
    <form onSubmit={handleManualSubmit} className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">Title</label>
        <input
          type="text"
          value={manualForm.title}
          onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">Author</label>
        <input
          type="text"
          value={manualForm.author}
          onChange={(e) => setManualForm(prev => ({ ...prev, author: e.target.value }))}
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">Cover Image URL</label>
        <input
          type="url"
          value={manualForm.coverUrl}
          onChange={(e) => setManualForm(prev => ({ ...prev, coverUrl: e.target.value }))}
          className="input-field"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">ISBN</label>
        <input
          type="text"
          value={manualForm.isbn}
          onChange={(e) => setManualForm(prev => ({ ...prev, isbn: normalizeIsbn(e.target.value) }))}
          className="input-field"
          placeholder="978..."
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">Page Count</label>
        <input
          type="number"
          value={manualForm.pageCount}
          onChange={(e) => setManualForm(prev => ({ ...prev, pageCount: e.target.value }))}
          className="input-field"
          min="1"
        />
      </div>

      <div className="flex justify-end gap-3 pt-3">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Add Book
        </button>
      </div>
    </form>
  )
}
