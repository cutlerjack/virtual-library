import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import BookDetailsDialog from '../components/BookDetailsDialog'
import { suggestDocumentsForBook } from '../utils/libraryRelations'
import { selectAllTags, selectBookReadingTrail, selectBookStudyStack, selectStudySessionState } from '../store/librarySelectors'
import { getStudyStackEntryKey } from '../utils/studyStack'
import BookPageContextShelf from './book-page/BookPageContextShelf'
import BookPageHeroSection from './book-page/BookPageHeroSection'
import BookPageWorkingNotesSection from './book-page/BookPageWorkingNotesSection'
import BookPageLinkedReadingSection from './book-page/BookPageLinkedReadingSection'
import BookPageStudyStackSection from './book-page/BookPageStudyStackSection'
import BookPageReadingTrailSection from './book-page/BookPageReadingTrailSection'
import BookPageCapturedSections from './book-page/BookPageCapturedSections'

const STATUS_LABELS = {
  'to-read': 'To Read',
  reading: 'Reading',
  read: 'Read',
  dnf: 'Did Not Finish',
}

const STATUS_OPTIONS = [
  { value: 'to-read', label: 'To Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
  { value: 'dnf', label: 'Did Not Finish' },
]

function formatStudySessionLabel(session) {
  if (!session || session.status === 'empty') return 'No study session yet.'
  if (session.status === 'complete' && session.completedAt) {
    return `Session complete ${new Date(session.completedAt).toLocaleDateString()}`
  }
  if (session.status === 'active' && session.startedAt) {
    return `Session active since ${new Date(session.startedAt).toLocaleDateString()}`
  }
  return 'Ready to start a focused pass through this stack.'
}

function scrollWindowTop(options = { top: 0, left: 0, behavior: 'auto' }) {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return
  try {
    window.scrollTo(options)
  } catch {
    // jsdom does not implement window scrolling.
  }
}

function BookPage({
  books,
  documents,
  shelves,
  onUpdate,
  onUpdateDocument,
  onDelete,
  onLogPages,
  onUndoLastPageLog,
  onAddQuote,
  onAddReflection,
  onPinStudyEntry,
  onRemoveStudyEntry,
  onUpdateStudyEntry,
  onMoveStudyEntry,
  onReviewStudyEntry,
  onToggleStudyEntryComplete,
  onStartStudySession,
  onResetStudySession,
  onOpenStudyEntry,
  onSelectBook,
  onReadDocument,
  onOpenAnnotation,
  onNavigateToDocuments,
  viewMode = 'spine',
}) {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const book = useMemo(() => books.find((entry) => entry.id === bookId), [books, bookId])
  const [notesDraft, setNotesDraft] = useState('')
  const [quoteDraft, setQuoteDraft] = useState('')
  const [reflectionDraft, setReflectionDraft] = useState('')
  const [pagesDraft, setPagesDraft] = useState('')
  const [documentToAttachId, setDocumentToAttachId] = useState('')
  const [studyNotesDrafts, setStudyNotesDrafts] = useState({})
  const [memoryTitleDraft, setMemoryTitleDraft] = useState('')
  const [memoryNoteDraft, setMemoryNoteDraft] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    setNotesDraft(book?.notes || '')
  }, [book?.id, book?.notes])

  useEffect(() => {
    scrollWindowTop({ top: 0, left: 0, behavior: 'auto' })
  }, [bookId])

  useEffect(() => {
    const nextDrafts = {}
    ;(book?.studyStack || []).forEach((entry) => {
      nextDrafts[entry.id] = entry.note || ''
    })
    setStudyNotesDrafts(nextDrafts)
  }, [book?.studyStack, book?.id])

  const contextBooks = useMemo(() => selectContextBooks(books, book), [books, book])
  const allBookTags = useMemo(() => selectAllTags(books), [books])
  const linkedDocuments = useMemo(() => (
    (documents || [])
      .filter((doc) => doc.linkedBookId === book?.id)
      .sort((a, b) => new Date(b.lastOpened || b.addedAt || 0) - new Date(a.lastOpened || a.addedAt || 0))
  ), [documents, book?.id])
  const readingTrail = useMemo(() => (
    selectBookReadingTrail(book, documents || [], 10)
  ), [book, documents])
  const studyStack = useMemo(() => (
    selectBookStudyStack(book, 8)
  ), [book])
  const studySession = useMemo(() => (
    selectStudySessionState(book)
  ), [book])
  const primaryStudyActionLabel = studySession.status === 'ready'
    ? 'Start Session'
    : studySession.status === 'complete'
      ? 'Review Completed Set'
      : 'Resume Session'
  const pinnedTrailKeys = useMemo(() => (
    new Set(studyStack.map((entry) => getStudyStackEntryKey(entry)))
  ), [studyStack])
  const attachableDocuments = useMemo(() => (
    (documents || [])
      .filter((doc) => !doc.linkedBookId)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  ), [documents])
  const suggestedDocuments = useMemo(() => (
    suggestDocumentsForBook(book, attachableDocuments, { limit: 3 })
  ), [attachableDocuments, book])
  const dismissedSuggestedDocuments = useMemo(() => (
    suggestDocumentsForBook(book, attachableDocuments, { limit: 12, includeDismissed: true })
      .filter((match) => (match.doc.dismissedBookIds || []).includes(book?.id))
      .slice(0, 3)
  ), [attachableDocuments, book])
  const orderedAttachableDocuments = useMemo(() => {
    const suggestedIds = new Set(suggestedDocuments.map((match) => match.doc.id))
    return [
      ...suggestedDocuments.map((match) => match.doc),
      ...attachableDocuments.filter((doc) => !suggestedIds.has(doc.id)),
    ]
  }, [attachableDocuments, suggestedDocuments])

  if (!book) {
    return (
      <div className="book-page-empty">
        <h2>Book not found</h2>
        <p>This book may have been removed from your library.</p>
        <Link to="/" className="btn-secondary">Back to Library</Link>
      </div>
    )
  }

  const shelfNames = (book.shelves || [])
    .map((id) => shelves.find((shelf) => shelf.id === id)?.name)
    .filter(Boolean)

  const readingProgress = book.pagesRead && book.pageCount
    ? Math.min(100, Math.round((book.pagesRead / book.pageCount) * 100))
    : null

  const handleStatusChange = (status) => {
    onUpdate({
      id: book.id,
      status,
      lastTouched: new Date().toISOString(),
    })
  }

  const handleRatingChange = (rating) => {
    onUpdate({
      id: book.id,
      rating,
      lastTouched: new Date().toISOString(),
    })
  }

  const handleDateChange = (field, value) => {
    onUpdate({
      id: book.id,
      [field]: value || null,
      lastTouched: new Date().toISOString(),
    })
  }

  const handleSaveNotes = () => {
    onUpdate({
      id: book.id,
      notes: notesDraft,
      lastTouched: new Date().toISOString(),
    })
    setActionNotice('Saved working notes.')
  }

  const handleLogPages = (value) => {
    const pages = Number(value)
    if (!pages || pages <= 0) return
    const currentPages = book.pagesRead || 0
    const pagesToLog = book.pageCount
      ? Math.min(pages, Math.max(book.pageCount - currentPages, 0))
      : pages
    if (pagesToLog <= 0) {
      setActionNotice('This book is already fully logged.')
      setPagesDraft('')
      return
    }
    onLogPages(book.id, pagesToLog)
    setPagesDraft('')
    setActionNotice(`Logged ${pagesToLog} ${pagesToLog === 1 ? 'page' : 'pages'}.`)
  }

  const handleUndoLastPageLog = () => {
    onUndoLastPageLog?.(book.id)
    setActionNotice('Removed the most recent page log.')
  }

  const handleSubmitQuote = () => {
    if (!quoteDraft.trim()) return
    onAddQuote(book.id, quoteDraft.trim())
    setQuoteDraft('')
    setActionNotice('Saved quote.')
  }

  const handleSubmitReflection = () => {
    if (!reflectionDraft.trim()) return
    onAddReflection(book.id, reflectionDraft.trim())
    setReflectionDraft('')
    setActionNotice('Saved reflection.')
  }

  const handleSaveDetails = (updates) => {
    onUpdate({
      ...updates,
      id: book.id,
    })
  }

  const handleDeleteBook = () => {
    onDelete(book.id)
    navigate('/')
  }

  const handleOpenTrailEntry = (entry) => {
    if (!entry) return
    if (onOpenAnnotation) {
      onOpenAnnotation(entry)
      return
    }
    if (entry.format === 'book') return
    const doc = linkedDocuments.find((candidate) => candidate.id === entry.itemId)
    if (doc) {
      onReadDocument?.(doc, { resume: true, location: entry.location })
    }
  }

  const handleReviewStudyEntry = (entry) => {
    if (!entry) return
    if (onOpenStudyEntry) {
      onOpenStudyEntry(book.id, entry.id)
      return
    }
    onReviewStudyEntry?.(book.id, entry.id)
    if (entry.format === 'book') {
      scrollWindowTop({ top: 0, behavior: 'smooth' })
      return
    }
    handleOpenTrailEntry(entry)
  }

  const handlePinTrailEntry = (entry) => {
    onPinStudyEntry?.(book.id, entry)
  }

  const handleRemovePinnedEntry = (studyEntryId) => {
    onRemoveStudyEntry?.(book.id, studyEntryId)
  }

  const handleSaveStudyNote = (entryId) => {
    onUpdateStudyEntry?.(book.id, entryId, {
      note: studyNotesDrafts[entryId] || '',
    })
  }

  const handleResumeWorkingSet = () => {
    const nextEntry = studySession.nextEntry
    if (nextEntry) {
      handleReviewStudyEntry(nextEntry)
      return
    }
    if (studyStack.length > 0) {
      scrollWindowTop({ top: 0, behavior: 'smooth' })
    }
  }

  const handleLaunchStudySession = () => {
    if (studyStack.length === 0) return
    if (studySession.status === 'ready') {
      onStartStudySession?.(book.id)
    }
    handleResumeWorkingSet()
  }

  const handleResetStudySession = () => {
    if (studyStack.length === 0 || !studySession.completedCount) return
    onResetStudySession?.(book.id)
  }

  const handleAttachDocument = () => {
    if (!documentToAttachId) return
    const selectedDoc = orderedAttachableDocuments.find((doc) => doc.id === documentToAttachId)
    onUpdateDocument?.(documentToAttachId, {
      linkedBookId: book.id,
      dismissedBookIds: (selectedDoc?.dismissedBookIds || []).filter((id) => id !== book.id),
    })
  }

  const handleDetachDocument = (docId) => {
    onUpdateDocument?.(docId, { linkedBookId: null })
  }

  const handleDismissSuggestion = (doc) => {
    onUpdateDocument?.(doc.id, {
      dismissedBookIds: [...new Set([...(doc.dismissedBookIds || []), book.id])],
    })
  }

  const handleRestoreSuggestion = (doc) => {
    onUpdateDocument?.(doc.id, {
      dismissedBookIds: (doc.dismissedBookIds || []).filter((id) => id !== book.id),
    })
  }

  const handleSubmitMemory = () => {
    if (!memoryTitleDraft.trim() && !memoryNoteDraft.trim()) return
    onUpdate({
      id: book.id,
      memories: [
        {
          title: memoryTitleDraft.trim() || null,
          note: memoryNoteDraft.trim() || null,
          createdAt: new Date().toISOString(),
        },
        ...(book.memories || []),
      ],
      lastTouched: new Date().toISOString(),
    })
    setMemoryTitleDraft('')
    setMemoryNoteDraft('')
    setActionNotice('Saved memory.')
  }

  const handleAcceptSuggestedDocument = (doc) => {
    onUpdateDocument?.(doc.id, {
      linkedBookId: book.id,
      dismissedBookIds: (doc.dismissedBookIds || []).filter((id) => id !== book.id),
    })
  }

  useEffect(() => {
    if (attachableDocuments.length === 0) {
      setDocumentToAttachId('')
      return
    }
    setDocumentToAttachId((current) => (
      orderedAttachableDocuments.some((doc) => doc.id === current)
        ? current
        : orderedAttachableDocuments[0].id
    ))
  }, [attachableDocuments.length, orderedAttachableDocuments])

  return (
    <div className="book-page">
      <nav className="book-page-nav">
        <Link to="/" className="book-page-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Return to Library
        </Link>
      </nav>

      <BookPageHeroSection
        book={book}
        shelfNames={shelfNames}
        readingProgress={readingProgress}
        statusLabels={STATUS_LABELS}
        statusOptions={STATUS_OPTIONS}
        pagesDraft={pagesDraft}
        onPagesDraftChange={setPagesDraft}
        onStatusChange={handleStatusChange}
        onRatingChange={handleRatingChange}
        onDateChange={handleDateChange}
        onLogPages={handleLogPages}
        onUndoLastPageLog={handleUndoLastPageLog}
        onOpenDetails={() => setDetailsOpen(true)}
        onRequestDelete={() => setConfirmDeleteOpen(true)}
      />

      {actionNotice && (
        <div className="book-page-action-notice" role="status">
          {actionNotice}
        </div>
      )}

      <BookPageWorkingNotesSection
        notesDraft={notesDraft}
        savedNotes={book.notes || ''}
        onNotesChange={setNotesDraft}
        onSaveNotes={handleSaveNotes}
      />

      <BookPageContextShelf
        contextBooks={contextBooks}
        activeBookId={book.id}
        onSelectBook={onSelectBook}
        viewMode={viewMode}
        onOpenDetails={() => setDetailsOpen(true)}
      />

      <div className="book-page-grid">
        <BookPageLinkedReadingSection
          linkedDocuments={linkedDocuments}
          suggestedDocuments={suggestedDocuments}
          dismissedSuggestedDocuments={dismissedSuggestedDocuments}
          attachableDocuments={attachableDocuments}
          orderedAttachableDocuments={orderedAttachableDocuments}
          documentToAttachId={documentToAttachId}
          onDocumentToAttachChange={setDocumentToAttachId}
          onAttachDocument={handleAttachDocument}
          onAcceptSuggestedDocument={handleAcceptSuggestedDocument}
          onDismissSuggestion={handleDismissSuggestion}
          onRestoreSuggestion={handleRestoreSuggestion}
          onReadDocument={onReadDocument}
          onDetachDocument={handleDetachDocument}
          onNavigateToDocuments={onNavigateToDocuments}
        />

        <BookPageStudyStackSection
          studyStack={studyStack}
          studySession={studySession}
          studySessionLabel={formatStudySessionLabel(studySession)}
          primaryStudyActionLabel={primaryStudyActionLabel}
          studyNotesDrafts={studyNotesDrafts}
          onStudyNoteDraftChange={(entryId, value) => setStudyNotesDrafts((prev) => ({
            ...prev,
            [entryId]: value,
          }))}
          onLaunchStudySession={handleLaunchStudySession}
          onRequestReset={() => setConfirmResetOpen(true)}
          onReviewStudyEntry={handleReviewStudyEntry}
          onMoveStudyEntry={(entryId, direction) => onMoveStudyEntry?.(book.id, entryId, direction)}
          onToggleStudyEntryComplete={(entryId) => onToggleStudyEntryComplete?.(book.id, entryId)}
          onSaveStudyNote={handleSaveStudyNote}
          onRemovePinnedEntry={handleRemovePinnedEntry}
        />

        <BookPageReadingTrailSection
          readingTrail={readingTrail}
          pinnedTrailKeys={pinnedTrailKeys}
          onOpenTrailEntry={handleOpenTrailEntry}
          onPinTrailEntry={handlePinTrailEntry}
        />

        <BookPageCapturedSections
          book={book}
          quoteDraft={quoteDraft}
          onQuoteDraftChange={setQuoteDraft}
          onSubmitQuote={handleSubmitQuote}
          reflectionDraft={reflectionDraft}
          onReflectionDraftChange={setReflectionDraft}
          onSubmitReflection={handleSubmitReflection}
          memoryTitleDraft={memoryTitleDraft}
          onMemoryTitleChange={setMemoryTitleDraft}
          memoryNoteDraft={memoryNoteDraft}
          onMemoryNoteChange={setMemoryNoteDraft}
          onSubmitMemory={handleSubmitMemory}
        />
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Remove Book"
        body={`Remove "${book.title}" from your library? Linked documents will remain in the library but detach from this book.`}
        confirmLabel="Remove Book"
        cancelLabel="Keep Book"
        tone="danger"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          handleDeleteBook()
        }}
      />

      <BookDetailsDialog
        open={detailsOpen}
        book={book}
        shelves={shelves}
        allTags={allBookTags}
        onClose={() => setDetailsOpen(false)}
        onSave={handleSaveDetails}
      />

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset Study Session"
        body="Clear the done markers in this study stack and start a fresh session?"
        confirmLabel="Reset Session"
        cancelLabel="Keep Progress"
        tone="danger"
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false)
          handleResetStudySession()
        }}
      />
    </div>
  )
}

function selectContextBooks(books, currentBook) {
  if (!currentBook) return []
  if (books.length <= 10) return books

  const currentShelves = new Set(currentBook.shelves || [])
  const sortByRecency = (left, right) => {
    const leftDate = new Date(left.lastTouched || left.addedAt || 0)
    const rightDate = new Date(right.lastTouched || right.addedAt || 0)
    return rightDate - leftDate
  }

  const sameShelfBooks = books
    .filter((entry) => (
      entry.id !== currentBook.id
      && entry.shelves?.some((shelfId) => currentShelves.has(shelfId))
    ))
    .sort(sortByRecency)

  const sameShelfIds = new Set(sameShelfBooks.map((entry) => entry.id))
  const recentBooks = books
    .filter((entry) => entry.id !== currentBook.id && !sameShelfIds.has(entry.id))
    .sort(sortByRecency)

  return [currentBook, ...sameShelfBooks.slice(0, 5), ...recentBooks.slice(0, 4)]
}

export default BookPage
