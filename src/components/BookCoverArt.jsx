import React, { useMemo, useState } from 'react'
import { adjustBrightness, getContrastColor } from '../utils/colorStyles'
import { pickBestCoverUrl } from '../utils/coverImages'

function BookCoverArt({
  book,
  alt = '',
  className = '',
  variant = 'page',
  accentColor = null,
  showRating = false,
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const coverUrl = pickBestCoverUrl(book?.largeCoverUrl, book?.coverUrl)

  const palette = useMemo(() => {
    const base = accentColor || book?.spineColor || '#6f5037'
    return {
      base,
      dark: adjustBrightness(base, -28),
      light: adjustBrightness(base, 24),
      text: getContrastColor(base),
    }
  }, [accentColor, book?.spineColor])

  return (
    <div
      className={`book-art book-art-${variant} ${className}`.trim()}
      style={{
        '--cover-accent': palette.base,
        '--cover-accent-dark': palette.dark,
        '--cover-accent-light': palette.light,
        '--cover-text': palette.text,
      }}
    >
      {coverUrl ? (
        <>
          <div className="book-art-print">
            <img
              src={coverUrl}
              alt={alt}
              className={`book-art-image ${imageLoaded ? 'is-loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
          <div className="book-art-gloss" />
        </>
      ) : (
        <div className="book-art-fallback">
          <div className="book-art-kicker">
            {book?.publishedDate ? String(book.publishedDate).slice(0, 4) : 'Library Edition'}
          </div>
          <div className="book-art-title">{book?.title || 'Untitled'}</div>
          {book?.author && <div className="book-art-author">{book.author}</div>}
        </div>
      )}

      {showRating && book?.rating > 0 && (
        <div className="book-art-rating">
          {[1, 2, 3, 4, 5].map((star) => {
            const value = book.rating / 2
            const fill = value - (star - 1)
            const starClassName = fill >= 1 ? 'is-lit' : fill >= 0.5 ? 'is-half' : ''
            return (
              <span key={star} className={starClassName}>
                ★
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BookCoverArt
