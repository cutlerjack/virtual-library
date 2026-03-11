import { useState, useMemo, useEffect } from 'react'

function GlobalSearch({
  searchQuery,
  setSearchQuery,
  searchResults,
  searchOpen,
  setSearchOpen,
  searchBusy,
  searchStatus,
  onOpenResult,
}) {
  const [activeIndex, setActiveIndex] = useState(-1)

  const groupedSearchResults = useMemo(() => {
    const buckets = new Map([
      ['book', []],
      ['document', []],
      ['article', []],
      ['other', []],
    ])
    searchResults.forEach((result) => {
      if (!result) return
      const kind = result.kind || 'other'
      if (!buckets.has(kind)) {
        buckets.set(kind, [])
      }
      buckets.get(kind).push(result)
    })
    const labels = {
      book: 'Books',
      document: 'Documents',
      article: 'Articles',
      other: 'Other',
    }
    return Array.from(buckets.entries())
      .filter(([, items]) => items.length > 0)
      .map(([kind, items]) => ({ kind, label: labels[kind] || 'Other', items }))
  }, [searchResults])

  const flatSearchResults = useMemo(
    () => groupedSearchResults.flatMap((group) => group.items),
    [groupedSearchResults]
  )

  useEffect(() => {
    setActiveIndex(-1)
  }, [searchQuery, searchResults.length, searchOpen])

  const handleKeyDown = (event) => {
    if (!searchOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setSearchOpen(true)
    }
    if (event.key === 'Escape') {
      setSearchOpen(false)
      setActiveIndex(-1)
      return
    }
    if (flatSearchResults.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % flatSearchResults.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? flatSearchResults.length - 1 : prev - 1))
      return
    }
    if (event.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < flatSearchResults.length) {
        event.preventDefault()
        onOpenResult(flatSearchResults[activeIndex])
      }
    }
  }

  return (
    <div className="global-search">
      <div className="global-search-input-wrap">
        <input
          type="search"
          placeholder="Search library..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
        {searchQuery.trim() && (
          <button
            type="button"
            className="global-search-clear"
            onClick={() => {
              setSearchQuery('')
              setSearchOpen(false)
            }}
          >
            Clear
          </button>
        )}
      </div>
      {searchOpen && (groupedSearchResults.length > 0 || searchBusy || searchQuery.trim()) && (
        <div className="global-search-results">
          <div className="global-search-summary">
            {searchBusy ? 'Searching...' : `${flatSearchResults.length} result${flatSearchResults.length === 1 ? '' : 's'}`}
          </div>
          {searchBusy && (
            <div className="global-search-loading">
              <div className="global-search-skeleton" />
              <div className="global-search-skeleton" />
              <div className="global-search-skeleton short" />
            </div>
          )}
          {searchStatus === 'error' && !searchBusy && (
            <div className="global-search-empty">Search unavailable</div>
          )}
          {!searchBusy && (() => {
            let visibleIndex = -1
            return groupedSearchResults.map((group) => (
              <div key={group.kind} className="global-search-group">
                <div className="global-search-group-title">{group.label}</div>
                {group.items.map((result, itemIndex) => {
                  visibleIndex += 1
                  const isActive = visibleIndex === activeIndex
                  return (
                    <button
                      key={`${result.itemId}-${itemIndex}-${group.kind}`}
                      type="button"
                      className={`global-search-result ${isActive ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(visibleIndex)}
                      onClick={() => onOpenResult(result)}
                    >
                      <div className="global-search-title-row">
                        <div className="global-search-title">{result.title}</div>
                        <span className="global-search-kind">
                          {group.kind === 'book'
                            ? 'Book'
                            : group.kind === 'document'
                              ? 'Document'
                              : group.kind === 'article'
                                ? 'Article'
                                : 'Item'}
                        </span>
                      </div>
                      {result.snippet && (
                        <div
                          className="global-search-snippet"
                          dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          })()}
          {!searchBusy && flatSearchResults.length === 0 && (
            <div className="global-search-empty">No matches</div>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
