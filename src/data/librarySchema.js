import { defaultShelves, defaultUserData, generateId, findSpineInLibraryMap } from '../utils/storage'

export function normalizeTimestamp(value) {
  if (!value) return new Date().toISOString()
  return value
}

export function normalizeBookMeta(meta = {}) {
  return {
    isbn: meta.isbn ?? null,
    pageCount: meta.pageCount ?? null,
    dateStarted: meta.dateStarted ?? null,
    dateFinished: meta.dateFinished ?? null,
    publishedDate: meta.publishedDate ?? null,
    shelfDetail: meta.shelfDetail ?? '',
    wearLevel: typeof meta.wearLevel === 'number' ? meta.wearLevel : 0,
    lastTouched: meta.lastTouched ?? null,
    memories: Array.isArray(meta.memories) ? meta.memories : [],
    pagesRead: typeof meta.pagesRead === 'number' ? meta.pagesRead : 0,
    readingLogs: Array.isArray(meta.readingLogs) ? meta.readingLogs : [],
    reflections: Array.isArray(meta.reflections) ? meta.reflections : [],
    spineStyle: meta.spineStyle ?? null,
    spineOrientation: meta.spineOrientation ?? null,
    spineTypography: meta.spineTypography ?? null,
    spineTextStyle: meta.spineTextStyle ?? null,
    spineLayout: meta.spineLayout ?? null,
    spineMetallic: typeof meta.spineMetallic === 'boolean' ? meta.spineMetallic : false,
    spineTypographyWeight: meta.spineTypographyWeight ?? null,
    spineImage: meta.spineImage ?? null,
    spineSource: meta.spineSource ?? null,
    spineCrop: meta.spineCrop ?? null,
    spineColor: meta.spineColor ?? null,
    spineTexture: meta.spineTexture ?? null,
    spineFont: meta.spineFont ?? null,
  }
}

const VALID_BOOK_STATUSES = ['to-read', 'reading', 'read', 'dnf']

export function normalizeBookStatus(value) {
  if (VALID_BOOK_STATUSES.includes(value)) return value
  return null
}

export function normalizeBookItem(item = {}) {
  const meta = normalizeBookMeta({
    ...(item.bookMeta || {}),
    publishedDate: item.publishedDate ?? item.bookMeta?.publishedDate,
    spineImage: item.spineImage ?? item.bookMeta?.spineImage,
    spineSource: item.spineSource ?? item.bookMeta?.spineSource,
    spineCrop: item.spineCrop ?? item.bookMeta?.spineCrop,
    spineColor: item.spineColor ?? item.bookMeta?.spineColor,
    spineTexture: item.spineTexture ?? item.bookMeta?.spineTexture,
    spineFont: item.spineFont ?? item.bookMeta?.spineFont,
  })

  return {
    id: item.id || generateId(),
    kind: 'book',
    title: item.title || 'Untitled',
    author: item.author || 'Unknown Author',
    status: normalizeBookStatus(item.status),
    tags: Array.isArray(item.tags) ? item.tags : [],
    shelves: Array.isArray(item.shelves) ? item.shelves : [],
    coverUrl: item.coverUrl ?? null,
    thumbnail: item.thumbnail ?? null,
    rating: typeof item.rating === 'number' ? item.rating : 0,
    notes: item.notes ?? '',
    quotes: Array.isArray(item.quotes) ? item.quotes : [],
    createdAt: normalizeTimestamp(item.createdAt),
    updatedAt: normalizeTimestamp(item.updatedAt || item.createdAt),
    bookMeta: meta,
  }
}

