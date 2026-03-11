import { useState } from 'react'
import { motion } from 'framer-motion'

function StarRating({ rating, onRate, size = 'md', readonly = false }) {
  const [hoverRating, setHoverRating] = useState(null)

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const displayRating = hoverRating ?? rating
  const starValue = displayRating / 2

  return (
    <div
      className={`flex gap-1 ${readonly ? '' : 'cursor-pointer'}`}
      onMouseLeave={() => !readonly && setHoverRating(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          className={`${sizeClasses[size]} transition-colors focus:outline-none disabled:cursor-default`}
          disabled={readonly}
          onMouseMove={(event) => {
            if (readonly) return
            const rect = event.currentTarget.getBoundingClientRect()
            const isHalf = event.clientX - rect.left < rect.width / 2
            setHoverRating(star * 2 - (isHalf ? 1 : 0))
          }}
          onClick={(event) => {
            if (readonly) return
            const rect = event.currentTarget.getBoundingClientRect()
            const isHalf = event.clientX - rect.left < rect.width / 2
            onRate?.(star * 2 - (isHalf ? 1 : 0))
          }}
          whileHover={readonly ? {} : { scale: 1.2 }}
          whileTap={readonly ? {} : { scale: 0.9 }}
        >
          {renderStar(star, starValue, readonly)}
        </motion.button>
      ))}
      {!readonly && rating > 0 && (
        <button
          type="button"
          onClick={() => onRate?.(0)}
          className="ml-2 text-sm text-wood-400 hover:text-wood-300 transition-colors"
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

  return <span className="text-wood-600">★</span>
}

export default StarRating
