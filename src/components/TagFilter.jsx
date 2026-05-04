import React from 'react'
import { motion } from 'framer-motion'

function TagFilter({ tags, selectedTags, onToggleTag, onClearTags }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="filter-sidebar"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="filter-title">Filter by Tag</h3>
        {selectedTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="text-xs text-muted hover:text-[#201819] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-1">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`
                w-full text-left px-3 py-2 rounded text-sm transition-all duration-200
                ${isSelected
                  ? 'bg-[#201819] text-[#f6f1e9] border border-[#201819]'
                  : 'text-[#201819]/60 hover:text-[#201819] hover:bg-white border border-transparent'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isSelected ? 'bg-[#f6f1e9]' : 'bg-[#201819]/30'
                  }`}
                />
                {tag}
              </span>
            </button>
          )
        })}
      </div>

      {tags.length === 0 && (
        <p className="text-sm text-muted italic">No tags yet</p>
      )}
    </motion.div>
  )
}

export default TagFilter
