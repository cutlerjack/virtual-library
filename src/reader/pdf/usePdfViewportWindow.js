import { useMemo } from 'react'

export function usePdfViewportWindow({
  pageCount,
  scrollTop,
  viewportHeight,
  overscanPages = 8,
  offsetToPage,
}) {
  return useMemo(() => {
    if (!pageCount || pageCount <= 0) {
      return {
        startPage: 1,
        endPage: 0,
        pages: [],
      }
    }

    const safeOverscan = Math.max(1, Number(overscanPages) || 8)
    const topPage = offsetToPage(scrollTop)
    const bottomPage = offsetToPage((scrollTop || 0) + (viewportHeight || 0))
    const startPage = Math.max(1, topPage - safeOverscan)
    const endPage = Math.min(pageCount, bottomPage + safeOverscan)
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)

    return {
      startPage,
      endPage,
      pages,
    }
  }, [pageCount, scrollTop, viewportHeight, overscanPages, offsetToPage])
}
