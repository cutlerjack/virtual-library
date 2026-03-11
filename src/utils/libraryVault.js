import { createDir, exists, readTextFile, writeTextFile, copyFile, readDir, readBinaryFile } from '@tauri-apps/api/fs'
import { homeDir, downloadDir, join, basename } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/api/dialog'
import { isTauri } from './tauri'
import { defaultShelves, generateId } from './storage'
import { computeSha256 } from './fileHash'
import { extractPdfText, extractEpubText, extractHtmlText } from './textExtract'

const LIBRARY_KEY = 'virtual-library-path'
const INDEX_FILENAME = 'index.json'
const SUBFOLDERS = ['library', 'thumbs', 'annotations', 'articles', 'snapshots']

export async function getDefaultLibraryPath() {
  const home = await homeDir()
  return join(home, 'VirtualLibrary', 'Library')
}

export function getStoredLibraryPath() {
  return localStorage.getItem(LIBRARY_KEY)
}

export function setStoredLibraryPath(path) {
  localStorage.setItem(LIBRARY_KEY, path)
}

export async function ensureLibraryFolders(libraryPath) {
  if (!isTauri()) return null
  if (!(await exists(libraryPath))) {
    await createDir(libraryPath, { recursive: true })
  }
  for (const folder of SUBFOLDERS) {
    const folderPath = await join(libraryPath, folder)
    if (!(await exists(folderPath))) {
      await createDir(folderPath, { recursive: true })
    }
  }
  const indexPath = await join(libraryPath, INDEX_FILENAME)
  return indexPath
}

export async function loadLibraryIndex(libraryPath) {
  if (!isTauri()) return { documents: [] }
  const indexPath = await join(libraryPath, INDEX_FILENAME)
  try {
    const raw = await readTextFile(indexPath)
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.documents)) return { documents: [] }
    return data
  } catch {
    return { documents: [] }
  }
}

export async function saveLibraryIndex(libraryPath, index) {
  if (!isTauri()) return
  const indexPath = await join(libraryPath, INDEX_FILENAME)
  await writeTextFile(indexPath, JSON.stringify(index, null, 2))
}

function normalizeTitle(filename) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

function getDocType(filename) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.epub')) return 'epub'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'article'
  return 'file'
}

function getMimeType(filename) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.epub')) return 'application/epub+zip'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html'
  return 'application/octet-stream'
}

async function generateTargetName(targetDir, originalName) {
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : ''
  let candidate = `${baseName}${extension}`
  let counter = 1
  while (await exists(await join(targetDir, candidate))) {
    candidate = `${baseName}-${counter}${extension}`
    counter += 1
  }
  return candidate
}

async function normalizeDialogPath(rawPath) {
  if (!rawPath) return rawPath
  let path = String(rawPath)
  if (path.startsWith('file://')) {
    path = decodeURIComponent(path.replace('file://', ''))
  }
  if (path === '~' || path.startsWith('~/')) {
    const home = await homeDir()
    const relative = path === '~' ? '' : path.slice(2)
    path = await join(home, relative)
  }
  return path
}

async function normalizeDialogSelection(selection) {
  if (!selection) return null
  if (Array.isArray(selection)) {
    const normalized = []
    for (const entry of selection) {
      const cleaned = await normalizeDialogPath(entry)
      if (cleaned) normalized.push(cleaned)
    }
    return normalized.length > 0 ? normalized : null
  }
  return normalizeDialogPath(selection)
}

export async function chooseLibraryFolder() {
  if (!isTauri()) return null
  const selection = await open({ directory: true, multiple: false })
  const normalized = await normalizeDialogSelection(selection)
  if (!normalized) return null
  return Array.isArray(normalized) ? normalized[0] : normalized
}

export async function importLibraryFiles(libraryPath) {
  if (!isTauri()) return []
  const selection = await open({
    multiple: true,
    filters: [
      { name: 'Documents', extensions: ['pdf', 'epub', 'html', 'htm'] },
    ],
  })
  const normalized = await normalizeDialogSelection(selection)
  if (!normalized) return []
  const files = Array.isArray(normalized) ? normalized : [normalized]
  const targetDir = await join(libraryPath, 'library')
  const imported = []

  for (const sourcePath of files) {
    const name = await basename(sourcePath)
    const targetName = await generateTargetName(targetDir, name)
    const targetPath = await join(targetDir, targetName)
    try {
      await copyFile(sourcePath, targetPath)
      const binary = await readBinaryFile(targetPath)
      const hash = await computeSha256(binary)
      let searchText = ''
      const type = getDocType(targetName)
      const mime = getMimeType(targetName)
      if (type === 'pdf') searchText = await extractPdfText(binary)
      if (type === 'epub') searchText = await extractEpubText(binary)
      if (type === 'article') searchText = extractHtmlText(new TextDecoder().decode(binary))
      imported.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: normalizeTitle(targetName),
        originalName: name,
        fileName: targetName,
        filePath: targetPath,
        type,
        mime,
        ingestSource: 'import',
        fileHash: hash,
        fileSize: binary?.byteLength ?? binary?.length ?? null,
        fileMtime: null,
        fileStatus: 'ok',
        searchText,
        addedAt: new Date().toISOString(),
      })
    } catch (error) {
      throw new Error(`Unable to copy ${name}. ${error?.message || ''}`.trim())
    }
  }

  return imported
}

function parseExportDate(filename) {
  const match = filename.match(/virtual-library-export-(\d{4}-\d{2}-\d{2})\.json/i)
  if (!match) return null
  const date = new Date(match[1])
  return Number.isNaN(date.getTime()) ? null : date
}

