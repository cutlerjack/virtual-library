import React, { useMemo, useState } from 'react'
import { isTauri } from '../utils/tauri'
import { suggestBooksForDocument } from '../utils/libraryRelations'
import ReadingRoomOverview from './reading-room/ReadingRoomOverview'
import ReadingRoomToolbar from './reading-room/ReadingRoomToolbar'
import ReadingRoomOrganizationPanel from './reading-room/ReadingRoomOrganizationPanel'
import ReadingRoomRecentSection from './reading-room/ReadingRoomRecentSection'
import ReadingRoomDocumentResults from './reading-room/ReadingRoomDocumentResults'

function LibraryVaultPanel({
  libraryPath,
  books = [],
  documents,
  shelves = [],
  allLibraryTags = [],
  onImport,
  onReadDocument,
  onUpdateDocument,
  onNavigateToLibrary,
  onOpenBook,
  vaultError,
  lastRescanAt,
}) {
  const isDesktop = isTauri()
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [sortMode, setSortMode] = useState('recent')
  const [activeShelf, setActiveShelf] = useState('all')
  const [selectedTags, setSelectedTags] = useState([])
  const [editingDocId, setEditingDocId] = useState(null)
  const [draftTag, setDraftTag] = useState('')

  const handleImport = async () => {
    setBusy(true)
    await onImport?.()
    setBusy(false)
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredDocuments = useMemo(() => (
    documents.filter((doc) => {
      const matchesQuery = !normalizedQuery
        || doc.title?.toLowerCase().includes(normalizedQuery)
        || doc.originalName?.toLowerCase().includes(normalizedQuery)
      if (!matchesQuery) return false
      if (filter !== 'all' && doc.type !== filter) return false
      if (activeShelf !== 'all' && !doc.shelves?.includes(activeShelf)) return false
      if (selectedTags.length > 0 && !selectedTags.every((tag) => doc.tags?.includes(tag))) return false
      return true
    })
  ), [activeShelf, documents, filter, normalizedQuery, selectedTags])

  const sortedDocuments = useMemo(() => {
    const list = [...filteredDocuments]
    if (sortMode === 'title') {
      return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    }
    if (sortMode === 'progress') {
      const progressOf = (doc) => {
        if (doc.type === 'pdf' && doc.pageCount) {
          return (doc.lastPage || 0) / doc.pageCount
        }
        if (typeof doc.progressPercent === 'number') {
          return doc.progressPercent / 100
        }
        return 0
      }
      return list.sort((a, b) => progressOf(b) - progressOf(a))
    }
    return list.sort((a, b) => {
      const aTime = new Date(a.lastOpened || a.addedAt || 0).getTime()
      const bTime = new Date(b.lastOpened || b.addedAt || 0).getTime()
      return bTime - aTime
    })
  }, [filteredDocuments, sortMode])

  const recentDocuments = [...documents]
    .filter((doc) => doc.lastOpened)
    .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
    .slice(0, 4)

  const canRead = (doc) => doc.fileStatus !== 'missing'
    && (doc.type === 'pdf' || doc.type === 'epub' || doc.type === 'article')

  const sharedShelves = shelves.filter((shelf) => shelf.id === 'all' || shelf.id)
  const sortedBooks = useMemo(() => (
    [...books].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  ), [books])
  const relationSuggestionsByDocId = useMemo(() => {
    const entries = documents
      .filter((doc) => !doc.linkedBookId)
      .map((doc) => {
        const allMatches = suggestBooksForDocument(doc, books, { limit: 4, includeDismissed: true })
        const dismissedBookIds = new Set(doc.dismissedBookIds || [])
        return [doc.id, {
          active: allMatches.find((match) => !dismissedBookIds.has(match.book.id)) || null,
          dismissed: allMatches.find((match) => dismissedBookIds.has(match.book.id)) || null,
        }]
      })
    return new Map(entries)
  }, [books, documents])

  const statusInfo = (doc) => {
    if (doc.fileStatus === 'missing') {
      return { label: 'Missing', className: 'reading-room-status reading-room-status-missing' }
    }
    if (doc.fileStatus === 'duplicate') {
      return { label: 'Duplicate', className: 'reading-room-status reading-room-status-duplicate' }
    }
    if (doc.scanned) {
      return { label: 'Scanned', className: 'reading-room-status reading-room-status-scanned' }
    }
    return null
  }

  const getProgressValue = (doc) => {
    if (doc.type === 'pdf' && doc.pageCount) {
      return Math.min(100, Math.round(((doc.lastPage || 0) / doc.pageCount) * 100))
    }
    if (typeof doc.progressPercent === 'number') {
      return Math.min(100, Math.max(0, Math.round(doc.progressPercent)))
    }
    return null
  }

  const toggleDocumentShelf = (doc, shelfId) => {
    const currentShelves = doc.shelves || []
    const nextShelves = currentShelves.includes(shelfId)
      ? currentShelves.filter((id) => id !== shelfId)
      : [...currentShelves, shelfId]
    onUpdateDocument?.(doc.id, { shelves: nextShelves })
  }

  const addDocumentTag = (doc) => {
    const nextTag = draftTag.trim()
    if (!nextTag) return
    if (doc.tags?.includes(nextTag)) {
      setDraftTag('')
      return
    }
    onUpdateDocument?.(doc.id, { tags: [...(doc.tags || []), nextTag] })
    setDraftTag('')
  }

  const removeDocumentTag = (doc, tag) => {
    onUpdateDocument?.(doc.id, {
      tags: (doc.tags || []).filter((entry) => entry !== tag),
    })
  }

  const acceptSuggestedBook = (doc, bookId) => {
    onUpdateDocument?.(doc.id, {
      linkedBookId: bookId,
      dismissedBookIds: (doc.dismissedBookIds || []).filter((id) => id !== bookId),
    })
  }

  const dismissSuggestedBook = (doc, bookId) => {
    onUpdateDocument?.(doc.id, {
      dismissedBookIds: [...new Set([...(doc.dismissedBookIds || []), bookId])],
    })
  }

  const restoreDismissedBook = (doc, bookId) => {
    onUpdateDocument?.(doc.id, {
      dismissedBookIds: (doc.dismissedBookIds || []).filter((id) => id !== bookId),
    })
  }

  const handleToggleEditing = (docId) => {
    setEditingDocId((prev) => (prev === docId ? null : docId))
    setDraftTag('')
  }

  const hasActiveFilters = normalizedQuery.length > 0 || filter !== 'all' || activeShelf !== 'all' || selectedTags.length > 0
  const emptyStateMessage = documents.length === 0
    ? (isDesktop
        ? 'No documents yet. Import files from the desktop app to start the Reading Room.'
        : 'No documents yet. Open the desktop app to import files into the Reading Room.')
    : hasActiveFilters
      ? 'No documents match the current filters.'
      : 'No documents are available right now.'

  return (
    <section className="reading-room">
      <ReadingRoomOverview
        isDesktop={isDesktop}
        busy={busy}
        booksCount={books.length}
        documentsCount={documents.length}
        libraryPath={libraryPath}
        lastRescanAt={lastRescanAt}
        vaultError={vaultError}
        onImport={handleImport}
        onNavigateToLibrary={onNavigateToLibrary}
      />

      {!isDesktop && (
        <div className="preferences-hint">
          Browse, tag, and open items here. Importing, OCR, backups, restores, and other file-level actions stay in the desktop app.
        </div>
      )}

      <ReadingRoomToolbar
        query={query}
        sortMode={sortMode}
        filter={filter}
        viewMode={viewMode}
        onQueryChange={setQuery}
        onSortModeChange={setSortMode}
        onFilterChange={setFilter}
        onViewModeChange={setViewMode}
      />

      <ReadingRoomOrganizationPanel
        sharedShelves={sharedShelves}
        allLibraryTags={allLibraryTags}
        activeShelf={activeShelf}
        selectedTags={selectedTags}
        onShelfChange={setActiveShelf}
        onToggleTag={(tag) => setSelectedTags((prev) => (
          prev.includes(tag)
            ? prev.filter((entry) => entry !== tag)
            : [...prev, tag]
        ))}
        onClearTags={() => setSelectedTags([])}
      />

      <div className="reading-room-results">
        Showing {sortedDocuments.length} of {documents.length} documents
        {activeShelf !== 'all' && (
          <span className="reading-room-results-detail">
            · Shelf: {shelves.find((shelf) => shelf.id === activeShelf)?.name || activeShelf}
          </span>
        )}
        {selectedTags.length > 0 && (
          <span className="reading-room-results-detail">
            · Tags: {selectedTags.join(', ')}
          </span>
        )}
      </div>

      <ReadingRoomRecentSection
        recentDocuments={recentDocuments}
        books={books}
        shelves={shelves}
        canRead={canRead}
        getProgressValue={getProgressValue}
        statusInfo={statusInfo}
        onReadDocument={onReadDocument}
      />

      <ReadingRoomDocumentResults
        viewMode={viewMode}
        documents={sortedDocuments}
        emptyStateMessage={emptyStateMessage}
        books={books}
        shelves={shelves}
        sortedBooks={sortedBooks}
        editingDocId={editingDocId}
        draftTag={draftTag}
        relationSuggestionsByDocId={relationSuggestionsByDocId}
        canRead={canRead}
        getProgressValue={getProgressValue}
        statusInfo={statusInfo}
        onToggleEditing={handleToggleEditing}
        onDraftTagChange={setDraftTag}
        onReadDocument={onReadDocument}
        onUpdateDocument={onUpdateDocument}
        onOpenBook={onOpenBook}
        onToggleShelf={toggleDocumentShelf}
        onAddTag={addDocumentTag}
        onRemoveTag={removeDocumentTag}
        onAcceptSuggestedBook={acceptSuggestedBook}
        onDismissSuggestedBook={dismissSuggestedBook}
        onRestoreDismissedBook={restoreDismissedBook}
      />
    </section>
  )
}

export default LibraryVaultPanel
