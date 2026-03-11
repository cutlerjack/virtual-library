import { useState, useCallback, useRef } from 'react'

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json'

const mapGoogleBooks = (data) => (
  (data.items || []).map(item => ({
    googleId: item.id,
    title: item.volumeInfo.title || 'Unknown Title',
    author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
    coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
    largeCoverUrl: item.volumeInfo.imageLinks?.large?.replace('http:', 'https:')
      || item.volumeInfo.imageLinks?.medium?.replace('http:', 'https:')
      || item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:')
      || null,
    isbn: item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier
      || item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier
      || null,
    pageCount: item.volumeInfo.pageCount || null,
    tags: item.volumeInfo.categories || [],
    publishedDate: item.volumeInfo.publishedDate || null,
  }))
)

const mapOpenLibrary = (data) => (
  (data.docs || []).slice(0, 10).map((doc) => ({
    googleId: doc.key,
    title: doc.title || 'Unknown Title',
    author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : 'Unknown Author',
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    largeCoverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : null,
    pageCount: doc.number_of_pages_median || null,
    tags: Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : [],
    publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
  }))
)

export function useBookSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const activeRequestId = useRef(0)
  const activeController = useRef(null)

  const searchBooks = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setResults([])
      return
    }

    if (activeController.current) {
      activeController.current.abort()
    }

    const requestId = activeRequestId.current + 1
    activeRequestId.current = requestId
    const controller = new AbortController()
    activeController.current = controller

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=10`,
        { signal: controller.signal }
      )

      if (!response.ok) {
        throw new Error(`Google Books error (${response.status})`)
      }

      const data = await response.json()
      if (requestId !== activeRequestId.current) return

      const books = mapGoogleBooks(data)
      setResults(books)
    } catch (err) {
      if (err.name === 'AbortError') return
      if (requestId !== activeRequestId.current) return
      try {
        const response = await fetch(
          `${OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=10`,
          { signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error(`Open Library error (${response.status})`)
        }
        const data = await response.json()
        if (requestId !== activeRequestId.current) return
        const books = mapOpenLibrary(data)
        setResults(books)
        setError(null)
      } catch (fallbackError) {
        if (fallbackError.name === 'AbortError') return
        if (requestId !== activeRequestId.current) return
        setError(fallbackError.message || err.message)
        setResults([])
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setLoading(false)
      }
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return { results, loading, error, searchBooks, clearResults }
}

export default useBookSearch