export function normalizeDocumentItem(item = {}) {
  const meta = item.docMeta || {}
  const reading = item.reading || {}
  const annotations = item.annotations || {}
  return {
    id: item.id || generateId(),
    kind: item.kind || 'document',
    title: item.title || 'Untitled',
    author: item.author || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    shelves: Array.isArray(item.shelves) ? item.shelves : [],
    coverUrl: item.coverUrl ?? null,
    thumbnail: item.thumbnail ?? null,
    createdAt: normalizeTimestamp(item.createdAt),
    updatedAt: normalizeTimestamp(item.updatedAt || item.createdAt),
    docMeta: {
      filePath: meta.filePath ?? null,
      fileName: meta.fileName ?? null,
      originalName: meta.originalName ?? meta.fileName ?? null,
      type: meta.type ?? 'file',
      sourceUrl: meta.sourceUrl ?? null,
      publishedDate: meta.publishedDate ?? item.publishedDate ?? null,
      originalUrl: meta.originalUrl ?? null,
      ingestSource: meta.ingestSource ?? null,
      mime: meta.mime ?? null,
      pageCount: meta.pageCount ?? null,
      scanned: typeof meta.scanned === 'boolean' ? meta.scanned : false,
      ocrConfidence: typeof meta.ocrConfidence === 'number' ? meta.ocrConfidence : null,
      searchText: meta.searchText ?? null,
      fileHash: meta.fileHash ?? null,
      fileSize: meta.fileSize ?? null,
      fileMtime: meta.fileMtime ?? null,
      fileStatus: meta.fileStatus ?? null,
    },
    reading: {
      lastOpened: reading.lastOpened ?? null,
      progressPercent: reading.progressPercent ?? null,
      lastPage: reading.lastPage ?? null,
      pageCount: reading.pageCount ?? null,
      lastLocation: reading.lastLocation ?? null,
      lastLocationJson: reading.lastLocationJson ?? null,
      mode: reading.mode ?? null,
      layout: reading.layout ?? null,
      fontSize: reading.fontSize ?? null,
      contentWidth: reading.contentWidth ?? null,
    },
    annotations: {
      notes: Array.isArray(annotations.notes) ? annotations.notes : [],
      highlights: Array.isArray(annotations.highlights) ? annotations.highlights : [],
    },
  }
}

export function createBookItemFromBook(book = {}) {
  return normalizeBookItem({
    id: book.id || generateId(),
    kind: 'book',
    title: book.title,
    author: book.author,
    status: book.status ?? null,
    tags: book.tags,
    shelves: book.shelves,
    coverUrl: book.coverUrl ?? null,
    thumbnail: book.thumbnail ?? null,
    rating: book.rating,
    notes: book.notes,
    quotes: book.quotes,
    createdAt: book.addedAt || book.createdAt,
    updatedAt: book.lastTouched || book.updatedAt || book.addedAt,
    bookMeta: {
      isbn: book.isbn ?? null,
      pageCount: book.pageCount ?? null,
      dateStarted: book.dateStarted ?? null,
      dateFinished: book.dateFinished ?? null,
      publishedDate: book.publishedDate ?? null,
      shelfDetail: book.shelfDetail ?? '',
      wearLevel: book.wearLevel ?? 0,
      lastTouched: book.lastTouched ?? null,
      memories: book.memories ?? [],
      pagesRead: book.pagesRead ?? 0,
      readingLogs: book.readingLogs ?? [],
      reflections: book.reflections ?? [],
      spineStyle: book.spineStyle ?? null,
      spineOrientation: book.spineOrientation ?? null,
      spineTypography: book.spineTypography ?? null,
      spineTextStyle: book.spineTextStyle ?? null,
      spineLayout: book.spineLayout ?? null,
      spineMetallic: book.spineMetallic ?? false,
      spineTypographyWeight: book.spineTypographyWeight ?? null,
      spineImage: book.spineImage ?? null,
      spineSource: book.spineSource ?? null,
      spineCrop: book.spineCrop ?? null,
      spineColor: book.spineColor ?? null,
      spineTexture: book.spineTexture ?? null,
      spineFont: book.spineFont ?? null,
    },
  })
}

