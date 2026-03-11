import { useEffect, useState } from 'react'
import { isTauri } from '../utils/tauri'
import { searchLibrary } from '../data/libraryDb'

export function useSearchController({ libraryPath }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchStatus, setSearchStatus] = useState('idle')

  useEffect(() => {
    if (!isTauri() || !libraryPath) return
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults([])
      setSearchStatus('idle')
      return
    }
    let cancelled = false
    const timeout = setTimeout(async () => {
      setSearchStatus('loading')
      try {
        const results = await searchLibrary(libraryPath, trimmed)
        if (!cancelled) {
          setSearchResults(results)
          setSearchStatus('success')
        }
      } catch {
        if (!cancelled) {
          setSearchResults([])
          setSearchStatus('error')
        }
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [searchQuery, libraryPath])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchOpen,
    setSearchOpen,
    searchStatus,
    searchBusy: searchStatus === 'loading',
  }
}