async function listExportFiles(dirPath) {
  const entries = await readDir(dirPath, { recursive: false })
  return entries
    .filter((entry) => entry.name && entry.name.endsWith('.json'))
    .map((entry) => ({
      name: entry.name,
      path: entry.path,
      date: parseExportDate(entry.name),
    }))
    .filter((entry) => entry.date)
}

export async function findLatestExportFile(libraryPath) {
  if (!isTauri()) return null
  let downloadsPath = null
  try {
    downloadsPath = await downloadDir()
  } catch {
    const home = await homeDir()
    downloadsPath = await join(home, 'Downloads')
  }
  const sources = []
  try {
    if (downloadsPath) {
      sources.push(...await listExportFiles(downloadsPath))
    }
  } catch {
    // ignore
  }
  if (libraryPath) {
    try {
      sources.push(...await listExportFiles(libraryPath))
    } catch {
      // ignore
    }
  }
  if (sources.length === 0) return null
  sources.sort((a, b) => b.date - a.date)
  return sources[0]
}

export async function loadExportPayload(filePath) {
  if (!isTauri()) return null
  try {
    const raw = await readTextFile(filePath)
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

function buildBookKey(entry) {
  const isbn = normalizeIsbnSafe(entry.isbn)
  if (isbn) return `isbn:${isbn}`
  const title = (entry.title || '').trim().toLowerCase()
  const author = (entry.author || '').trim().toLowerCase()
  return `meta:${title}|${author}`
}

function normalizeIsbnSafe(isbn) {
  if (!isbn) return ''
  return String(isbn).toUpperCase().replace(/[^0-9X]/g, '')
}

function mergeUniqueStrings(list) {
  return Array.from(new Set((list || []).map(item => String(item).trim()).filter(Boolean)))
}

function mergeUniqueQuotes(list) {
  const seen = new Set()
  return (list || []).filter((q) => {
    const text = (typeof q === 'string' ? q : q?.text || '').trim()
    if (!text || seen.has(text)) return false
    seen.add(text)
    return true
  })
}

function mergeShelves(existing, incoming) {
  const combined = [...(existing || []), ...(incoming || [])].filter(Boolean)
  return Array.from(new Set(combined))
}

export function migrateExportToLibraryState(payload, currentShelves = [], currentBooks = []) {
  const baseShelves = currentShelves.length > 0 ? currentShelves : defaultShelves
  const shelfNameMap = new Map(baseShelves.map((shelf) => [shelf.name, shelf.id]))
  const nextShelves = [...baseShelves]

  const getShelfId = (name) => {
    if (!name) return null
    if (shelfNameMap.has(name)) return shelfNameMap.get(name)
    const newShelf = {
      id: generateId(),
      name,
      color: '#8b4513',
      order: nextShelves.length,
    }
    nextShelves.push(newShelf)
    shelfNameMap.set(name, newShelf.id)
    return newShelf.id
  }

  const existingByKey = new Map()
  currentBooks.forEach((book) => {
    existingByKey.set(buildBookKey(book), book)
  })

  const mergedBooks = [...currentBooks]

  payload.forEach((entry) => {
    const key = buildBookKey(entry)
    const shelfIds = (entry.shelves || []).map(getShelfId).filter(Boolean)
    const existing = existingByKey.get(key)
    if (existing) {
      const updated = {
        ...existing,
        title: existing.title || entry.title || 'Untitled',
        author: existing.author || entry.author || 'Unknown Author',
        isbn: existing.isbn || entry.isbn || null,
        rating: existing.rating || entry.rating || 0,
        notes: existing.notes || entry.notes || '',
        quotes: mergeUniqueQuotes([...(existing.quotes || []), ...(entry.quotes || [])]),
        tags: mergeUniqueStrings([...(existing.tags || []), ...(entry.tags || [])]),
        shelves: mergeShelves(existing.shelves, shelfIds),
        pageCount: existing.pageCount || entry.pageCount || null,
        dateStarted: existing.dateStarted || entry.dateStarted || null,
        dateFinished: existing.dateFinished || entry.dateFinished || null,
        publishedDate: existing.publishedDate || entry.publishedDate || null,
        addedAt: existing.addedAt || entry.addedAt || new Date().toISOString(),
        coverUrl: existing.coverUrl || entry.coverUrl || null,
        shelfDetail: existing.shelfDetail || entry.author || '',
      }
      const idx = mergedBooks.findIndex((book) => book.id === existing.id)
      if (idx >= 0) mergedBooks[idx] = updated
      existingByKey.set(key, updated)
      return
    }

    const newBook = {
      id: generateId(),
      title: entry.title || 'Untitled',
      author: entry.author || 'Unknown Author',
      isbn: entry.isbn || null,
      rating: entry.rating || 0,
      notes: entry.notes || '',
      quotes: entry.quotes || [],
      tags: entry.tags || [],
      shelves: shelfIds,
      pageCount: entry.pageCount || null,
      dateStarted: entry.dateStarted || null,
      dateFinished: entry.dateFinished || null,
      publishedDate: entry.publishedDate || null,
      addedAt: entry.addedAt || new Date().toISOString(),
      coverUrl: entry.coverUrl || null,
      shelfDetail: entry.author || '',
      wearLevel: 0,
      lastTouched: null,
      memories: [],
      pagesRead: 0,
      readingLogs: [],
      reflections: [],
    }
    mergedBooks.push(newBook)
    existingByKey.set(key, newBook)
  })

  return { shelves: nextShelves, books: mergedBooks }
}