export function createDocumentItemFromDoc(doc = {}) {
  return normalizeDocumentItem({
    id: doc.id || generateId(),
    kind: doc.kind || 'document',
    title: doc.title || doc.originalName,
    author: doc.author || null,
    tags: doc.tags,
    shelves: doc.shelves,
    thumbnail: doc.thumbnail ?? null,
    createdAt: doc.addedAt || doc.createdAt,
    updatedAt: doc.lastOpened || doc.updatedAt || doc.addedAt,
    docMeta: {
      filePath: doc.filePath,
      fileName: doc.fileName,
      originalName: doc.originalName || doc.fileName,
      type: doc.type || 'file',
      sourceUrl: doc.sourceUrl || null,
      publishedDate: doc.publishedDate || null,
      originalUrl: doc.originalUrl || null,
      ingestSource: doc.ingestSource || null,
      mime: doc.mime || null,
      pageCount: doc.pageCount ?? null,
      scanned: typeof doc.scanned === 'boolean' ? doc.scanned : false,
      ocrConfidence: typeof doc.ocrConfidence === 'number' ? doc.ocrConfidence : null,
      searchText: doc.searchText || null,
      fileHash: doc.fileHash || null,
      fileSize: doc.fileSize || null,
      fileMtime: doc.fileMtime || null,
      fileStatus: doc.fileStatus || null,
    },
    reading: {
      lastOpened: doc.lastOpened ?? null,
      progressPercent: doc.progressPercent ?? null,
      lastPage: doc.lastPage ?? null,
      pageCount: doc.pageCount ?? null,
      lastLocation: doc.lastLocation ?? null,
      lastLocationJson: doc.lastLocationJson ?? null,
      mode: doc.mode ?? null,
      layout: doc.layout ?? null,
      fontSize: doc.fontSize ?? null,
      contentWidth: doc.contentWidth ?? null,
    },
    annotations: {
      notes: doc.notes ?? [],
      highlights: doc.highlights ?? [],
    },
  })
}

export function itemToBook(item) {
  if (!item || item.kind !== 'book') return null
  const normalized = normalizeBookItem(item)
  const meta = normalized.bookMeta || {}
  return {
    id: normalized.id,
    title: normalized.title,
    author: normalized.author,
    status: normalized.status,
    tags: normalized.tags || [],
    shelves: normalized.shelves || [],
    coverUrl: normalized.coverUrl ?? null,
    rating: normalized.rating || 0,
    notes: normalized.notes || '',
    quotes: normalized.quotes || [],
    spineImage: meta.spineImage || null,
    spineSource: meta.spineSource || null,
    spineCrop: meta.spineCrop || null,
    spineColor: meta.spineColor || null,
    spineTexture: meta.spineTexture || null,
    spineFont: meta.spineFont || null,
    pageCount: meta.pageCount || null,
    dateStarted: meta.dateStarted || null,
    dateFinished: meta.dateFinished || null,
    publishedDate: meta.publishedDate || null,
    addedAt: normalized.createdAt || new Date().toISOString(),
    isbn: meta.isbn || null,
    shelfDetail: meta.shelfDetail || '',
    wearLevel: meta.wearLevel || 0,
    lastTouched: meta.lastTouched || null,
    memories: meta.memories || [],
    pagesRead: meta.pagesRead || 0,
    readingLogs: meta.readingLogs || [],
    reflections: meta.reflections || [],
    spineStyle: meta.spineStyle || null,
    spineOrientation: meta.spineOrientation || null,
    spineTypography: meta.spineTypography || null,
    spineTextStyle: meta.spineTextStyle || null,
    spineLayout: meta.spineLayout || null,
    spineMetallic: meta.spineMetallic || false,
    spineTypographyWeight: meta.spineTypographyWeight || null,
  }
}

export function itemToDocument(item) {
  if (!item || (item.kind !== 'document' && item.kind !== 'article')) return null
  const normalized = normalizeDocumentItem(item)
  const meta = normalized.docMeta || {}
  const reading = normalized.reading || {}
  const annotations = normalized.annotations || {}
  return {
    id: normalized.id,
    title: normalized.title,
    author: normalized.author || null,
    tags: normalized.tags || [],
    shelves: normalized.shelves || [],
    thumbnail: normalized.thumbnail || null,
    filePath: meta.filePath,
    fileName: meta.fileName,
    originalName: meta.originalName,
    type: meta.type || 'file',
    sourceUrl: meta.sourceUrl || null,
    publishedDate: meta.publishedDate || null,
    originalUrl: meta.originalUrl || null,
    ingestSource: meta.ingestSource || null,
    mime: meta.mime || null,
    filePageCount: meta.pageCount ?? null,
    scanned: typeof meta.scanned === 'boolean' ? meta.scanned : false,
    ocrConfidence: typeof meta.ocrConfidence === 'number' ? meta.ocrConfidence : null,
    searchText: meta.searchText || null,
    fileHash: meta.fileHash || null,
    fileSize: meta.fileSize || null,
    fileMtime: meta.fileMtime || null,
    fileStatus: meta.fileStatus || null,
    addedAt: normalized.createdAt || null,
    lastOpened: reading.lastOpened || null,
    progressPercent: reading.progressPercent ?? null,
    lastPage: reading.lastPage || null,
    pageCount: reading.pageCount ?? meta.pageCount ?? null,
    lastLocation: reading.lastLocation || null,
    lastLocationJson: reading.lastLocationJson || null,
    mode: reading.mode || null,
    layout: reading.layout || null,
    fontSize: reading.fontSize || null,
    contentWidth: reading.contentWidth || null,
    notes: annotations.notes || [],
    highlights: annotations.highlights || [],
  }
}

