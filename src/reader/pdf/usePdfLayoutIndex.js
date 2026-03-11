import { useEffect, useMemo, useState } from 'react'

export function buildLayoutOffsets(heights, gap = 18) {
  const offsets = Array.from({ length: heights.length }, () => 0)
  let cursor = 0
  for (let i = 0; i < heights.length; i += 1) {
    offsets[i] = cursor
    cursor += (heights[i] || 0) + gap
  }
  return {
    offsets,
    totalHeight: cursor,
  }
}

export function pageFromOffset(offsetValue, offsets, heights, gap = 18) {
  const pageCount = heights.length
  if (pageCount === 0) return 1
  const offset = Math.max(0, Number(offsetValue) || 0)
  let low = 1
  let high = pageCount
  let result = pageCount
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const top = offsets[mid - 1] || 0
    const bottom = top + (heights[mid - 1] || 0) + gap
    if (offset < top) {
      high = mid - 1
    } else if (offset >= bottom) {
      low = mid + 1
    } else {
      result = mid
      break
    }
  }
  return Math.min(pageCount, Math.max(1, result))
}

export function usePdfLayoutIndex({ pdfDoc, scale = 1, gap = 18 }) {
  const [layoutState, setLayoutState] = useState({
    pageCount: 0,
    estimatedHeight: 0,
    heights: [],
    widths: [],
  })

  useEffect(() => {
    if (!pdfDoc) {
      setLayoutState({
        pageCount: 0,
        estimatedHeight: 0,
        heights: [],
        widths: [],
      })
      return
    }

    let cancelled = false
    const pageCount = pdfDoc.numPages || 0

    const load = async () => {
      let estimatedHeight = 1120
      let estimatedWidth = 820
      try {
        const firstPage = await pdfDoc.getPage(1)
        const viewport = firstPage.getViewport({ scale })
        estimatedHeight = viewport?.height || estimatedHeight
        estimatedWidth = viewport?.width || estimatedWidth
      } catch {
        // keep defaults
      }

      if (cancelled) return
      setLayoutState({
        pageCount,
        estimatedHeight,
        heights: Array.from({ length: pageCount }, () => estimatedHeight),
        widths: Array.from({ length: pageCount }, () => estimatedWidth),
      })

      const pendingHeights = new Map()
      const pendingWidths = new Map()
      const flushBatch = () => {
        if (cancelled) return
        if (pendingHeights.size === 0) return
        setLayoutState((prev) => {
          if (prev.pageCount !== pageCount) return prev
          const nextHeights = [...prev.heights]
          const nextWidths = [...prev.widths]
          pendingHeights.forEach((value, index) => {
            nextHeights[index] = value
          })
          pendingWidths.forEach((value, index) => {
            nextWidths[index] = value
          })
          return {
            ...prev,
            heights: nextHeights,
            widths: nextWidths,
          }
        })
        pendingHeights.clear()
        pendingWidths.clear()
      }

      for (let i = 1; i <= pageCount; i += 1) {
        if (cancelled) return
        try {
          const page = await pdfDoc.getPage(i)
          const viewport = page.getViewport({ scale })
          pendingHeights.set(i - 1, viewport?.height || estimatedHeight)
          pendingWidths.set(i - 1, viewport?.width || estimatedWidth)
        } catch {
          // use fallback estimate for this page
        }
        if (i % 16 === 0 || i === pageCount) {
          flushBatch()
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [pdfDoc, scale])

  const layoutIndex = useMemo(() => {
    const pageCount = layoutState.pageCount
    const measuredHeights = layoutState.heights.map((height) => height || layoutState.estimatedHeight || 0)
    const { offsets, totalHeight } = buildLayoutOffsets(measuredHeights, gap)
    const maxWidth = layoutState.widths.reduce((max, width) => Math.max(max, width || 0), 0)

    return {
      pageCount,
      offsets,
      totalHeight,
      maxWidth,
      getPageTop(pageNumber) {
        if (!pageNumber || pageNumber < 1 || pageNumber > pageCount) return 0
        return offsets[pageNumber - 1] || 0
      },
      getPageHeight(pageNumber) {
        if (!pageNumber || pageNumber < 1 || pageNumber > pageCount) return layoutState.estimatedHeight || 0
        return measuredHeights[pageNumber - 1] || layoutState.estimatedHeight || 0
      },
      offsetToPage(offsetValue) {
        return pageFromOffset(offsetValue, offsets, measuredHeights, gap)
      },
    }
  }, [layoutState, gap])

  return layoutIndex
}
