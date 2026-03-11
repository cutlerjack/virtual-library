export function normalizeLocation(location) {
  if (!location || typeof location !== 'object') return null
  return {
    kind: location.kind || null,
    page: typeof location.page === 'number' ? location.page : null,
    cfi: location.cfi || null,
    xpath: location.xpath || null,
    scrollOffset: typeof location.scrollOffset === 'number' ? location.scrollOffset : null,
    yOffsetWithinPage: typeof location.yOffsetWithinPage === 'number' ? location.yOffsetWithinPage : null,
    anchorId: location.anchorId || null,
    rects: Array.isArray(location.rects) ? location.rects : null,
  }
}

export function buildPdfLocation(page, yOffsetWithinPage = null) {
  return normalizeLocation({ kind: 'pdf', page, yOffsetWithinPage })
}

export function buildEpubLocation(cfi) {
  return normalizeLocation({ kind: 'epub', cfi })
}

export function buildArticleLocation(scrollOffset, anchorId) {
  return normalizeLocation({ kind: 'article', scrollOffset, anchorId })
}

export function findRelatedNotes(notes = [], location) {
  if (!location) return []
  if (location.kind === 'pdf' && location.page) {
    return notes.filter((note) => note.page && Math.abs(note.page - location.page) <= 1)
  }
  if (location.kind === 'epub' && location.cfi) {
    const prefix = location.cfi.slice(0, 12)
    return notes.filter((note) => note.cfi && note.cfi.startsWith(prefix))
  }
  if (location.kind === 'article' && typeof location.scrollOffset === 'number') {
    return notes.filter((note) =>
      typeof note.scrollOffset === 'number'
        ? Math.abs(note.scrollOffset - location.scrollOffset) < 800
        : false
    )
  }
  return []
}