export function mergeBookIntoItem(item, bookUpdate = {}) {
  if (!item || item.kind !== 'book') return item
  const meta = normalizeBookMeta(item.bookMeta || {})
  const nextMeta = normalizeBookMeta({
    ...meta,
    isbn: bookUpdate.isbn ?? meta.isbn,
    pageCount: bookUpdate.pageCount ?? meta.pageCount,
    dateStarted: bookUpdate.dateStarted ?? meta.dateStarted,
    dateFinished: bookUpdate.dateFinished ?? meta.dateFinished,
    publishedDate: bookUpdate.publishedDate ?? meta.publishedDate,
    shelfDetail: bookUpdate.shelfDetail ?? meta.shelfDetail,
    wearLevel: bookUpdate.wearLevel ?? meta.wearLevel,
    lastTouched: bookUpdate.lastTouched ?? meta.lastTouched,
    memories: bookUpdate.memories ?? meta.memories,
    pagesRead: bookUpdate.pagesRead ?? meta.pagesRead,
    readingLogs: bookUpdate.readingLogs ?? meta.readingLogs,
    reflections: bookUpdate.reflections ?? meta.reflections,
    spineStyle: bookUpdate.spineStyle ?? meta.spineStyle,
    spineOrientation: bookUpdate.spineOrientation ?? meta.spineOrientation,
    spineTypography: bookUpdate.spineTypography ?? meta.spineTypography,
    spineTextStyle: bookUpdate.spineTextStyle ?? meta.spineTextStyle,
    spineLayout: bookUpdate.spineLayout ?? meta.spineLayout,
    spineMetallic: bookUpdate.spineMetallic ?? meta.spineMetallic,
    spineTypographyWeight: bookUpdate.spineTypographyWeight ?? meta.spineTypographyWeight,
    spineImage: bookUpdate.spineImage ?? meta.spineImage,
    spineSource: bookUpdate.spineSource ?? meta.spineSource,
    spineCrop: bookUpdate.spineCrop ?? meta.spineCrop,
    spineColor: bookUpdate.spineColor ?? meta.spineColor,
    spineTexture: bookUpdate.spineTexture ?? meta.spineTexture,
    spineFont: bookUpdate.spineFont ?? meta.spineFont,
  })

  return normalizeBookItem({
    ...item,
    title: bookUpdate.title ?? item.title,
    author: bookUpdate.author ?? item.author,
    status: bookUpdate.status ?? item.status,
    tags: bookUpdate.tags ?? item.tags,
    shelves: bookUpdate.shelves ?? item.shelves,
    coverUrl: bookUpdate.coverUrl ?? item.coverUrl,
    rating: bookUpdate.rating ?? item.rating,
    notes: bookUpdate.notes ?? item.notes,
    quotes: bookUpdate.quotes ?? item.quotes,
    updatedAt: new Date().toISOString(),
    bookMeta: nextMeta,
  })
}

