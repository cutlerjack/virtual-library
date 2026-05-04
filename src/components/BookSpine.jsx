import React, { useState, useEffect, useMemo } from 'react'
import BookCoverArt from './BookCoverArt'
import { extractDominantColor, getRandomSpineColor } from '../utils/colorExtract'
import { getCoverWidth, getSpineWidth } from '../utils/bookDimensions'
import { adjustBrightness, getContrastColor } from '../utils/colorStyles'

/**
 * 3D Book Component
 *
 * Structure: A book standing upright showing its spine.
 * On hover: The book pulls slightly clear of the row and the front cover opens
 * into the space reserved by the shelf, so it still reads like a book.
 *
 * Based on CSS-Tricks and Codrops 3D book tutorials.
 */
function BookSpine({
  book,
  onClick,
  viewMode = 'spine',
  isActive = false,
  isPreviewed = false,
  slotWidth = null,
  onPreviewStart,
  onPreviewEnd,
}) {
  const [spineColor, setSpineColor] = useState(book.spineColor || null)
  const [isHovered, setIsHovered] = useState(false)
  const spineTexture = book.spineTexture || 'leather'
  const spineSource = book.spineSource === 'photo' && book.spineImage ? 'photo' : 'texture'
  const spineFont = resolveSpineFont(book.spineFont)
  const spineImage = book.spineImage || null
  const spineCrop = book.spineCrop || null
  const variance = getBookVariance(book)
  const isRecentlyTouched = isRecent(book.lastTouched)

  useEffect(() => {
    let cancelled = false
    if (!spineColor) {
      if (book.coverUrl) {
        extractDominantColor(book.coverUrl)
          .then((color) => {
            if (!cancelled) setSpineColor(color)
          })
          .catch((error) => {
            console.warn('[book-spine] Unable to extract cover color:', error?.message || error)
            if (!cancelled) setSpineColor(getRandomSpineColor())
          })
      } else {
        setSpineColor(getRandomSpineColor())
      }
    }
    return () => {
      cancelled = true
    }
  }, [book.coverUrl, spineColor])

  // Dimensions
  const pageCount = book.pageCount || 250
  const thickness = getSpineWidth(pageCount)
  const height = 200 + variance.heightShift
  const coverWidth = getCoverWidth(pageCount)
  const resolvedSlotWidth = slotWidth || (viewMode === 'front' ? coverWidth : thickness)
  const isExpanded = viewMode === 'front' || isHovered || isPreviewed

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
      className={`book-wrapper texture-${spineTexture} spine-${spineSource} view-${viewMode} ${isRecentlyTouched ? 'is-recent' : ''} ${isActive ? 'is-active' : ''}`}
      style={{
        '--book-thickness': `${thickness}px`,
        '--book-height': `${height}px`,
        '--book-depth': `${coverWidth}px`,
        '--book-slot-width': `${resolvedSlotWidth}px`,
        '--book-spine-title-size': `${isExpanded ? (thickness > 38 ? 13 : 12) : (thickness > 38 ? 12 : 11)}px`,
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
      role="button"
      tabIndex={0}
      aria-label={`Open ${book.title}`}
      aria-current={isActive ? 'page' : undefined}
      aria-expanded={viewMode === 'front' ? undefined : isExpanded}
      onMouseEnter={() => {
        setIsHovered(true)
        onPreviewStart?.()
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        onPreviewEnd?.()
      }}
      onFocus={() => {
        setIsHovered(true)
        onPreviewStart?.()
      }}
      onBlur={() => {
        setIsHovered(false)
        onPreviewEnd?.()
      }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className={`book-scene ${isExpanded ? 'is-expanded' : ''} ${isHovered ? 'is-hovered' : ''}`}>
        <div className="book-spine">
          <div className="book-spine-line book-spine-line-top" />
          <div className="book-spine-line book-spine-line-bottom" />

          <div className="book-spine-text">
            <div className="book-spine-title">
              {truncate(book.title, thickness > 40 ? 32 : 26)}
            </div>
          </div>
        </div>

        <div className="book-front-block">
          <div className="book-pages">
            <div className="book-pages-texture" />
          </div>

          <div className="book-cover">
            <div className="book-cover-face">
              <BookCoverArt
                book={book}
                alt=""
                variant="shelf"
                accentColor={colors.spine}
              />
              <div className="book-cover-spine-shadow" />
            </div>

            <div className="book-cover-inner" />
            <div className="book-cover-edge" />
          </div>
        </div>

        <div className="book-back" />
        <div className="book-top-edge" />
      </div>
    </div>
  )
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
    tiltZ: (rand() - 0.5) * 0.9,
    heightShift: Math.round((rand() - 0.45) * 6),
    sheen: 0.16 + rand() * 0.22,
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
