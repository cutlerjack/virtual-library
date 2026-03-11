import { useMemo } from 'react'
import { findSpineInLibraryMap } from '../../utils/storage'

export default function SpineStylePanel({ book, onUpdate, onApplyFontToAll, spineLibrary, onSaveSpineToLibrary }) {
  const spineMatch = useMemo(() => findSpineInLibraryMap(spineLibrary || {}, book.isbn), [spineLibrary, book.isbn])

  const handleSpineImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) return
      onUpdate({ ...book, spineImage: result, spineSource: 'photo' })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveSpineImage = () => {
    onUpdate({ ...book, spineImage: null, spineSource: 'texture', spineCrop: null })
  }

  const handleApplyLibrarySpine = () => {
    if (!spineMatch?.spineImage) return
    onUpdate({
      ...book,
      spineImage: spineMatch.spineImage,
      spineSource: 'photo',
      spineCrop: spineMatch.crop || null,
    })
  }

  const handleSaveSpineToLibrary = () => {
    if (!book.isbn || !book.spineImage) return
    onSaveSpineToLibrary?.({
      isbn: book.isbn,
      spineImage: book.spineImage,
      crop: book.spineCrop || null,
      title: book.title,
      author: book.author,
    })
  }

  return (
    <div className="mb-4">
      <label className="text-xs uppercase tracking-wider text-muted block mb-2">Spine Style</label>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Color</span>
          <input
            type="color"
            value={book.spineColor || '#654321'}
            onChange={(e) => onUpdate({ ...book, spineColor: e.target.value })}
            className="h-8 w-12 rounded-md border border-white/10 bg-transparent"
            aria-label="Spine color"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Texture</span>
          <select
            value={book.spineTexture || 'leather'}
            onChange={(e) => onUpdate({ ...book, spineTexture: e.target.value })}
            className="input-field text-sm py-1.5"
          >
            <option value="leather">Leather</option>
            <option value="paper">Paper</option>
            <option value="newsprint">Newsprint</option>
            <option value="smooth">Smooth</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Source</span>
          <select
            value={book.spineSource || (book.spineImage ? 'photo' : 'texture')}
            onChange={(e) => onUpdate({ ...book, spineSource: e.target.value })}
            className="input-field text-sm py-1.5"
          >
            <option value="texture">Textured</option>
            <option value="photo">Photographic</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Font</span>
          <select
            value={book.spineFont || 'garamond'}
            onChange={(e) => onUpdate({ ...book, spineFont: e.target.value })}
            className="input-field text-sm py-1.5"
          >
            <option value="garamond">Cormorant Garamond</option>
            <option value="cinzel">Cinzel</option>
            <option value="playfair">Playfair Display</option>
            <option value="fell">IM Fell English</option>
            <option value="baskerville">Libre Baskerville</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => onApplyFontToAll?.(book.spineFont || 'garamond')}
          className="btn-secondary text-xs px-3 py-2"
        >
          Apply font to all
        </button>
      </div>
      <div className="mt-3 flex items-end gap-3 flex-wrap">
        <label className="text-sm text-muted">
          Spine Image
          <input
            type="file"
            accept="image/*"
            onChange={handleSpineImageUpload}
            className="input-field text-sm py-2 mt-2"
          />
        </label>
        {book.spineImage && (
          <button
            type="button"
            onClick={handleRemoveSpineImage}
            className="btn-secondary text-xs px-3 py-2"
          >
            Remove spine image
          </button>
        )}
        <span className="text-xs text-muted">Tip: use a tall, cropped spine photo.</span>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleApplyLibrarySpine}
          className="btn-secondary text-xs px-3 py-2"
          disabled={!spineMatch?.spineImage}
        >
          Apply from library
        </button>
        <button
          type="button"
          onClick={handleSaveSpineToLibrary}
          className="btn-secondary text-xs px-3 py-2"
          disabled={!book.isbn || !book.spineImage}
        >
          Save to library
        </button>
        <span className="text-xs text-muted">
          {book.isbn
            ? spineMatch?.spineImage
              ? 'Library match found for this ISBN.'
              : 'No spine saved for this ISBN yet.'
            : 'Add an ISBN to enable spine lookup.'}
        </span>
      </div>
    </div>
  )
}
