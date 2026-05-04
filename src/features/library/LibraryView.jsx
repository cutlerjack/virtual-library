import React, { useState, useMemo } from 'react'
import AnnotationsHub from '../../components/AnnotationsHub'
import {
  selectAllTags,
  selectBooksFinishedThisYear,
  selectQuoteCount,
  selectContinueReadingDocs,
  selectFilteredBooks,
  selectSortedBooks,
  selectAllAnnotations,
  selectStudyVolumes,
} from '../../store/librarySelectors'
import { exportLibrary } from '../../utils/exportLibrary'
import { resolveShelfFont } from '../../utils/fonts'
import { generateId } from '../../utils/storage'
import LibraryHeroSection from './components/LibraryHeroSection'
import LibraryShelfStage from './components/LibraryShelfStage'
import LibraryBridgeSection from './components/LibraryBridgeSection'
import ContinueReadingSection from './components/ContinueReadingSection'
import StudyDeskSection from './components/StudyDeskSection'
import LibraryCustomizerSection from './components/LibraryCustomizerSection'
import CreateExhibitDialog from './components/CreateExhibitDialog'

function LibraryView({
  books,
  documents,
  shelves,
  userData,
  spineLibraryEntries,
  viewMode,
  icons,
  showCustomizer,
  actions,
  updateUserState,
  onSelectBook,
  onReadDocument,
  onOpenAnnotation,
  onOpenBook,
  onRequestAddBook,
  onNavigateToDocuments,
  handleUpdateSpineLibraryEntry,
  handleRemoveSpineLibraryEntry,
}) {
  // View-local state (previously in App.jsx)
  const [activeShelf, setActiveShelf] = useState('all')
  const [selectedTags, setSelectedTags] = useState([])
  const [sortMode, setSortMode] = useState('recent')
  const [showExhibitDialog, setShowExhibitDialog] = useState(false)
  const [newExhibitName, setNewExhibitName] = useState('')
  const [newExhibitDescription, setNewExhibitDescription] = useState('')

  // Derived state (previously memoized in App.jsx)
  const allTags = useMemo(() => selectAllTags(books), [books])
  const booksFinishedThisYear = useMemo(() => selectBooksFinishedThisYear(books), [books])
  const quoteCount = useMemo(() => selectQuoteCount(books), [books])
  const continueReadingDocs = useMemo(() => selectContinueReadingDocs(documents), [documents])
  const annotations = useMemo(() => selectAllAnnotations(books, documents), [books, documents])
  const studyVolumes = useMemo(() => selectStudyVolumes(books), [books])
  const filteredBooks = useMemo(() => selectFilteredBooks(books, activeShelf, selectedTags), [books, activeShelf, selectedTags])
  const sortedBooks = useMemo(() => selectSortedBooks(filteredBooks, sortMode), [filteredBooks, sortMode])

  const shelfFontValue = resolveShelfFont(userData.shelfFont)
  const nameplateText = userData.displayName

  const handleExportLibrary = () => exportLibrary(books, shelves)

  const handleDeleteShelf = (shelfId) => {
    actions.deleteShelf(shelfId)
    if (activeShelf === shelfId) setActiveShelf('all')
  }

  const handleCreateExhibit = () => {
    const name = newExhibitName.trim()
    if (!name) return
    updateUserState({
      exhibits: [
        ...(userData.exhibits || []),
        {
          id: generateId(),
          name,
          description: newExhibitDescription.trim(),
          bookIds: [],
        },
      ],
    })
    setNewExhibitName('')
    setNewExhibitDescription('')
    setShowExhibitDialog(false)
  }

  return (
    <div>
      <LibraryHeroSection
        booksCount={books.length}
        booksFinishedThisYear={booksFinishedThisYear}
        quoteCount={quoteCount}
      />

      <LibraryShelfStage
        books={books}
        shelves={shelves}
        filteredBooks={filteredBooks}
        sortedBooks={sortedBooks}
        allTags={allTags}
        activeShelf={activeShelf}
        selectedTags={selectedTags}
        sortMode={sortMode}
        viewMode={viewMode}
        nameplateText={nameplateText}
        icons={icons}
        onRequestAddBook={onRequestAddBook}
        onSelectBook={onSelectBook}
        onSelectShelf={setActiveShelf}
        onAddShelf={actions.addShelf}
        onDeleteShelf={handleDeleteShelf}
        onToggleTag={(tag) => {
          setSelectedTags((prev) => (
            prev.includes(tag)
              ? prev.filter((entry) => entry !== tag)
              : [...prev, tag]
          ))
        }}
        onClearTags={() => setSelectedTags([])}
        onSelectSortMode={setSortMode}
      />

      <LibraryBridgeSection
        documents={documents}
        onNavigateToDocuments={onNavigateToDocuments}
      />

      <ContinueReadingSection
        continueReadingDocs={continueReadingDocs}
        onNavigateToDocuments={onNavigateToDocuments}
        onReadDocument={onReadDocument}
      />

      <StudyDeskSection
        studyVolumes={studyVolumes}
        onOpenBook={onOpenBook}
      />

      <LibraryCustomizerSection
        showCustomizer={showCustomizer}
        userData={userData}
        shelfFontValue={shelfFontValue}
        books={books}
        shelves={shelves}
        spineLibraryEntries={spineLibraryEntries}
        onUpdateUserData={updateUserState}
        onExportLibrary={handleExportLibrary}
        onCreateExhibit={() => setShowExhibitDialog(true)}
        onSelectBook={onSelectBook}
        onUpdateSpineLibraryEntry={handleUpdateSpineLibraryEntry}
        onRemoveSpineLibraryEntry={handleRemoveSpineLibraryEntry}
      />

      <AnnotationsHub
        annotations={annotations}
        onOpenAnnotation={onOpenAnnotation}
        onOpenBook={onOpenBook}
      />

      <CreateExhibitDialog
        open={showExhibitDialog}
        exhibitName={newExhibitName}
        exhibitDescription={newExhibitDescription}
        onChangeName={setNewExhibitName}
        onChangeDescription={setNewExhibitDescription}
        onCreate={handleCreateExhibit}
        onClose={() => {
          setShowExhibitDialog(false)
          setNewExhibitName('')
          setNewExhibitDescription('')
        }}
      />
    </div>
  )
}

export default LibraryView
