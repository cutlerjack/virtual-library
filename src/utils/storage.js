const STORAGE_KEYS = {
  BOOKS: 'virtual-library-books',
  SHELVES: 'virtual-library-shelves',
  USER_DATA: 'virtual-library-user',
  SPINE_LIBRARY: 'virtual-library-spine-library',
}

export const defaultShelves = [
  { id: 'all', name: 'All Books', color: '#8b4513', order: 0, isDefault: true },
  { id: 'favorites', name: 'Favorites', color: '#c4844a', order: 1 },
  { id: 'to-read', name: 'To Re-read', color: '#6b3410', order: 2 },
]

export const defaultUserData = {
  yearlyGoal: 12,
  theme: 'classic',
  displayName: 'My Library',
  lightingPreset: 'golden',
  woodTone: 'walnut',
  shelfFont: 'cinzel',
  soundEnabled: false,
  ratingScale: 10,
  ratingMigrated: false,
  exhibits: [],
  quests: [
    { id: 'monthly-books', label: 'Finish 2 books this month', target: 2, type: 'books' },
    { id: 'monthly-pages', label: 'Read 300 pages this month', target: 300, type: 'pages' },
    { id: 'quotes', label: 'Capture 3 memorable quotes', target: 3, type: 'quotes' },
  ],
  statsAdjustments: {},
  readingStreak: { current: 0, best: 0, lastDate: null },
  activityLog: [],
  lastRescanAt: null,
  readerMaxMemoryMb: 800,
  readerCachePages: 8,
  semanticSearchEnabled: false,
  autoSnapshotIntervalHours: 24,
  backupVerifyEnabled: true,
  lastSnapshotAt: null,
  pdfRenderMemoryMb: 512,
  pdfVirtualOverscanPages: 8,
  ingestJobRetentionDays: 14,
}

export function getBooks() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BOOKS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveBooks(books) {
  localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books))
}

export function getShelves() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SHELVES)
    return data ? JSON.parse(data) : defaultShelves
  } catch {
    return defaultShelves
  }
}

export function saveShelves(shelves) {
  localStorage.setItem(STORAGE_KEYS.SHELVES, JSON.stringify(shelves))
}

export function getUserData() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    return data ? { ...defaultUserData, ...JSON.parse(data) } : defaultUserData
  } catch {
    return defaultUserData
  }
}

export function saveUserData(userData) {
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData))
}

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
}

export function normalizeIsbn(isbn) {
  if (!isbn) return ''
  return String(isbn).toUpperCase().replace(/[^0-9X]/g, '')
}

function isbn10To13(isbn10) {
  if (!isbn10 || isbn10.length !== 10) return null
  const core = `978${isbn10.slice(0, 9)}`
  let sum = 0
  for (let i = 0; i < core.length; i += 1) {
    sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return `${core}${check}`
}

function isbn13To10(isbn13) {
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith('978')) return null
  const core = isbn13.slice(3, 12)
  let sum = 0
  for (let i = 0; i < core.length; i += 1) {
    sum += parseInt(core[i], 10) * (10 - i)
  }
  const check = 11 - (sum % 11)
  const checkChar = check === 10 ? 'X' : check === 11 ? '0' : String(check)
  return `${core}${checkChar}`
}

function getIsbnVariants(isbn) {
  const normalized = normalizeIsbn(isbn)
  if (!normalized) return []
  const variants = new Set([normalized])
  if (normalized.length === 10) {
    const converted = isbn10To13(normalized)
    if (converted) variants.add(converted)
  } else if (normalized.length === 13) {
    const converted = isbn13To10(normalized)
    if (converted) variants.add(converted)
  }
  return Array.from(variants)
}

export function getSpineLibrary() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SPINE_LIBRARY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function getSpineLibraryEntries() {
  const library = getSpineLibrary()
  const seen = new Set()
  const entries = []
  Object.values(library).forEach((entry) => {
    if (!entry || !entry.isbn || seen.has(entry.isbn)) return
    seen.add(entry.isbn)
    entries.push(entry)
  })
  return entries
}

export function getSpineLibraryEntriesFromMap(library) {
  if (!library) return []
  const seen = new Set()
  const entries = []
  Object.values(library).forEach((entry) => {
    if (!entry || !entry.isbn || seen.has(entry.isbn)) return
    seen.add(entry.isbn)
    entries.push(entry)
  })
  return entries
}

export function findSpineInLibraryMap(library, isbn) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0 || !library) return null
  for (const key of variants) {
    if (library[key]) return library[key]
  }
  return null
}

export function addSpineToLibraryMap(library, { isbn, spineImage, title, author, crop }) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0 || !spineImage) return library
  const entry = {
    isbn: normalizeIsbn(isbn),
    spineImage,
    crop: crop || null,
    title: title || null,
    author: author || null,
    addedAt: new Date().toISOString(),
  }
  const next = { ...(library || {}) }
  variants.forEach((key) => {
    next[key] = entry
  })
  return next
}

export function updateSpineInLibraryMap(library, { isbn, spineImage, crop }) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0 || !spineImage) return library
  const existing = findSpineInLibraryMap(library || {}, isbn)
  const entry = {
    ...existing,
    isbn: normalizeIsbn(isbn),
    spineImage,
    crop: crop || existing?.crop || null,
    updatedAt: new Date().toISOString(),
  }
  const next = { ...(library || {}) }
  variants.forEach((key) => {
    next[key] = entry
  })
  return next
}

export function removeSpineFromLibraryMap(library, isbn) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0 || !library) return library
  const next = { ...library }
  variants.forEach((key) => {
    delete next[key]
  })
  return next
}

export function saveSpineLibrary(library) {
  localStorage.setItem(STORAGE_KEYS.SPINE_LIBRARY, JSON.stringify(library))
}

export function addSpineToLibrary({ isbn, spineImage, title, author, crop }) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0 || !spineImage) return null

  const library = getSpineLibrary()
  const entry = {
    isbn: normalizeIsbn(isbn),
    spineImage,
    crop: crop || null,
    title: title || null,
    author: author || null,
    addedAt: new Date().toISOString(),
  }

  variants.forEach((key) => {
    library[key] = entry
  })
  saveSpineLibrary(library)
  return entry
}

export function findSpineInLibrary(isbn) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0) return null
  const library = getSpineLibrary()
  for (const key of variants) {
    if (library[key]) return library[key]
  }
  return null
}

export function updateSpineInLibrary({ isbn, spineImage, crop }) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0 || !spineImage) return null
  const library = getSpineLibrary()
  const existing = findSpineInLibrary(isbn)
  const entry = {
    ...existing,
    isbn: normalizeIsbn(isbn),
    spineImage,
    crop: crop || existing?.crop || null,
    updatedAt: new Date().toISOString(),
  }
  variants.forEach((key) => {
    library[key] = entry
  })
  saveSpineLibrary(library)
  return entry
}

export function removeSpineFromLibrary(isbn) {
  const variants = getIsbnVariants(isbn)
  if (variants.length === 0) return false
  const library = getSpineLibrary()
  variants.forEach((key) => {
    delete library[key]
  })
  saveSpineLibrary(library)
  return true
}
