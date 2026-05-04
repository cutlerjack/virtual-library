import React, { useMemo, useRef, useState, useEffect } from 'react'

const DEFAULT_CROP = { zoom: 1, offsetX: 0, offsetY: 0 }

function SpineLibraryPanel({ entries, onUpdateEntry, onRemoveEntry }) {
  const [activeEntry, setActiveEntry] = useState(null)
  const [crop, setCrop] = useState(DEFAULT_CROP)
  const [isSaving, setIsSaving] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const [offsetBounds, setOffsetBounds] = useState({ x: 30, y: 30 })
  const previewRef = useRef(null)
  const dragState = useRef(null)

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }, [entries])

  const openCrop = (entry) => {
    setActiveEntry(entry)
    setCrop({ ...DEFAULT_CROP, ...(entry.crop || {}) })
    setImageSize({ width: 0, height: 0 })
  }

  const closeCrop = () => {
    setActiveEntry(null)
    setCrop(DEFAULT_CROP)
    setIsSaving(false)
    setDragging(false)
    dragState.current = null
  }

  useEffect(() => {
    if (!activeEntry || !previewRef.current || !imageSize.width || !imageSize.height) return
    const rect = previewRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const baseScale = Math.max(rect.width / imageSize.width, rect.height / imageSize.height)
    const scaledWidth = imageSize.width * baseScale * (crop.zoom || 1)
    const scaledHeight = imageSize.height * baseScale * (crop.zoom || 1)
    const maxOffsetX = Math.max(0, (scaledWidth - rect.width) / 2)
    const maxOffsetY = Math.max(0, (scaledHeight - rect.height) / 2)
    const bounds = {
      x: (maxOffsetX / rect.width) * 100,
      y: (maxOffsetY / rect.height) * 100,
    }
    setOffsetBounds(bounds)
    setCrop((prev) => clampCrop(prev, bounds))
  }, [activeEntry, imageSize, crop.zoom])

  const handlePointerDown = (event) => {
    if (!previewRef.current) return
    event.preventDefault()
    const rect = previewRef.current.getBoundingClientRect()
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: crop.offsetX || 0,
      startOffsetY: crop.offsetY || 0,
      width: rect.width,
      height: rect.height,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!dragState.current) return
    const { startX, startY, startOffsetX, startOffsetY, width, height } = dragState.current
    const nextOffsetX = startOffsetX + ((event.clientX - startX) / width) * 100
    const nextOffsetY = startOffsetY + ((event.clientY - startY) / height) * 100
    setCrop((prev) => clampCrop({ ...prev, offsetX: nextOffsetX, offsetY: nextOffsetY }, offsetBounds))
  }

  const handlePointerUp = (event) => {
    if (!dragState.current) return
    dragState.current = null
    setDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleSaveCrop = async () => {
    if (!activeEntry?.spineImage) return
    setIsSaving(true)
    const clamped = clampCrop(crop, offsetBounds)
    const cropped = await generateCroppedImage(activeEntry.spineImage, clamped)
    onUpdateEntry(activeEntry.isbn, cropped, clamped)
    setIsSaving(false)
    closeCrop()
  }

  return (
    <div className="spine-library-panel">
      <div className="spine-library-header">
        <div>
          <div className="spine-library-eyebrow">Spine Library</div>
          <div className="spine-library-title">Saved ISBN Spines</div>
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="spine-library-empty">No saved spines yet.</div>
      ) : (
        <div className="spine-library-grid">
          {sortedEntries.map((entry) => (
            <div key={entry.isbn} className="spine-library-card">
              <div className="spine-library-preview">
                <img src={entry.spineImage} alt="" />
              </div>
              <div className="spine-library-meta">
                <div className="spine-library-book">{entry.title || 'Untitled'}</div>
                <div className="spine-library-author">{entry.author || 'Unknown author'}</div>
                <div className="spine-library-isbn">ISBN {entry.isbn}</div>
              </div>
              <div className="spine-library-actions">
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => openCrop(entry)}
                >
                  Crop
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => onRemoveEntry(entry.isbn)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeEntry && (
        <div className="spine-crop-overlay">
          <div className="spine-crop-panel">
            <div className="spine-crop-header">
              <div>
                <div className="spine-library-eyebrow">Crop Spine</div>
                <div className="spine-library-title">{activeEntry.title || 'Untitled'}</div>
              </div>
              <button type="button" onClick={closeCrop} className="btn-secondary text-xs px-3 py-2">
                Close
              </button>
            </div>
            <div className="spine-crop-body">
              <div
                className={`spine-crop-preview ${dragging ? 'is-dragging' : ''}`}
                ref={previewRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <img
                  src={activeEntry.spineImage}
                  alt=""
                  onLoad={(event) => {
                    const img = event.currentTarget
                    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                  }}
                  style={{
                    transform: `translate(calc(-50% + ${crop.offsetX}%), calc(-50% + ${crop.offsetY}%)) scale(${crop.zoom})`,
                  }}
                />
              </div>
              <div className="spine-crop-controls">
                <label>
                  Zoom
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.05"
                    value={crop.zoom}
                    onChange={(e) => setCrop((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                  />
                </label>
                <label>
                  Horizontal
                  <input
                    type="range"
                    min={-offsetBounds.x}
                    max={offsetBounds.x}
                    step="1"
                    value={crop.offsetX}
                    onChange={(e) => setCrop((prev) => ({ ...prev, offsetX: parseFloat(e.target.value) }))}
                  />
                </label>
                <label>
                  Vertical
                  <input
                    type="range"
                    min={-offsetBounds.y}
                    max={offsetBounds.y}
                    step="1"
                    value={crop.offsetY}
                    onChange={(e) => setCrop((prev) => ({ ...prev, offsetY: parseFloat(e.target.value) }))}
                  />
                </label>
                <div className="spine-crop-actions">
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => setCrop(DEFAULT_CROP)}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="btn-primary text-xs px-3 py-2"
                    onClick={handleSaveCrop}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Crop'}
                  </button>
                </div>
                <div className="spine-crop-note">Drag the image to position it. Crop is saved to the spine library and applied to matching ISBNs.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function clampCrop(crop, bounds) {
  const clamp = (value, max) => Math.max(-max, Math.min(max, value))
  return {
    ...crop,
    offsetX: clamp(crop.offsetX || 0, bounds.x || 0),
    offsetY: clamp(crop.offsetY || 0, bounds.y || 0),
  }
}

async function generateCroppedImage(imageUrl, crop) {
  const targetWidth = 240
  const targetHeight = 720
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageUrl
  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return imageUrl

  const baseScale = Math.max(targetWidth / img.width, targetHeight / img.height)
  const scale = baseScale * (crop.zoom || 1)
  const drawWidth = img.width * scale
  const drawHeight = img.height * scale
  const maxOffsetX = Math.max(0, (drawWidth - targetWidth) / 2)
  const maxOffsetY = Math.max(0, (drawHeight - targetHeight) / 2)
  const bounds = {
    x: (maxOffsetX / targetWidth) * 100,
    y: (maxOffsetY / targetHeight) * 100,
  }
  const safeCrop = clampCrop(crop, bounds)
  const offsetX = (safeCrop.offsetX || 0) * 0.01 * targetWidth
  const offsetY = (safeCrop.offsetY || 0) * 0.01 * targetHeight
  const drawX = (targetWidth - drawWidth) / 2 + offsetX
  const drawY = (targetHeight - drawHeight) / 2 + offsetY

  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

  return canvas.toDataURL('image/jpeg', 0.92)
}

export default SpineLibraryPanel