export function mergeDocumentIntoItem(item, docUpdate = {}) {
  if (!item || (item.kind !== 'document' && item.kind !== 'article')) return item
  const meta = item.docMeta || {}
  const reading = item.reading || {}
  const annotations = item.annotations || {}

  return normalizeDocumentItem({
    ...item,
    title: docUpdate.title ?? item.title,
    author: docUpdate.author ?? item.author,
    tags: docUpdate.tags ?? item.tags,
    shelves: docUpdate.shelves ?? item.shelves,
    thumbnail: docUpdate.thumbnail ?? item.thumbnail,
    updatedAt: new Date().toISOString(),
    docMeta: {
      ...meta,
      filePath: docUpdate.filePath ?? meta.filePath,
      fileName: docUpdate.fileName ?? meta.fileName,
      originalName: docUpdate.originalName ?? meta.originalName,
      type: docUpdate.type ?? meta.type,
      sourceUrl: docUpdate.sourceUrl ?? meta.sourceUrl,
      publishedDate: docUpdate.publishedDate ?? meta.publishedDate,
      originalUrl: docUpdate.originalUrl ?? meta.originalUrl,
      ingestSource: docUpdate.ingestSource ?? meta.ingestSource,
      mime: docUpdate.mime ?? meta.mime,
      pageCount: docUpdate.pageCount ?? meta.pageCount,
      scanned: docUpdate.scanned ?? meta.scanned,
      ocrConfidence: docUpdate.ocrConfidence ?? meta.ocrConfidence,
      searchText: docUpdate.searchText ?? meta.searchText,
      fileHash: docUpdate.fileHash ?? meta.fileHash,
      fileSize: docUpdate.fileSize ?? meta.fileSize,
      fileMtime: docUpdate.fileMtime ?? meta.fileMtime,
      fileStatus: docUpdate.fileStatus ?? meta.fileStatus,
    },
    reading: {
      ...reading,
      lastOpened: docUpdate.lastOpened ?? reading.lastOpened,
      progressPercent: docUpdate.progressPercent ?? reading.progressPercent,
      lastPage: docUpdate.lastPage ?? reading.lastPage,
      pageCount: docUpdate.pageCount ?? reading.pageCount,
      lastLocation: docUpdate.lastLocation ?? reading.lastLocation,
      lastLocationJson: docUpdate.lastLocationJson ?? reading.lastLocationJson,
      mode: docUpdate.mode ?? reading.mode,
      layout: docUpdate.layout ?? reading.layout,
      fontSize: docUpdate.fontSize ?? reading.fontSize,
      contentWidth: docUpdate.contentWidth ?? reading.contentWidth,
    },
    annotations: {
      ...annotations,
      notes: docUpdate.notes ?? annotations.notes,
      highlights: docUpdate.highlights ?? annotations.highlights,
    },
  })
}

export function applySpineLibraryToBookItem(item, spineLibrary) {
  if (!item || item.kind !== 'book') return item
  const meta = normalizeBookMeta(item.bookMeta || {})
  if (!meta.isbn) return item
  const match = findSpineInLibraryMap(spineLibrary || {}, meta.isbn)
  if (!match?.spineImage) return item

  const nextMeta = {
    ...meta,
    spineImage: meta.spineImage || match.spineImage,
    spineSource: meta.spineSource || 'photo',
    spineCrop: meta.spineCrop || match.crop || null,
  }

  return normalizeBookItem({
    ...item,
    bookMeta: nextMeta,
  })
}

export function migrateLibraryStateToV2(state = {}) {
  const shelves = Array.isArray(state.shelves) && state.shelves.length > 0
    ? state.shelves
    : defaultShelves
  const user = { ...defaultUserData, ...(state.user || {}) }
  const spineLibrary = state.spineLibrary || {}
  const items = Array.isArray(state.items)
    ? state.items.map((item) => {
        if (item?.kind === 'book') {
          const normalized = normalizeBookItem(item)
          return applySpineLibraryToBookItem(normalized, spineLibrary)
        }
        if (item?.kind === 'document') {
          return normalizeDocumentItem(item)
        }
        return item
      })
    : []

  return {
    version: 2,
    items,
    shelves,
    user,
    spineLibrary,
  }
}

function inferStatusFromBook(item) {
  const meta = item.bookMeta || {}
  if (meta.dateFinished) return 'read'
  if (meta.dateStarted || meta.pagesRead > 0) return 'reading'
  return null
}

export function migrateLibraryStateToV3(state = {}) {
  const base = state.version < 2 ? migrateLibraryStateToV2(state) : state
  const items = (base.items || []).map((item) => {
    if (item?.kind !== 'book') return item
    if (item.status) return item
    return { ...item, status: inferStatusFromBook(item) }
  })

  return {
    ...base,
    version: 3,
    items,
  }
}

export function migrateLibraryState(state = {}) {
  const version = state.version || 0
  if (version < 2) {
    return migrateLibraryStateToV3(migrateLibraryStateToV2(state))
  }
  if (version < 3) {
    return migrateLibraryStateToV3(state)
  }
  return state
}
