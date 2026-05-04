import React, { useState } from 'react'
import { motion } from 'framer-motion'

function clampRating(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(10, Math.round(numeric)))
}

function formatRatingText(value) {
  const normalized = clampRating(value)
  if (normalized <= 0) return 'No rating'
  return `${(normalized / 2).toFixed(normalized % 2 === 0 ? 0 : 1)} out of 5 stars`
}

function resolvePointerRating(event, star) {
  const rect = event.currentTarget.getBoundingClientRect()
  const isHalf = event.clientX - rect.left < rect.width / 2
  return star * 2 - (isHalf ? 1 : 0)
}

function StarRating({ rating, onRate, size = 'md', readonly = false }) {
  const [hoverRating, setHoverRating] = useState(null)

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const normalizedRating = clampRating(rating)
  const displayRating = hoverRating ?? normalizedRating
  const starValue = displayRating / 2

  const handleKeyboardInput = (event) => {
    if (readonly) return

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      onRate?.(clampRating(normalizedRating + 1))
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      onRate?.(clampRating(normalizedRating - 1))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      onRate?.(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      onRate?.(10)
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || event.key.toLowerCase() === 'c') {
      event.preventDefault()
      onRate?.(0)
    }
  }

  return (
    <div className="star-rating-control">
      <div
        className={`flex gap-1 ${readonly ? '' : 'cursor-pointer'}`}
        onMouseLeave={() => !readonly && setHoverRating(null)}
        onKeyDown={handleKeyboardInput}
        role={readonly ? 'img' : 'slider'}
        tabIndex={readonly ? -1 : 0}
        aria-label={readonly ? `Rating: ${formatRatingText(normalizedRating)}` : 'Book rating'}
        aria-readonly={readonly || undefined}
        aria-valuemin={readonly ? undefined : 0}
        aria-valuemax={readonly ? undefined : 10}
        aria-valuenow={readonly ? undefined : normalizedRating}
        aria-valuetext={formatRatingText(displayRating)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.span
            key={star}
            className={`${sizeClasses[size]} transition-colors ${readonly ? '' : 'focus:outline-none'}`}
            onMouseMove={(event) => {
              if (readonly) return
              setHoverRating(resolvePointerRating(event, star))
            }}
            onClick={(event) => {
              if (readonly) return
              onRate?.(resolvePointerRating(event, star))
            }}
            whileHover={readonly ? {} : { scale: 1.2 }}
            whileTap={readonly ? {} : { scale: 0.95 }}
            aria-hidden="true"
          >
            {renderStar(star, starValue, readonly)}
          </motion.span>
        ))}
      </div>
      {!readonly && normalizedRating > 0 && (
        <button
          type="button"
          onClick={() => onRate?.(0)}
          className="ml-2 text-sm text-wood-400 hover:text-wood-300 transition-colors"
          aria-label="Clear rating"
        >
          Clear
        </button>
      )}
    </div>
  )
}

function renderStar(star, value, readonly) {
  const fill = value - (star - 1)
  if (fill >= 1) {
    return (
      <span
        className={`
          text-amber-warm
          ${!readonly ? 'drop-shadow-[0_0_4px_rgba(255,191,0,0.5)]' : ''}
        `}
      >
        ★
      </span>
    )
  }

  if (fill >= 0.5) {
    return (
      <span
        className={`${!readonly ? 'drop-shadow-[0_0_4px_rgba(255,191,0,0.35)]' : ''}`}
        style={{
          background: 'linear-gradient(90deg, #f3c15c 50%, rgba(88, 71, 51, 0.6) 50%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ★
      </span>
    )
  }

  return <span className="text-wood-400" data-rating-state="empty">☆</span>
}

export default StarRating
