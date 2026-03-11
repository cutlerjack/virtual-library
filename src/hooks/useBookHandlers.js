import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTauri } from '../utils/tauri'
import { captureArticle } from '../utils/articleCapture'
import {
  updateSpineInLibraryMap,
  removeSpineFromLibraryMap,
  addSpineToLibraryMap,
  normalizeIsbn,
} from '../utils/storage'
import { createDocumentItemFromDoc, mergeBookIntoItem } from '../data/libraryAdapters'

export function useBookHandlers({
  actions,
  updateLibraryState,
  updateUserState,
  setShowAddModal,
  setSelectedBook,
  userData,
  libraryPath,
}) {
  const navigate = useNavigate()

  const handleUpdateSpineLibraryEntry = (isbn, spineImage, crop) => {
    updateLibraryState((prev) => {
      const nextMap = updateSpineInLibraryMap(prev.spineLibrary || {}, { isbn, spineImage, crop })
      const normalized = normalizeIsbn(isbn)
      const items = prev.items.map((item) => {
        if (item.kind !== 'book') return item
        const meta = item.bookMeta || {}
        if (!meta.isbn || normalizeIsbn(meta.isbn) !== normalized) return item
        return {
          ...item,
          bookMeta: {
            ...meta,
            spineImage,
            spineSource: 'photo',
            spineCrop: crop || meta.spineCrop || null,
          },
        }
      })
      return { ...prev, spineLibrary: nextMap, items }
    })
  }

  const handleRemoveSpineLibraryEntry = (isbn) => {
    updateLibraryState((prev) => ({
      ...prev,
      spineLibrary: removeSpineFromLibraryMap(prev.spineLibrary || {}, isbn),
    }))
  }

  const handleAddBook = (bookData) => {
    actions.addBook(bookData)
    setShowAddModal(false)
  }

  const handleAddArticle = async (url) => {
    if (!isTauri() || !libraryPath) return
    const article = await captureArticle({ url, libraryPath })
    if (!article) return
    updateLibraryState((prev) => ({
      ...prev,
      items: [...prev.items, createDocumentItemFromDoc(article)],
    }))
  }

  const handleUpdateBook = (updatedBook) => {
    actions.updateBook(updatedBook)
    setSelectedBook(updatedBook)
  }

  const handleDeleteBook = (bookId) => {
    actions.deleteBook(bookId)
    setSelectedBook(null)
  }

  const handleSelectBook = (book) => {
    const updatedBook = {
      ...book,
      lastTouched: new Date().toISOString(),
      wearLevel: Math.min((book.wearLevel || 0) + 0.03, 1),
    }
    actions.updateBook(updatedBook)
    setSelectedBook(updatedBook)
  }

  const handleViewBookPage = useCallback((bookId) => {
    navigate(`/book/${bookId}`)
  }, [navigate])

  const handleLogPages = (bookId, pages) => {
    actions.logPages(bookId, pages)
  }

  const handleAddQuoteQuick = (bookId, text) => {
    actions.addQuote(bookId, text)
  }

  const handleAddReflection = (bookId, text) => {
    actions.addReflection(bookId, text)
  }

  const handleApplyFontToAll = (fontKey) => {
    updateLibraryState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (
        item.kind === 'book'
          ? mergeBookIntoItem(item, { spineFont: fontKey })
          : item
      )),
    }))
    setSelectedBook(prev => (prev ? { ...prev, spineFont: fontKey } : prev))
  }

  const handleUpdateGoal = (goal) => {
    updateUserState({ yearlyGoal: goal })
  }

  const handleUpdateUserData = (updates) => {
    updateUserState(updates)
  }

  const handleAddToExhibit = (bookId, exhibitId) => {
    updateUserState({
      exhibits: (userData.exhibits || []).map((exhibit) => {
        if (exhibit.id !== exhibitId) return exhibit
        const current = exhibit.bookIds || []
        if (current.includes(bookId)) return exhibit
        return { ...exhibit, bookIds: [...current, bookId] }
      }),
    })
  }

  const handleSaveSpineToLibrary = ({ isbn, spineImage, crop, title, author }) => {
    if (!isbn || !spineImage) return
    updateLibraryState((prev) => ({
      ...prev,
      spineLibrary: addSpineToLibraryMap(prev.spineLibrary || {}, { isbn, spineImage, crop, title, author }),
    }))
  }

  return {
    handleUpdateSpineLibraryEntry,
    handleRemoveSpineLibraryEntry,
    handleAddBook,
    handleAddArticle,
    handleUpdateBook,
    handleDeleteBook,
    handleSelectBook,
    handleViewBookPage,
    handleLogPages,
    handleAddQuoteQuick,
    handleAddReflection,
    handleApplyFontToAll,
    handleUpdateGoal,
    handleUpdateUserData,
    handleAddToExhibit,
    handleSaveSpineToLibrary,
  }
}
