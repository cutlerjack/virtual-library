import { useState, useEffect, useMemo } from 'react'
import { extractDominantColor, getRandomSpineColor } from '../utils/colorExtract'
import { getCoverWidth, getSpineWidth } from '../utils/bookDimensions'

/**
 * 3D Book Component
 *
 * Structure: A book standing upright showing its spine.
 * On hover: The book tilts toward the viewer and the front cover opens slightly,
 * revealing the cover image like pulling a book off a shelf.
 *
 * Based on CSS-Tricks and Codrops 3D book tutorials.
 */
function BookSpine({ book, onClick, viewMode = 'spine' }) {
  const [spineColor, setSpineColor] = useState(book.spineColor || null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const spineTexture = book.spineTexture || 'leather'
  const spineSource = book.spineSource === 'photo' && book.spineImage ? 'photo' : 'texture'
  const spineFont = resolveSpineFont(book.spineFont)
  const spineImage = book.spineImage || null
  const spineCrop = book.spineCrop || null
  const variance = getBookVariance(book)
  const isRecentlyTouched = isRecent(book.lastTouched)

  useEffect(() => {
    if (!spineColor) {
      if (book.coverUrl) {
        extractDominantColor(book.coverUrl).then(setSpineColor)
      } else {
        setSpineColor(getRandomSpineColor())
      }
    }
  }, [book.coverUrl, spineColor])

  // Dimensions
  const pageCount = book.pageCount || 250
  const thickness = getSpineWidth(pageCount)
  const height = 200 + variance.heightShift
  const coverWidth = getCoverWidth(pageCount)
  const slotWidth = viewMode === 'front' ? coverWidth : thickness

  const colors = useMemo(() => {
    const base = spineColor || '#654321'
    return {
      spine: base,
      spineDark: adjustBrightness(base, -25),
      spineLight: adjustBrightness(base, 20),
      pages: '#f5f0e6',
      pagesDark: '#e8e0d0',
    }
  }, [spineColor])

  return (
    <div
      className={`book-wrapper texture-${spineTexture} spine-${spineSource} view-${viewMode} ${isRecentlyTouched ? 'is-recent' : ''}`}
      style={{
        '--book-thickness': `${thickness}px`,
        '--book-height': `${height}px`,
        '--book-depth': `${coverWidth}px`,
        '--book-slot-width': `${slotWidth}px`,
        '--book-tilt-z': `${variance.tiltZ}deg`,
        '--book-sheen': variance.sheen,
        '--book-wear': Math.min(book.wearLevel || 0, 1),
        '--book-spine': colors.spine,
        '--book-spine-dark': colors.spineDark,
        '--book-spine-light': colors.spineLight,
        '--book-pages': colors.pages,
        '--book-pages-dark': colors.pagesDark,
        '--book-text': getContrastColor(colors.spine),
        '--book-font': spineFont,
        '--spine-photo': spineImage ? `url("${spineImage}")` : 'none',
        '--spine-zoom': spineCrop?.zoom || 1,
        '--spine-offset-x': `${spineCrop?.offsetX || 0}%`,
        '--spine-offset-y': `${spineCrop?.offsetY || 0}%`,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className={`book-scene ${isHovered ? 'is-hovered' : ''}`}>
        <div className="book-spine">
          <div className="book-spine-line book-spine-line-top" />
          <div className="book-spine-line book-spine-line-bottom" />

          <div className="book-spine-text">
            <div
              className="book-spine-title"
              style={{ fontSize: thickness > 38 ? 12 : 11 }}
            >
              {truncate(book.title, thickness > 40 ? 32 : 26)}
            </div>
          </div>
        </div>

        <div className="book-cover">
          <div className="book-cover-face">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt=""
                className={`book-cover-image ${imageLoaded ? 'is-loaded' : ''}`}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <div className="book-cover-fallback">
                <div className="book-cover-title">{book.title}</div>
                <div className="book-cover-author">{book.author}</div>
              </div>
            )}

            <div className="book-cover-spine-shadow" />

            {book.rating > 0 && (
              <div className="book-cover-rating">
                {[1, 2, 3, 4, 5].map(star => {
                  const value = book.rating / 2
                  const fill = value - (star - 1)
                  const className = fill >= 1 ? 'is-lit' : fill >= 0.5 ? 'is-half' : ''
                  return (
                    <span key={star} className={className}>
                      ★
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <div className="book-cover-inner" />
          <div className="book-cover-edge" />
        </div>

        <div className="book-pages">
          <div className="book-pages-texture" />
        </div>

        <div className="book-back" />
        <div className="book-top-edge" />
      </div>
    </div>
  )
}

function adjustBrightness(color, amount) {
  if (!color) return '#654321'

  let r, g, b

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    r = parseInt(hex.substr(0, 2), 16)
    g = parseInt(hex.substr(2, 2), 16)
    b = parseInt(hex.substr(4, 2), 16)
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match) [r, g, b] = match.map(Number)
  } else {
    return color
  }

  r = Math.max(0, Math.min(255, r + amount))
  g = Math.max(0, Math.min(255, g + amount))
  b = Math.max(0, Math.min(255, b + amount))

  return `rgb(${r}, ${g}, ${b})`
}

function getContrastColor(color) {
  if (!color) return '#f5f0e1'

  let r, g, b

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    r = parseInt(hex.substr(0, 2), 16)
    g = parseInt(hex.substr(2, 2), 16)
    b = parseInt(hex.substr(4, 2), 16)
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match) [r, g, b] = match.map(Number)
  } else {
    return '#f5f0e1'
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1a1a' : '#f5f0e1'
}

function truncate(text, maxLength) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text
}

function resolveSpineFont(fontKey) {
  switch (fontKey) {
    case 'cinzel':
      return "'Cinzel', serif"
    case 'playfair':
      return "'Playfair Display', serif"
    case 'fell':
      return "'IM Fell English', serif"
    case 'baskerville':
      return "'Libre Baskerville', serif"
    case 'garamond':
    default:
      return "'Cormorant Garamond', serif"
  }
}

function getBookVariance(book) {
  const seed = hashCode(`${book.id || ''}${book.title || ''}${book.author || ''}`)
  const rand = seededRandom(seed)
  return {
    tiltZ: (rand() - 0.5) * 1.8,
    heightShift: Math.round((rand() - 0.3) * 10),
    sheen: 0.18 + rand() * 0.35,
  }
}

function hashCode(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return hash
}

function seededRandom(seed) {
  let t = seed + 0x6d2b79f5
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function isRecent(lastTouched) {
  if (!lastTouched) return false
  const touched = new Date(lastTouched)
  if (Number.isNaN(touched.getTime())) return false
  const days = (Date.now() - touched.getTime()) / (1000 * 60 * 60 * 24)
  return days <= 5
}

export default BookSpine
