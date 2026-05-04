import { generateId } from './storage'

function normalizeLocation(location) {
  if (!location || typeof location !== 'object') return null
  return {
    kind: location.kind ?? null,
    page: location.page ?? null,
    cfi: location.cfi ?? null,
    scrollOffset: location.scrollOffset ?? null,
    yOffsetWithinPage: location.yOffsetWithinPage ?? null,
  }
}

export function getStudyStackEntryKey(entry = {}) {
  return [
    entry.sourceItemId || entry.itemId || '',
    entry.annotationId || entry.id || entry.text || '',
    entry.type || '',
    entry.format || '',
  ].join('::')
}

export function normalizeStudyStackEntry(entry = {}) {
  const sourceItemId = entry.sourceItemId ?? entry.itemId ?? null
  return {
    id: entry.id || generateId(),
    annotationId: entry.annotationId ?? null,
    sourceItemId,
    itemId: sourceItemId,
    itemTitle: entry.itemTitle || 'Untitled',
    type: entry.type || 'note',
    format: entry.format || 'book',
    text: entry.text || '',
    note: entry.note || '',
    location: normalizeLocation(entry.location),
    locationLabel: entry.locationLabel ?? null,
    linkedBookId: entry.linkedBookId ?? null,
    linkedBookTitle: entry.linkedBookTitle ?? null,
    createdAt: entry.createdAt ?? null,
    savedAt: entry.savedAt || new Date().toISOString(),
    lastReviewedAt: entry.lastReviewedAt ?? null,
    completedAt: entry.completedAt ?? null,
  }
}

export function normalizeStudySession(session = {}) {
  if (!session || typeof session !== 'object') return null

  const normalized = {
    startedAt: session.startedAt ?? null,
    lastActivityAt: session.lastActivityAt ?? null,
    completedAt: session.completedAt ?? null,
  }

  return normalized.startedAt || normalized.lastActivityAt || normalized.completedAt
    ? normalized
    : null
}

export function deriveStudySessionCompletedAt(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return null
  if (entries.some((entry) => !entry.completedAt)) return null
  return entries
    .map((entry) => entry.completedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))
    .at(-1) || null
}

export function buildStudyStackNavigation(book, currentEntryId) {
  const stack = Array.isArray(book?.studyStack) ? book.studyStack : []
  const currentIndex = stack.findIndex((entry) => entry.id === currentEntryId)
  if (currentIndex === -1) {
    return {
      stack,
      currentEntry: null,
      currentIndex: -1,
      nextEntry: stack.find((entry) => !entry.completedAt) || stack[0] || null,
    }
  }

  const currentEntry = stack[currentIndex]
  const nextEntry = stack.slice(currentIndex + 1).find((entry) => !entry.completedAt)
    || stack.find((entry) => !entry.completedAt && entry.id !== currentEntryId)
    || null

  return {
    stack,
    currentEntry,
    currentIndex,
    nextEntry,
  }
}

export function createStudyStackEntry(annotation, book) {
  return normalizeStudyStackEntry({
    annotationId: annotation?.id ?? null,
    sourceItemId: annotation?.itemId ?? book?.id ?? null,
    itemTitle: annotation?.itemTitle || book?.title || 'Untitled',
    type: annotation?.type || 'note',
    format: annotation?.format || 'book',
    text: annotation?.text || '',
    note: annotation?.note || '',
    location: annotation?.location || null,
    locationLabel: annotation?.locationLabel ?? null,
    linkedBookId: annotation?.linkedBookId ?? (annotation?.format === 'book' ? book?.id ?? null : null),
    linkedBookTitle: annotation?.linkedBookTitle ?? (annotation?.format === 'book' ? book?.title ?? null : null),
    createdAt: annotation?.createdAt ?? null,
    savedAt: new Date().toISOString(),
    lastReviewedAt: null,
    completedAt: null,
  })
}
