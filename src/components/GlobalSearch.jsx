import React, { useState, useMemo, useEffect, useId, useRef } from 'react'

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
  const searchRootRef = useRef(null)
  const listboxId = useId()
  const summaryId = `${listboxId}-summary`

  const groupedSearchResults = useMemo(() => {
    const buckets = new Map([
      ['book', []],
      ['reading-room', []],
      ['other', []],
    ])
    searchResults.forEach((result) => {
      if (!result) return
      const kind = result.kind === 'book'
        ? 'book'
        : (result.kind === 'document' || result.kind === 'article')
          ? 'reading-room'
          : 'other'
      if (!buckets.has(kind)) {
        buckets.set(kind, [])
      }
      buckets.get(kind).push(result)
    })
    const labels = {
      book: 'Books',
      'reading-room': 'Reading Room',
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

  const renderSnippet = (snippet) => {
    if (!snippet?.text) return null
    const matches = mergeSnippetMatches(snippet.highlights || [])
    if (matches.length === 0) return snippet.text
    const nodes = []
    let cursor = 0
    matches.forEach((match, index) => {
      if (cursor < match.start) {
        nodes.push(
          <span key={`text-${index}-${cursor}`}>
            {snippet.text.slice(cursor, match.start)}
          </span>
        )
      }
      nodes.push(
        <mark key={`mark-${index}-${match.start}`}>
          {snippet.text.slice(match.start, match.end)}
        </mark>
      )
      cursor = match.end
    })
    if (cursor < snippet.text.length) {
      nodes.push(<span key={`tail-${cursor}`}>{snippet.text.slice(cursor)}</span>)
    }
    return nodes
  }

  useEffect(() => {
    setActiveIndex(-1)
  }, [searchQuery, searchResults.length, searchOpen])

  const handleBlurCapture = (event) => {
    const nextTarget = event.relatedTarget
    if (nextTarget && searchRootRef.current?.contains(nextTarget)) return
    setSearchOpen(false)
    setActiveIndex(-1)
  }

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
      const resultIndex = activeIndex >= 0 ? activeIndex : 0
      if (resultIndex < flatSearchResults.length) {
        event.preventDefault()
        onOpenResult(flatSearchResults[resultIndex])
      }
    }
  }

  return (
    <div
      ref={searchRootRef}
      className="global-search"
      onBlurCapture={handleBlurCapture}
    >
      <div className="global-search-input-wrap">
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={searchOpen}
          aria-controls={listboxId}
          aria-describedby={summaryId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-label="Search the whole library"
          aria-busy={searchBusy}
          placeholder="Search the whole library..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={() => setSearchOpen(true)}
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
        <div className="global-search-results" role="listbox" id={listboxId}>
          <div id={summaryId} className="global-search-summary">
            {searchBusy ? 'Searching the library...' : `${flatSearchResults.length} result${flatSearchResults.length === 1 ? '' : 's'} across books and documents`}
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
                      id={`${listboxId}-option-${visibleIndex}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`global-search-result ${isActive ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(visibleIndex)}
                      onFocus={() => setActiveIndex(visibleIndex)}
                      onClick={() => onOpenResult(result)}
                    >
                      <div className="global-search-title-row">
                        <div className="global-search-title">{result.title}</div>
                        <span className="global-search-kind">
                          {group.kind === 'book'
                            ? 'Book'
                            : group.kind === 'reading-room'
                              ? 'Reading Room'
                              : 'Item'}
                        </span>
                      </div>
                      {result.snippet && (
                        <div className="global-search-snippet">
                          {renderSnippet(result.snippet)}
                        </div>
                      )}
                      {!result.snippet && result.relationLabel && (
                        <div className="global-search-context">{result.relationLabel}</div>
                      )}
                      {result.snippet && result.relationLabel && (
                        <div className="global-search-context">{result.relationLabel}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          })()}
          {!searchBusy && flatSearchResults.length === 0 && (
            <div className="global-search-empty">No matches in your library</div>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch

function mergeSnippetMatches(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return []
  const sorted = [...matches]
    .filter((match) => Number.isFinite(match?.start) && Number.isFinite(match?.end) && match.end > match.start)
    .sort((a, b) => a.start - b.start)
  if (sorted.length === 0) return []
  const merged = [sorted[0]]
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    const last = merged[merged.length - 1]
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
      continue
    }
    merged.push({ ...current })
  }
  return merged
}
