import { useState } from 'react'
import { quoteText } from '../../utils/documentUtils'

const QuoteIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
)

export default function QuotesTab({ book, onUpdate }) {
  const [newQuote, setNewQuote] = useState('')

  const handleAddQuote = () => {
    if (newQuote.trim()) {
      onUpdate({ ...book, quotes: [...(book.quotes || []), { text: newQuote.trim(), createdAt: new Date().toISOString() }] })
      setNewQuote('')
    }
  }

  const handleRemoveQuote = (index) => {
    const newQuotes = [...(book.quotes || [])]
    newQuotes.splice(index, 1)
    onUpdate({ ...book, quotes: newQuotes })
  }

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Favorite Quotes</h3>
      <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
        {book.quotes?.length > 0 ? (
          book.quotes.map((quote, index) => (
            <div
              key={index}
              className="flex gap-3 items-start p-3 rounded-lg group"
              style={{ background: 'rgba(32, 24, 25, 0.05)' }}
            >
              <span className="w-4 h-4 text-[#b45309] flex-shrink-0 mt-0.5">{QuoteIcon}</span>
              <p className="flex-1 text-sm italic text-[#4b3f37]">{quoteText(quote)}</p>
              <button
                onClick={() => handleRemoveQuote(index)}
                className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <p className="text-muted text-sm italic">No quotes saved yet</p>
        )}
      </div>
      <div className="flex gap-2">
        <textarea
          value={newQuote}
          onChange={(e) => setNewQuote(e.target.value)}
          placeholder="Add a memorable quote..."
          className="input-field text-sm py-2 flex-1 h-16 resize-none"
        />
        <button onClick={handleAddQuote} className="btn-secondary self-end">
          Add
        </button>
      </div>
    </div>
  )
}
