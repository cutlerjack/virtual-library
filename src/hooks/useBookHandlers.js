import { useNavigate } from 'react-router-dom'
import { isTauri } from '../utils/tauri'
import { captureArticle } from '../utils/articleCapture'
import {
  updateSpineInLibraryMap,
  removeSpineFromLibraryMap,
  normalizeIsbn,
} from '../utils/storage'

export function useBookHandlers({
  actions,
  books,
  updateBookItem,
  updateSpineLibraryState,
  insertDocumentItem,
  updateUserState,
  setShowAddModal,
  libraryPath,
}) {
  const navigate = useNavigate()

  const handleUpdateSpineLibraryEntry = (isbn, spineImage, crop) => {
    const normalized = normalizeIsbn(isbn)
    if (!normalized) return
    updateSpineLibraryState((prev) => updateSpineInLibraryMap(prev || {}, { isbn, spineImage, crop }))
    books
      .filter((book) => book.isbn && normalizeIsbn(book.isbn) === normalized)
      .forEach((book) => updateBookItem(book.id, {
        spineImage,
        spineSource: 'photo',
        spineCrop: crop || book.spineCrop || null,
      }))
  }

  const handleRemoveSpineLibraryEntry = (isbn) => {
    updateSpineLibraryState((prev) => removeSpineFromLibraryMap(prev || {}, isbn))
  }

  const handleAddBook = (bookData, options = {}) => {
    actions.addBook(bookData)
    if (options.closeModal !== false) {
      setShowAddModal(false)
    }
  }

  const handleAddArticle = async (url) => {
    if (!isTauri() || !libraryPath) {
      throw new Error('Article capture is available in the desktop app only.')
    }
    const article = await captureArticle({ url, libraryPath })
    if (!article) {
      throw new Error('Unable to capture that article.')
    }
    insertDocumentItem(article)
    return article
  }

  const handleUpdateBook = (updatedBook) => {
    actions.updateBook(updatedBook)
  }

  const handleDeleteBook = (bookId) => {
    actions.deleteBook(bookId)
  }

  const handleSelectBook = (book) => {
    const updatedBook = {
      ...book,
      lastTouched: new Date().toISOString(),
      wearLevel: Math.min((book.wearLevel || 0) + 0.03, 1),
    }
    actions.updateBook(updatedBook)
    navigate(`/book/${updatedBook.id}`)
  }

  const handleLogPages = (bookId, pages) => {
    actions.logPages(bookId, pages)
  }

  const handleUndoLastPageLog = (bookId) => {
    actions.undoLastPageLog(bookId)
  }

  const handleAddQuoteQuick = (bookId, text) => {
    actions.addQuote(bookId, text)
  }

  const handleAddReflection = (bookId, text) => {
    actions.addReflection(bookId, text)
  }

  const handlePinStudyEntry = (bookId, annotation) => {
    actions.pinStudyEntry(bookId, annotation)
  }

  const handleRemoveStudyEntry = (bookId, studyEntryId) => {
    actions.removeStudyEntry(bookId, studyEntryId)
  }

  const handleUpdateStudyEntry = (bookId, studyEntryId, updates) => {
    actions.updateStudyEntry(bookId, studyEntryId, updates)
  }

  const handleMoveStudyEntry = (bookId, studyEntryId, direction) => {
    actions.moveStudyEntry(bookId, studyEntryId, direction)
  }

  const handleReviewStudyEntry = (bookId, studyEntryId) => {
    actions.reviewStudyEntry(bookId, studyEntryId)
  }

  const handleToggleStudyEntryComplete = (bookId, studyEntryId) => {
    actions.toggleStudyEntryComplete(bookId, studyEntryId)
  }

  const handleStartStudySession = (bookId) => {
    actions.startStudySession(bookId)
  }

  const handleResetStudySession = (bookId) => {
    actions.resetStudySession(bookId)
  }

  const handleUpdateGoal = (goal) => {
    updateUserState({ yearlyGoal: goal })
  }

  const handleUpdateUserData = (updates) => {
    updateUserState(updates)
  }

  return {
    handleUpdateSpineLibraryEntry,
    handleRemoveSpineLibraryEntry,
    handleAddBook,
    handleAddArticle,
    handleUpdateBook,
    handleDeleteBook,
    handleSelectBook,
    handleLogPages,
    handleUndoLastPageLog,
    handleAddQuoteQuick,
    handleAddReflection,
    handlePinStudyEntry,
    handleRemoveStudyEntry,
    handleUpdateStudyEntry,
    handleMoveStudyEntry,
    handleReviewStudyEntry,
    handleToggleStudyEntryComplete,
    handleStartStudySession,
    handleResetStudySession,
    handleUpdateGoal,
    handleUpdateUserData,
  }
}
