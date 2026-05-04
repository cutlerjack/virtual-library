import { useState, useCallback, useEffect, useRef } from 'react'
import { getGoogleCoverSet, getOpenLibraryCoverSet } from '../utils/coverImages'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json'
const BOOK_SEARCH_TIMEOUT_MS = 10000

const mapGoogleBooks = (data) => (
  (Array.isArray(data?.items) ? data.items : []).map((item) => {
    const volumeInfo = item?.volumeInfo || {}
    const industryIdentifiers = Array.isArray(volumeInfo.industryIdentifiers)
      ? volumeInfo.industryIdentifiers
      : []
    const coverSet = getGoogleCoverSet(volumeInfo.imageLinks)

    return {
      googleId: item.id,
      title: volumeInfo.title || 'Unknown Title',
      author: Array.isArray(volumeInfo.authors) ? volumeInfo.authors.join(', ') : 'Unknown Author',
      coverUrl: coverSet.coverUrl,
      largeCoverUrl: coverSet.largeCoverUrl,
      isbn: industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier
        || industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier
        || null,
      pageCount: volumeInfo.pageCount || null,
      tags: Array.isArray(volumeInfo.categories) ? volumeInfo.categories : [],
      publishedDate: volumeInfo.publishedDate || null,
    }
  })
)

const mapOpenLibrary = (data) => (
  (Array.isArray(data?.docs) ? data.docs : []).slice(0, 10).map((doc) => {
    const coverSet = getOpenLibraryCoverSet(doc?.cover_i)

    return {
      googleId: doc?.key || null,
      title: doc?.title || 'Unknown Title',
      author: Array.isArray(doc?.author_name) ? doc.author_name.join(', ') : 'Unknown Author',
      coverUrl: coverSet.coverUrl,
      largeCoverUrl: coverSet.largeCoverUrl,
      isbn: Array.isArray(doc?.isbn) ? doc.isbn[0] : null,
      pageCount: doc?.number_of_pages_median || null,
      tags: Array.isArray(doc?.subject) ? doc.subject.slice(0, 5) : [],
      publishedDate: doc?.first_publish_year ? String(doc.first_publish_year) : null,
    }
  })
)

export function useBookSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [settledQuery, setSettledQuery] = useState('')
  const activeRequestId = useRef(0)
  const activeController = useRef(null)

  const cancelActiveSearch = useCallback(() => {
    activeRequestId.current += 1
    if (activeController.current) {
      activeController.current.abort()
      activeController.current = null
    }
  }, [])

  const searchBooks = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      cancelActiveSearch()
      setResults([])
      setLoading(false)
      setError(null)
      setSettledQuery('')
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
    setSettledQuery('')

    try {
      const response = await fetchWithTimeout(
        `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=10`,
        { signal: controller.signal },
        {
          timeoutMs: BOOK_SEARCH_TIMEOUT_MS,
          timeoutMessage: 'Google Books search timed out.',
        }
      )

      if (!response.ok) {
        throw new Error(`Google Books error (${response.status})`)
      }

      const data = await response.json()
      if (requestId !== activeRequestId.current) return

      const books = mapGoogleBooks(data)
      setResults(books)
      setSettledQuery(query.trim())
    } catch (err) {
      if (err.name === 'AbortError') return
      if (requestId !== activeRequestId.current) return
      try {
        const response = await fetchWithTimeout(
          `${OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=10`,
          { signal: controller.signal },
          {
            timeoutMs: BOOK_SEARCH_TIMEOUT_MS,
            timeoutMessage: 'Open Library search timed out.',
          }
        )
        if (!response.ok) {
          throw new Error(`Open Library error (${response.status})`)
        }
        const data = await response.json()
        if (requestId !== activeRequestId.current) return
        const books = mapOpenLibrary(data)
        setResults(books)
        setError(null)
        setSettledQuery(query.trim())
      } catch (fallbackError) {
        if (fallbackError.name === 'AbortError') return
        if (requestId !== activeRequestId.current) return
        setError(fallbackError.message || err.message)
        setResults([])
        setSettledQuery(query.trim())
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setLoading(false)
      }
    }
  }, [cancelActiveSearch])

  const clearResults = useCallback(() => {
    cancelActiveSearch()
    setResults([])
    setError(null)
    setSettledQuery('')
    setLoading(false)
  }, [cancelActiveSearch])

  useEffect(() => () => {
    cancelActiveSearch()
  }, [cancelActiveSearch])

  return { results, loading, error, settledQuery, searchBooks, clearResults }
}

export default useBookSearch
