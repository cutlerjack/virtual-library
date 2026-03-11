import Database from 'tauri-plugin-sql-api'
import { join } from '@tauri-apps/api/path'
import { exists } from '@tauri-apps/api/fs'
import { isTauri } from '../utils/tauri'
import { normalizeBookItem, normalizeDocumentItem } from './librarySchema'
import { enqueueLibraryWrite } from './libraryWriter'
import { toFtsExpression, escapeLikeValue } from './searchQuery'

const DB_VERSION = 7
const dbCache = new Map()
const dbLocks = new Map()

async function withDbLock(libraryPath, fn) {
  if (!libraryPath) return fn()
  const previous = dbLocks.get(libraryPath) || Promise.resolve()
  let release
  const next = new Promise((resolve) => {
    release = resolve
  })
  dbLocks.set(libraryPath, previous.then(() => next, () => next))
  await previous
  try {
    return await fn()
  } finally {
    release?.()
  }
}

async function withDb(libraryPath, fn) {
  return withDbLock(libraryPath, async () => {
    const db = await openDb(libraryPath)
    if (!db) return null
    await migrateDb(db)
    return fn(db)
  })
}

async function withWriteDb(libraryPath, fn) {
  return enqueueLibraryWrite(libraryPath, () => withDb(libraryPath, fn))
}

async function safeExec(db, sql, params) {
  try {
    if (params) {
      await db.execute(sql, params)
      return
    }
    await db.execute(sql)
  } catch {
    // no-op
  }
}

async function withTransaction(db, fn) {
  await db.execute('BEGIN IMMEDIATE')
  let inTransaction = true
  try {
    const result = await fn()
    await db.execute('COMMIT')
    inTransaction = false
    return result
  } catch (error) {
    if (inTransaction) {
      try {
        await db.execute('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
    }
    throw error
  }
}

async function openDb(libraryPath) {
  if (!isTauri() || !libraryPath) return null
  if (dbCache.has(libraryPath)) return dbCache.get(libraryPath)
  const dbPath = await join(libraryPath, 'library.db')
  try {
    const db = await Database.load(`sqlite:${dbPath}`)
    await safeExec(db, 'PRAGMA journal_mode=WAL')
    await safeExec(db, 'PRAGMA synchronous=NORMAL')
    await safeExec(db, 'PRAGMA temp_store=MEMORY')
    await safeExec(db, 'PRAGMA foreign_keys=ON')
    await safeExec(db, 'PRAGMA busy_timeout=5000')
    dbCache.set(libraryPath, db)
    return db
  } catch {
    return null
  }
}

async function migrateDb(db) {
  const versionRow = await db.select('PRAGMA user_version')
  let currentVersion = Array.isArray(versionRow) ? versionRow[0]?.user_version : 0
  if (currentVersion >= DB_VERSION) {
    await ensureDbIndexes(db)
    await ensureSettingsDefaults(db)
    return
  }

  await withTransaction(db, async () => {
    if (currentVersion === 0) {
      await createAllTables(db)
      currentVersion = DB_VERSION
    } else {
      if (currentVersion < 2) {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
          )
        `)
        currentVersion = 2
      }

      if (currentVersion < 3) {
        await addColumnIfMissing(db, 'annotations', 'title TEXT')
        await addColumnIfMissing(db, 'annotations', 'color TEXT')
        await addColumnIfMissing(db, 'annotations', 'source TEXT')
        await addColumnIfMissing(db, 'annotations', 'body_rich TEXT')
        await db.execute(`
          CREATE TABLE IF NOT EXISTS annotation_anchors (
            id TEXT PRIMARY KEY,
            annotation_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            kind TEXT,
            locator_json TEXT,
            text_snippet TEXT,
            page INTEGER,
            cfi TEXT,
            scroll_offset REAL,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS annotation_links (
            id TEXT PRIMARY KEY,
            from_annotation_id TEXT NOT NULL,
            to_annotation_id TEXT NOT NULL,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS reader_state (
            item_id TEXT PRIMARY KEY,
            last_location_json TEXT,
            last_page INTEGER,
            progress REAL,
            font_size INTEGER,
            layout TEXT,
            mode TEXT,
            updated_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS reading_sessions (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            started_at TEXT,
            ended_at TEXT,
            duration_sec INTEGER,
            mode TEXT,
            device TEXT
          )
        `)
        currentVersion = 3
      }

      if (currentVersion < 4) {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ingest_jobs (
            id TEXT PRIMARY KEY,
            item_id TEXT,
            source_path TEXT,
            target_path TEXT,
            force_ocr INTEGER,
            status TEXT,
            progress REAL,
            error TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS text_chunks (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            source TEXT,
            chunk_index INTEGER,
            text TEXT,
            token_count INTEGER,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ocr_pages (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            page_index INTEGER,
            confidence REAL,
            text TEXT,
            created_at TEXT
          )
        `)
        await addColumnIfMissing(db, 'files', 'mime TEXT')
        await addColumnIfMissing(db, 'files', 'page_count INTEGER')
        await addColumnIfMissing(db, 'files', 'scanned INTEGER')
        currentVersion = 4
      }

      if (currentVersion < 5) {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS change_log (
            id TEXT PRIMARY KEY,
            table_name TEXT,
            row_id TEXT,
            operation TEXT,
            before_json TEXT,
            after_json TEXT,
            timestamp TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS snapshots (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            note TEXT,
            snapshot_path TEXT,
            hash TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS integrity_checks (
            id TEXT PRIMARY KEY,
            type TEXT,
            status TEXT,
            details_json TEXT,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS change_log_control (
            id INTEGER PRIMARY KEY,
            enabled INTEGER
          )
        `)
        await db.execute(`INSERT OR IGNORE INTO change_log_control (id, enabled) VALUES (1, 1)`)
        await createChangeLogTriggers(db)
        currentVersion = 5
      }

      if (currentVersion < 6) {
        await addColumnIfMissing(db, 'ingest_jobs', 'force_ocr INTEGER')
        currentVersion = 6
      }

      if (currentVersion < 7) {
        await addColumnIfMissing(db, 'ingest_jobs', 'attempt_count INTEGER NOT NULL DEFAULT 0')
        await addColumnIfMissing(db, 'ingest_jobs', 'last_error_code TEXT')
        currentVersion = 7
      }
    }

    await ensureDbIndexes(db)
    await ensureSettingsDefaults(db)
    await db.execute(`PRAGMA user_version = ${currentVersion}`)
    await db.execute('DELETE FROM text_chunks WHERE item_id NOT IN (SELECT id FROM items)')
    await db.execute('DELETE FROM ocr_pages WHERE item_id NOT IN (SELECT id FROM items)')
    await db.execute('DELETE FROM annotation_anchors WHERE item_id NOT IN (SELECT id FROM items)')
    await db.execute('DELETE FROM annotation_links WHERE from_annotation_id NOT IN (SELECT id FROM annotations)')
    await db.execute('UPDATE change_log_control SET enabled = 1 WHERE id = 1')
  })
}

async function createAllTables(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT,
      author TEXT,
      isbn TEXT,
      published_date TEXT,
      rating REAL,
      cover_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      meta_json TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shelves (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      sort_order INTEGER
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS item_shelves (
      item_id TEXT NOT NULL,
      shelf_id TEXT NOT NULL,
      PRIMARY KEY (item_id, shelf_id)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (item_id, tag_id)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      path TEXT,
      hash TEXT,
      size INTEGER,
      mtime INTEGER,
      mime TEXT,
      page_count INTEGER,
      scanned INTEGER,
      status TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reading_state (
      item_id TEXT PRIMARY KEY,
      last_opened TEXT,
      progress REAL,
      last_page INTEGER,
      page_count INTEGER,
      last_location TEXT,
      mode TEXT,
      layout TEXT,
      font_size INTEGER
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reader_state (
      item_id TEXT PRIMARY KEY,
      last_location_json TEXT,
      last_page INTEGER,
      progress REAL,
      font_size INTEGER,
      layout TEXT,
      mode TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      duration_sec INTEGER,
      mode TEXT,
      device TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      type TEXT NOT NULL,
      body TEXT,
      locator_json TEXT,
      title TEXT,
      color TEXT,
      source TEXT,
      body_rich TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS annotation_anchors (
      id TEXT PRIMARY KEY,
      annotation_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      kind TEXT,
      locator_json TEXT,
      text_snippet TEXT,
      page INTEGER,
      cfi TEXT,
      scroll_offset REAL,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS annotation_links (
      id TEXT PRIMARY KEY,
      from_annotation_id TEXT NOT NULL,
      to_annotation_id TEXT NOT NULL,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ingest_jobs (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      source_path TEXT,
      target_path TEXT,
      force_ocr INTEGER,
      status TEXT,
      progress REAL,
      error TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error_code TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS text_chunks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      source TEXT,
      chunk_index INTEGER,
      text TEXT,
      token_count INTEGER,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ocr_pages (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      page_index INTEGER,
      confidence REAL,
      text TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS spine_library (
      isbn TEXT PRIMARY KEY,
      spine_image TEXT,
      crop_json TEXT,
      title TEXT,
      author TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS change_log (
      id TEXT PRIMARY KEY,
      table_name TEXT,
      row_id TEXT,
      operation TEXT,
      before_json TEXT,
      after_json TEXT,
      timestamp TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      created_at TEXT,
      note TEXT,
      snapshot_path TEXT,
      hash TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS integrity_checks (
      id TEXT PRIMARY KEY,
      type TEXT,
      status TEXT,
      details_json TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS change_log_control (
      id INTEGER PRIMARY KEY,
      enabled INTEGER
    )
  `)
  await db.execute(`INSERT OR IGNORE INTO change_log_control (id, enabled) VALUES (1, 1)`)
  await createChangeLogTriggers(db)
  await db.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_docs USING fts5(
      item_id,
      kind,
      title,
      body,
      updated_at
    )
  `)
}

async function ensureDbIndexes(db) {
  const duplicatePaths = await db.select(`
    SELECT path
    FROM files
    WHERE path IS NOT NULL AND path <> ''
    GROUP BY path
    HAVING COUNT(*) > 1
  `)

  for (const row of duplicatePaths || []) {
    const path = row.path
    const matches = await db.select(
      'SELECT id FROM files WHERE path = ? ORDER BY mtime DESC, id DESC',
      [path]
    )
    if (!matches || matches.length <= 1) continue
    for (let i = 1; i < matches.length; i += 1) {
      await db.execute(
        'UPDATE files SET path = NULL, status = CASE WHEN status IS NULL OR status = "" THEN ? ELSE status END WHERE id = ?',
        ['duplicate', matches[i].id]
      )
    }
  }

  await db.execute('CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status_updated ON ingest_jobs(status, updated_at DESC)')
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_files_path_unique ON files(path) WHERE path IS NOT NULL AND path <> ""')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_annotations_item_created ON annotations(item_id, created_at DESC)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_reader_state_updated ON reader_state(updated_at DESC)')
}

async function ensureSettingsDefaults(db) {
  const now = new Date().toISOString()
  const defaults = [
    ['pdf_render_memory_mb', '512'],
    ['pdf_virtual_overscan_pages', '8'],
    ['ingest_job_retention_days', '14'],
  ]
  for (const [key, value] of defaults) {
    await db.execute(
      'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, now]
    )
  }
}

async function addColumnIfMissing(db, table, columnDef) {
  const [columnName] = columnDef.split(/\s+/)
  const columns = await db.select(`PRAGMA table_info(${table})`)
  const exists = columns?.some((col) => col.name === columnName)
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`)
  }
}

async function createChangeLogTriggers(db) {
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_items_insert
    AFTER INSERT ON items
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'insert', NULL, NEW.meta_json, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_items_update
    AFTER UPDATE ON items
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'update', OLD.meta_json, NEW.meta_json, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_items_delete
    AFTER DELETE ON items
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'items', OLD.id, 'delete', OLD.meta_json, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_annotations_update
    AFTER INSERT ON annotations
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'annotations', NEW.id, 'insert', NULL, NEW.body, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_files_update
    AFTER UPDATE ON files
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'files', NEW.id, 'update', OLD.status, NEW.status, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_reader_state_update
    AFTER UPDATE ON reader_state
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'reader_state', NEW.item_id, 'update', OLD.last_location_json, NEW.last_location_json, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_settings_update
    AFTER UPDATE ON settings
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'settings', NEW.key, 'update', OLD.value, NEW.value, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
}

function parseMetaJson(raw) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function buildAnnotationsMap(rows) {
  const map = new Map()
  rows.forEach((row) => {
    if (!map.has(row.item_id)) map.set(row.item_id, [])
    map.get(row.item_id).push(row)
  })
  return map
}

function hydrateBookAnnotations(item, rows) {
  const notes = []
  const quotes = []
  const reflections = []
  rows.forEach((row) => {
    if (row.type === 'note' && row.body) notes.push(row.body)
    if (row.type === 'quote' && row.body) quotes.push(row.body)
    if (row.type === 'reflection' && row.body) {
      reflections.push({
        date: row.created_at || null,
        text: row.body,
      })
    }
  })
  return {
    ...item,
    notes: notes.join('\n\n'),
    quotes,
    reflections,
  }
}

function hydrateDocumentAnnotations(item, rows) {
  const notes = []
  const highlights = []
  rows.forEach((row) => {
    if (!row.body) return
    const locator = parseMetaJson(row.locator_json)
    const entry = {
      id: row.id,
      text: row.body,
      title: row.title || null,
      color: row.color || null,
      bodyRich: row.body_rich ? parseMetaJson(row.body_rich) : null,
      page: locator.page ?? null,
      cfi: locator.cfi ?? null,
      scrollOffset: locator.scrollOffset ?? null,
      anchorId: locator.anchorId ?? null,
      createdAt: row.created_at || null,
    }
    if (row.type === 'highlight') {
      highlights.push(entry)
    } else {
      notes.push(entry)
    }
  })
  return {
    ...item,
    annotations: {
      notes,
      highlights,
    },
  }
}

export async function loadLibraryStateFromDb(libraryPath) {
  return withDb(libraryPath, async (db) => {
    const itemCountRows = await db.select('SELECT COUNT(*) as count FROM items')
    const itemCount = itemCountRows?.[0]?.count || 0
    if (itemCount === 0) return null

    const itemsRows = await db.select('SELECT * FROM items')
    const shelvesRows = await db.select('SELECT * FROM shelves ORDER BY sort_order ASC')
    const itemShelvesRows = await db.select('SELECT * FROM item_shelves')
    const tagsRows = await db.select('SELECT * FROM tags')
    const itemTagsRows = await db.select('SELECT * FROM item_tags')
    const readingRows = await db.select('SELECT * FROM reading_state')
    const readerRows = await db.select('SELECT * FROM reader_state')
    const fileRows = await db.select('SELECT * FROM files')
    const annotationRows = await db.select('SELECT * FROM annotations')
    const spineRows = await db.select('SELECT * FROM spine_library')
    const settingsRows = await db.select('SELECT * FROM settings')

  const shelfMap = new Map(shelvesRows.map((row) => [row.id, row]))
  const itemShelvesMap = new Map()
  itemShelvesRows.forEach((row) => {
    if (!itemShelvesMap.has(row.item_id)) itemShelvesMap.set(row.item_id, [])
    itemShelvesMap.get(row.item_id).push(row.shelf_id)
  })

  const tagMap = new Map(tagsRows.map((row) => [row.id, row.name]))
  const itemTagsMap = new Map()
  itemTagsRows.forEach((row) => {
    if (!itemTagsMap.has(row.item_id)) itemTagsMap.set(row.item_id, [])
    itemTagsMap.get(row.item_id).push(tagMap.get(row.tag_id))
  })

  const readingMap = new Map(readingRows.map((row) => [row.item_id, row]))
  const readerMap = new Map(readerRows.map((row) => [row.item_id, row]))
  const fileMap = new Map(fileRows.map((row) => [row.item_id, row]))
  const annotationMap = buildAnnotationsMap(annotationRows)

  const spineLibrary = {}
  spineRows.forEach((row) => {
    spineLibrary[row.isbn] = {
      isbn: row.isbn,
      spineImage: row.spine_image,
      crop: parseMetaJson(row.crop_json),
      title: row.title || null,
      author: row.author || null,
      updatedAt: row.updated_at || null,
    }
  })

  let userSettings = {}
  const settingsMap = new Map()
  settingsRows.forEach((row) => {
    settingsMap.set(row.key, row.value)
    if (row.key === 'user') {
      userSettings = parseMetaJson(row.value)
    }
  })
  if (settingsMap.has('reader_max_memory_mb')) {
    userSettings.readerMaxMemoryMb = Number(settingsMap.get('reader_max_memory_mb')) || userSettings.readerMaxMemoryMb
  }
  if (settingsMap.has('reader_cache_pages')) {
    userSettings.readerCachePages = Number(settingsMap.get('reader_cache_pages')) || userSettings.readerCachePages
  }
  if (settingsMap.has('semantic_search_enabled')) {
    userSettings.semanticSearchEnabled = settingsMap.get('semantic_search_enabled') === 'true'
  }
  if (settingsMap.has('auto_snapshot_interval_hours')) {
    userSettings.autoSnapshotIntervalHours = Number(settingsMap.get('auto_snapshot_interval_hours')) || userSettings.autoSnapshotIntervalHours
  }
  if (settingsMap.has('backup_verify_enabled')) {
    userSettings.backupVerifyEnabled = settingsMap.get('backup_verify_enabled') === 'true'
  }
  if (settingsMap.has('pdf_render_memory_mb')) {
    userSettings.pdfRenderMemoryMb = Number(settingsMap.get('pdf_render_memory_mb')) || userSettings.pdfRenderMemoryMb
  }
  if (settingsMap.has('pdf_virtual_overscan_pages')) {
    userSettings.pdfVirtualOverscanPages = Number(settingsMap.get('pdf_virtual_overscan_pages')) || userSettings.pdfVirtualOverscanPages
  }
  if (settingsMap.has('ingest_job_retention_days')) {
    userSettings.ingestJobRetentionDays = Number(settingsMap.get('ingest_job_retention_days')) || userSettings.ingestJobRetentionDays
  }

  const items = itemsRows.map((row) => {
    const meta = parseMetaJson(row.meta_json)
    const tags = itemTagsMap.get(row.id)?.filter(Boolean) || []
    const shelves = itemShelvesMap.get(row.id) || []
    const reading = readerMap.get(row.id) || readingMap.get(row.id)
    const file = fileMap.get(row.id)

    const base = {
      id: row.id,
      kind: row.kind,
      title: row.title || 'Untitled',
      author: row.author || (row.kind === 'book' ? 'Unknown Author' : null),
      isbn: row.isbn || null,
      publishedDate: row.published_date || null,
      rating: typeof row.rating === 'number' ? row.rating : 0,
      coverUrl: row.cover_url || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
      tags,
      shelves,
    }

    if (row.kind === 'book') {
      const item = normalizeBookItem({
        ...base,
        bookMeta: {
          ...meta,
          isbn: row.isbn || meta.isbn || null,
          publishedDate: row.published_date || meta.publishedDate || null,
        },
      })
      const annotations = annotationMap.get(row.id) || []
      return hydrateBookAnnotations(item, annotations)
    }

    const docMeta = {
      ...meta,
      filePath: meta.filePath || file?.path || null,
      fileName: meta.fileName || null,
      originalName: meta.originalName || null,
      type: meta.type || (row.kind === 'article' ? 'article' : 'file'),
      publishedDate: meta.publishedDate || row.published_date || null,
      originalUrl: meta.originalUrl || null,
      ingestSource: meta.ingestSource || null,
      mime: meta.mime || file?.mime || null,
      pageCount: meta.pageCount || file?.page_count || null,
      scanned: typeof meta.scanned === 'boolean' ? meta.scanned : Boolean(file?.scanned),
      ocrConfidence: typeof meta.ocrConfidence === 'number' ? meta.ocrConfidence : null,
      fileHash: meta.fileHash || file?.hash || null,
      fileSize: meta.fileSize || file?.size || null,
      fileMtime: meta.fileMtime || file?.mtime || null,
      fileStatus: meta.fileStatus || file?.status || null,
    }

    const item = normalizeDocumentItem({
      ...base,
      kind: row.kind,
      docMeta,
      reading: reading
        ? {
            lastOpened: reading.last_opened || null,
            progressPercent: reading.progress || null,
            lastPage: reading.last_page || null,
            pageCount: reading.page_count || null,
            lastLocation: reading.last_location || null,
            lastLocationJson: reading.last_location_json ? parseMetaJson(reading.last_location_json) : null,
            mode: reading.mode || null,
            layout: reading.layout || null,
            fontSize: reading.font_size || null,
          }
        : {},
    })

    const annotations = annotationMap.get(row.id) || []
    return hydrateDocumentAnnotations(item, annotations)
  })

    return {
      version: DB_VERSION,
      items,
      shelves: shelvesRows.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        order: row.sort_order,
      })),
      user: userSettings,
      spineLibrary,
    }
  })
}

function buildBookAnnotations(item) {
  const annotations = []
  if (item.notes) {
    annotations.push({
      id: `${item.id}-note`,
      type: 'note',
      body: item.notes,
      title: null,
      color: null,
      source: 'book',
      bodyRich: null,
      createdAt: item.updatedAt || new Date().toISOString(),
    })
  }
  ;(item.quotes || []).forEach((quote, index) => {
    annotations.push({
      id: `${item.id}-quote-${index}`,
      type: 'quote',
      body: typeof quote === 'string' ? quote : quote?.text || '',
      title: null,
      color: null,
      source: 'book',
      bodyRich: null,
      createdAt: item.updatedAt || new Date().toISOString(),
    })
  })
  ;(item.reflections || []).forEach((reflection, index) => {
    annotations.push({
      id: `${item.id}-reflection-${index}`,
      type: 'reflection',
      body: reflection.text,
      title: null,
      color: null,
      source: 'book',
      bodyRich: null,
      createdAt: reflection.date || item.updatedAt || new Date().toISOString(),
    })
  })
  return annotations
}

function buildDocumentAnnotations(item) {
  const annotations = []
  ;(item.annotations?.notes || []).forEach((note, index) => {
    annotations.push({
      id: note.id || `${item.id}-note-${index}`,
      type: 'note',
      body: note.text,
      title: note.title || null,
      color: note.color || null,
      source: item.kind || 'document',
      bodyRich: note.bodyRich || null,
      locator: {
        page: note.page || null,
        cfi: note.cfi || null,
        scrollOffset: note.scrollOffset ?? null,
        anchorId: note.anchorId ?? null,
      },
      createdAt: note.createdAt || new Date().toISOString(),
    })
  })
  ;(item.annotations?.highlights || []).forEach((note, index) => {
    annotations.push({
      id: note.id || `${item.id}-highlight-${index}`,
      type: 'highlight',
      body: note.text,
      title: note.title || null,
      color: note.color || null,
      source: item.kind || 'document',
      bodyRich: note.bodyRich || null,
      locator: {
        page: note.page || null,
        cfi: note.cfi || null,
        scrollOffset: note.scrollOffset ?? null,
        anchorId: note.anchorId ?? null,
      },
      createdAt: note.createdAt || new Date().toISOString(),
    })
  })
  return annotations
}

function buildSearchText(item) {
  if (item.kind === 'book') {
    const chunks = [item.title, item.author, ...(item.tags || [])]
    if (item.notes) chunks.push(item.notes)
    if (item.quotes?.length) chunks.push(item.quotes.map((q) => typeof q === 'string' ? q : q?.text || '').join('\n'))
    return chunks.filter(Boolean).join('\n')
  }

  const meta = item.docMeta || {}
  const annotations = item.annotations || {}
  const notes = (annotations.notes || [])
    .map((note) => (note?.text ?? note))
    .filter(Boolean)
    .join('\n')
  const highlights = (annotations.highlights || [])
    .map((note) => (note?.text ?? note))
    .filter(Boolean)
    .join('\n')
  const tags = (item.tags || []).filter(Boolean).join('\n')
  return [item.title, item.author, tags, meta.searchText, notes, highlights]
    .filter(Boolean)
    .join('\n')
}

function buildAnnotationAnchors(item, annotations) {
  const anchors = []
  annotations.forEach((annotation) => {
    const locator = annotation.locator || {}
    const textSnippet = annotation.body
      ? String(annotation.body).slice(0, 180)
      : ''
    anchors.push({
      id: `${annotation.id}-anchor`,
      annotationId: annotation.id,
      itemId: item.id,
      kind: item.kind,
      locator,
      textSnippet,
      page: locator.page ?? null,
      cfi: locator.cfi ?? null,
      scrollOffset: locator.scrollOffset ?? null,
      createdAt: annotation.createdAt || new Date().toISOString(),
    })
  })
  return anchors
}

function buildAnnotationLinks(anchors) {
  const links = []
  const byItem = new Map()
  anchors.forEach((anchor) => {
    if (!byItem.has(anchor.itemId)) byItem.set(anchor.itemId, [])
    byItem.get(anchor.itemId).push(anchor)
  })

  const tokenize = (text) => (
    (text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3)
  )

  byItem.forEach((itemAnchors) => {
    const tokenSets = itemAnchors.map((anchor) => new Set(tokenize(anchor.textSnippet)))
    for (let i = 0; i < itemAnchors.length; i += 1) {
      for (let j = i + 1; j < itemAnchors.length; j += 1) {
        const setA = tokenSets[i]
        const setB = tokenSets[j]
        if (setA.size === 0 || setB.size === 0) continue
        let overlap = 0
        setA.forEach((token) => {
          if (setB.has(token)) overlap += 1
        })
        if (overlap >= 3) {
          const createdAt = new Date().toISOString()
          links.push({
            id: `link-${itemAnchors[i].id}-${itemAnchors[j].id}`,
            from: itemAnchors[i].annotationId,
            to: itemAnchors[j].annotationId,
            createdAt,
          })
          links.push({
            id: `link-${itemAnchors[j].id}-${itemAnchors[i].id}`,
            from: itemAnchors[j].annotationId,
            to: itemAnchors[i].annotationId,
            createdAt,
          })
        }
      }
    }
  })

  return links
}

export async function saveLibraryStateToDb(libraryPath, state) {
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      await db.execute('UPDATE change_log_control SET enabled = 0 WHERE id = 1')
      await db.execute('DELETE FROM items')
      await db.execute('DELETE FROM shelves')
      await db.execute('DELETE FROM item_shelves')
      await db.execute('DELETE FROM tags')
      await db.execute('DELETE FROM item_tags')
      await db.execute('DELETE FROM files')
      await db.execute('DELETE FROM reading_state')
      await db.execute('DELETE FROM reader_state')
      await db.execute('DELETE FROM annotations')
      await db.execute('DELETE FROM annotation_anchors')
      await db.execute('DELETE FROM annotation_links')
      await db.execute('DELETE FROM spine_library')
      await db.execute('DELETE FROM search_docs')
      await db.execute('DELETE FROM settings')

      for (const shelf of state.shelves || []) {
        await db.execute(
          'INSERT INTO shelves (id, name, color, sort_order) VALUES (?, ?, ?, ?)',
          [shelf.id, shelf.name, shelf.color, shelf.order || 0]
        )
      }

      const tagIdMap = new Map()
      let tagIndex = 0
      const usedFilePaths = new Set()
      const ensureTagId = async (tag) => {
        if (!tagIdMap.has(tag)) {
          const id = `tag-${tagIndex += 1}`
          tagIdMap.set(tag, id)
          await db.execute('INSERT INTO tags (id, name) VALUES (?, ?)', [id, tag])
        }
        return tagIdMap.get(tag)
      }

      for (const [isbn, entry] of Object.entries(state.spineLibrary || {})) {
        await db.execute(
          'INSERT INTO spine_library (isbn, spine_image, crop_json, title, author, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            isbn,
            entry.spineImage || null,
            entry.crop ? JSON.stringify(entry.crop) : null,
            entry.title || null,
            entry.author || null,
            entry.updatedAt || null,
          ]
        )
      }

      const settingsTimestamp = new Date().toISOString()
      const userSettings = state.user || {}
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['user', JSON.stringify(userSettings), settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['reader_max_memory_mb', String(userSettings.readerMaxMemoryMb ?? 800), settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['reader_cache_pages', String(userSettings.readerCachePages ?? 8), settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['semantic_search_enabled', userSettings.semanticSearchEnabled ? 'true' : 'false', settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['auto_snapshot_interval_hours', String(userSettings.autoSnapshotIntervalHours ?? 24), settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['backup_verify_enabled', userSettings.backupVerifyEnabled ? 'true' : 'false', settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['pdf_render_memory_mb', String(userSettings.pdfRenderMemoryMb ?? userSettings.readerMaxMemoryMb ?? 512), settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['pdf_virtual_overscan_pages', String(userSettings.pdfVirtualOverscanPages ?? 8), settingsTimestamp]
      )
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['ingest_job_retention_days', String(userSettings.ingestJobRetentionDays ?? 14), settingsTimestamp]
      )

      for (const item of state.items || []) {
        const kind = item.kind || (item.docMeta?.type === 'article' ? 'article' : 'document')
        const meta = item.bookMeta || item.docMeta || {}
        const publishedDate = item.publishedDate || meta.publishedDate || null

      await db.execute(
        `INSERT INTO items (id, kind, title, author, isbn, published_date, rating, cover_url, created_at, updated_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          item.id,
          kind,
          item.title || null,
          item.author || null,
          item.isbn || meta.isbn || null,
          publishedDate,
          item.rating || 0,
          item.coverUrl || null,
          item.createdAt || null,
          item.updatedAt || null,
          JSON.stringify(meta),
        ]
      )

      for (const shelfId of item.shelves || []) {
        await db.execute('INSERT INTO item_shelves (item_id, shelf_id) VALUES (?, ?)', [item.id, shelfId])
      }

      for (const tag of item.tags || []) {
        const tagId = await ensureTagId(tag)
        await db.execute('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)', [item.id, tagId])
      }

      if (kind === 'document' || kind === 'article') {
        const reading = item.reading || {}
        await db.execute(
          `INSERT INTO reading_state
          (item_id, last_opened, progress, last_page, page_count, last_location, mode, layout, font_size)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            reading.lastOpened || null,
            reading.progressPercent ?? null,
            reading.lastPage ?? null,
            reading.pageCount ?? null,
            reading.lastLocation || null,
            reading.mode || null,
            reading.layout || null,
            reading.fontSize ?? null,
          ]
        )
        await db.execute(
          `INSERT INTO reader_state
          (item_id, last_location_json, last_page, progress, font_size, layout, mode, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            reading.lastLocationJson ? JSON.stringify(reading.lastLocationJson) : null,
            reading.lastPage ?? null,
            reading.progressPercent ?? null,
            reading.fontSize ?? null,
            reading.layout || null,
            reading.mode || null,
            item.updatedAt || null,
          ]
        )

        const fileId = `${item.id}-file`
        const docMeta = item.docMeta || {}
        let filePath = docMeta.filePath || null
        let fileStatus = docMeta.fileStatus || null
        if (filePath) {
          const pathKey = String(filePath).toLowerCase()
          if (usedFilePaths.has(pathKey)) {
            filePath = null
            fileStatus = fileStatus || 'duplicate'
          } else {
            usedFilePaths.add(pathKey)
          }
        }
        await db.execute(
          `INSERT INTO files (id, item_id, path, hash, size, mtime, mime, page_count, scanned, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            item.id,
            filePath,
            docMeta.fileHash || null,
            docMeta.fileSize || null,
            docMeta.fileMtime || null,
            docMeta.mime || null,
            docMeta.pageCount ?? null,
            docMeta.scanned ? 1 : 0,
            fileStatus,
          ]
        )
      }

      const annotations = kind === 'book'
        ? buildBookAnnotations(item)
        : buildDocumentAnnotations(item)
      const anchors = buildAnnotationAnchors(item, annotations)
      const links = buildAnnotationLinks(anchors)

      for (const annotation of annotations) {
        await db.execute(
          `INSERT INTO annotations (id, item_id, type, body, locator_json, title, color, source, body_rich, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            annotation.id,
            item.id,
            annotation.type,
            annotation.body || null,
            annotation.locator ? JSON.stringify(annotation.locator) : null,
            annotation.title || null,
            annotation.color || null,
            annotation.source || null,
            annotation.bodyRich ? JSON.stringify(annotation.bodyRich) : null,
            annotation.createdAt || null,
          ]
        )
      }

      for (const anchor of anchors) {
        await db.execute(
          `INSERT INTO annotation_anchors
          (id, annotation_id, item_id, kind, locator_json, text_snippet, page, cfi, scroll_offset, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            anchor.id,
            anchor.annotationId,
            anchor.itemId,
            anchor.kind,
            anchor.locator ? JSON.stringify(anchor.locator) : null,
            anchor.textSnippet || null,
            anchor.page ?? null,
            anchor.cfi ?? null,
            anchor.scrollOffset ?? null,
            anchor.createdAt || null,
          ]
        )
      }

      for (const link of links) {
        await db.execute(
          `INSERT INTO annotation_links (id, from_annotation_id, to_annotation_id, created_at)
           VALUES (?, ?, ?, ?)`,
          [
            link.id,
            link.from,
            link.to,
            link.createdAt || null,
          ]
        )
      }

      await db.execute(
        'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
        [
          item.id,
          kind,
          item.title || '',
          buildSearchText(item),
          item.updatedAt || null,
        ]
      )
      }

      await db.execute('UPDATE change_log_control SET enabled = 1 WHERE id = 1')
    })
  })
}

export async function searchLibrary(libraryPath, query) {
  try {
    const results = await withDb(libraryPath, async (db) => {
      const trimmed = query?.trim()
      if (!trimmed) return []

      const ftsExpression = toFtsExpression(trimmed)
      if (ftsExpression) {
        try {
          const ftsRows = await db.select(
            `SELECT item_id, kind, title, snippet(search_docs, 3, '<mark>', '</mark>', '…', 12) AS snippet
             FROM search_docs
             WHERE search_docs MATCH ?
             ORDER BY rank
             LIMIT 25`,
            [ftsExpression]
          )
          if (Array.isArray(ftsRows) && ftsRows.length > 0) {
            return ftsRows.map((row) => ({
              itemId: row.item_id,
              kind: row.kind,
              title: row.title,
              snippet: row.snippet,
            }))
          }
        } catch {
          // fall through to LIKE fallback
        }
      }

      const like = `%${escapeLikeValue(trimmed)}%`
      const rows = await db.select(
        `SELECT i.id AS item_id, i.kind AS kind, i.title AS title
         FROM items i
         LEFT JOIN search_docs sd ON sd.item_id = i.id
         WHERE lower(i.title) LIKE ? ESCAPE '\\'
            OR lower(COALESCE(i.author, '')) LIKE ? ESCAPE '\\'
            OR lower(COALESCE(sd.body, '')) LIKE ? ESCAPE '\\'
         ORDER BY COALESCE(i.updated_at, i.created_at) DESC
         LIMIT 25`,
        [like, like, like]
      )

      return (rows || []).map((row) => ({
        itemId: row.item_id,
        kind: row.kind,
        title: row.title,
        snippet: null,
      }))
    })
    return results || []
  } catch {
    return []
  }
}

export async function rescanLibraryFiles(libraryPath) {
  return withWriteDb(libraryPath, async (db) => {
    const rows = await db.select('SELECT * FROM files')
    if (!rows.length) return

    const hashMap = new Map()
    let missingCount = 0
    let okCount = 0

    for (const row of rows) {
      let status = 'ok'
      try {
        if (!row.path) {
          status = 'missing'
        } else {
          const present = await exists(row.path)
          if (!present) status = 'missing'
        }
      } catch {
        status = 'missing'
      }
      await db.execute('UPDATE files SET status = ? WHERE id = ?', [status, row.id])
      if (status === 'ok' && row.hash) {
        okCount += 1
        if (!hashMap.has(row.hash)) hashMap.set(row.hash, [])
        hashMap.get(row.hash).push(row.id)
      } else if (status === 'missing') {
        missingCount += 1
      }
    }

    let duplicateCount = 0
    for (const [hash, ids] of hashMap.entries()) {
      if (ids.length <= 1) continue
      duplicateCount += ids.length
      for (const id of ids) {
        await db.execute('UPDATE files SET status = ? WHERE id = ?', ['duplicate', id])
      }
    }

    return {
      total: rows.length,
      ok: okCount,
      missing: missingCount,
      duplicate: duplicateCount,
    }
  })
}

export async function updateSearchDoc(libraryPath, { itemId, kind, title, body, updatedAt }) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute('DELETE FROM search_docs WHERE item_id = ?', [itemId])
    await db.execute(
      'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
      [itemId, kind || 'document', title || '', body || '', updatedAt || null]
    )
  })
}

export async function enqueueIngestJobUnique(libraryPath, job) {
  return withWriteDb(libraryPath, async (db) => {
    const id = job.id || `job-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`
    const now = new Date().toISOString()
    const normalizedTargetPath = job.targetPath || job.sourcePath || null

    if (job.itemId) {
      const existing = await db.select(
        'SELECT id, status, force_ocr FROM ingest_jobs WHERE item_id = ? AND status IN (?, ?) ORDER BY created_at DESC LIMIT 1',
        [job.itemId, 'queued', 'processing']
      )
      if (existing?.length) {
        if (job.forceOcr && !existing[0].force_ocr) {
          await db.execute('UPDATE ingest_jobs SET force_ocr = 1 WHERE id = ?', [existing[0].id])
        }
        return existing[0].id
      }
    }
    if (!job.itemId && normalizedTargetPath) {
      const existing = await db.select(
        'SELECT id, status, force_ocr FROM ingest_jobs WHERE target_path = ? AND status IN (?, ?) ORDER BY created_at DESC LIMIT 1',
        [normalizedTargetPath, 'queued', 'processing']
      )
      if (existing?.length) {
        if (job.forceOcr && !existing[0].force_ocr) {
          await db.execute('UPDATE ingest_jobs SET force_ocr = 1 WHERE id = ?', [existing[0].id])
        }
        return existing[0].id
      }
    }
    await db.execute(
      `INSERT INTO ingest_jobs (id, item_id, source_path, target_path, force_ocr, status, progress, error, attempt_count, last_error_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        job.itemId || null,
        job.sourcePath || null,
        normalizedTargetPath,
        job.forceOcr ? 1 : 0,
        job.status || 'queued',
        job.progress ?? 0,
        job.error || null,
        job.attemptCount ?? 0,
        job.lastErrorCode || null,
        now,
        now,
      ]
    )
    return id
  })
}

export async function enqueueIngestJob(libraryPath, job) {
  return enqueueIngestJobUnique(libraryPath, job)
}

export async function listIngestJobsPaged(libraryPath, { statusSet = [], limit = 100, cursor = null } = {}) {
  const results = await withDb(libraryPath, async (db) => {
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100))
    const where = []
    const values = []

    if (Array.isArray(statusSet) && statusSet.length > 0) {
      const placeholders = statusSet.map(() => '?').join(', ')
      where.push(`status IN (${placeholders})`)
      values.push(...statusSet)
    }
    if (cursor) {
      where.push('COALESCE(updated_at, created_at) < ?')
      values.push(cursor)
    }

    const sql = `
      SELECT *
      FROM ingest_jobs
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT ?
    `
    const rows = await db.select(sql, [...values, safeLimit + 1])
    const list = rows || []
    const hasMore = list.length > safeLimit
    const page = hasMore ? list.slice(0, safeLimit) : list
    const last = page.length ? page[page.length - 1] : null
    return {
      rows: page,
      nextCursor: hasMore ? (last?.updated_at || last?.created_at || null) : null,
    }
  })
  return results || { rows: [], nextCursor: null }
}

export async function getIngestJobs(libraryPath, status) {
  const statusSet = status ? [status] : []
  const page = await listIngestJobsPaged(libraryPath, { statusSet, limit: 500 })
  return page.rows || []
}

function mapQueuedRowToDocument(row) {
  const meta = parseMetaJson(row.item_meta_json)
  const kind = row.item_kind || null
  const type = meta.type
    || (kind === 'article' ? 'article' : (kind === 'document' ? 'document' : null))
    || 'document'
  return {
    id: row.item_id || null,
    title: row.item_title || meta.title || null,
    type,
    filePath: row.target_path || row.source_path || meta.filePath || row.file_path || null,
    mime: meta.mime || row.file_mime || null,
    pageCount: meta.pageCount ?? null,
    fileHash: meta.fileHash || null,
    fileSize: meta.fileSize ?? null,
    fileMtime: meta.fileMtime ?? null,
  }
}

export async function claimNextIngestJob(libraryPath) {
  return withWriteDb(libraryPath, async (db) => {
    return withTransaction(db, async () => {
      const rows = await db.select(
        `SELECT j.*, i.kind AS item_kind, i.title AS item_title, i.meta_json AS item_meta_json,
                f.path AS file_path, f.mime AS file_mime
         FROM ingest_jobs j
         LEFT JOIN items i ON i.id = j.item_id
         LEFT JOIN files f ON f.item_id = j.item_id
         WHERE j.status = ?
         ORDER BY j.created_at ASC
         LIMIT 1`,
        ['queued']
      )
      const job = rows?.[0]
      if (!job) return null

      const now = new Date().toISOString()
      await db.execute(
        `UPDATE ingest_jobs
         SET status = ?, progress = ?, error = NULL, updated_at = ?, attempt_count = COALESCE(attempt_count, 0) + 1
         WHERE id = ?`,
        ['processing', 0, now, job.id]
      )

      return {
        ...job,
        status: 'processing',
        progress: 0,
        updated_at: now,
        attempt_count: (job.attempt_count || 0) + 1,
        doc: mapQueuedRowToDocument(job),
      }
    })
  })
}

export async function pruneIngestJobs(libraryPath, { retentionDays = 14, maxRows = 10000 } = {}) {
  return withWriteDb(libraryPath, async (db) => {
    const terminalStatuses = ['done', 'cancelled', 'orphaned', 'failed']
    const cutoff = new Date(Date.now() - Math.max(1, Number(retentionDays) || 14) * 24 * 60 * 60 * 1000).toISOString()

    const statusPlaceholders = terminalStatuses.map(() => '?').join(', ')
    const beforeRows = await db.select(
      `SELECT id FROM ingest_jobs WHERE status IN (${statusPlaceholders})`,
      terminalStatuses
    )

    await db.execute(
      `DELETE FROM ingest_jobs
       WHERE status IN (${statusPlaceholders})
         AND COALESCE(updated_at, created_at) < ?`,
      [...terminalStatuses, cutoff]
    )

    if (Number.isFinite(maxRows) && maxRows > 0) {
      const retained = await db.select(
        `SELECT id
         FROM ingest_jobs
         WHERE status IN (${statusPlaceholders})
         ORDER BY COALESCE(updated_at, created_at) DESC`,
        terminalStatuses
      )
      if ((retained || []).length > maxRows) {
        const toDelete = retained.slice(maxRows)
        for (const row of toDelete) {
          await db.execute('DELETE FROM ingest_jobs WHERE id = ?', [row.id])
        }
      }
    }

    const afterRows = await db.select(
      `SELECT id FROM ingest_jobs WHERE status IN (${statusPlaceholders})`,
      terminalStatuses
    )

    return {
      removed: Math.max(0, (beforeRows?.length || 0) - (afterRows?.length || 0)),
      retained: afterRows?.length || 0,
    }
  })
}

export async function updateIngestJob(libraryPath, id, updates = {}) {
  return withWriteDb(libraryPath, async (db) => {
    const now = new Date().toISOString()
    const fields = []
    const values = []
    if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'progress')) {
      fields.push('progress = ?')
      values.push(updates.progress)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'error')) {
      fields.push('error = ?')
      values.push(updates.error)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'lastErrorCode')) {
      fields.push('last_error_code = ?')
      values.push(updates.lastErrorCode)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'incrementAttempts') && updates.incrementAttempts) {
      fields.push('attempt_count = COALESCE(attempt_count, 0) + 1')
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'forceOcr')) {
      fields.push('force_ocr = ?')
      values.push(updates.forceOcr ? 1 : 0)
    }
    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)
    if (fields.length === 1) {
      return
    }
    await db.execute(
      `UPDATE ingest_jobs SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
  })
}

export async function saveTextChunks(libraryPath, { itemId, chunks = [], source = 'extract' }) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute('DELETE FROM text_chunks WHERE item_id = ?', [itemId])
    const now = new Date().toISOString()
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]
      await db.execute(
        `INSERT INTO text_chunks (id, item_id, source, chunk_index, text, token_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `chunk-${itemId}-${i}`,
          itemId,
          source,
          i,
          chunk.text,
          chunk.tokenCount ?? null,
          now,
        ]
      )
    }
  })
}

export async function saveOcrPages(libraryPath, { itemId, pages = [] }) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute('DELETE FROM ocr_pages WHERE item_id = ?', [itemId])
    const now = new Date().toISOString()
    for (let i = 0; i < pages.length; i += 1) {
      const page = pages[i]
      await db.execute(
        `INSERT INTO ocr_pages (id, item_id, page_index, confidence, text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `ocr-${itemId}-${i}`,
          itemId,
          page.pageIndex ?? i,
          page.confidence ?? null,
          page.text || '',
          now,
        ]
      )
    }
  })
}

export async function startReadingSession(libraryPath, { itemId, mode, device }) {
  return withWriteDb(libraryPath, async (db) => {
    const id = `session-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO reading_sessions (id, item_id, started_at, mode, device)
       VALUES (?, ?, ?, ?, ?)`,
      [id, itemId, now, mode || null, device || null]
    )
    return id
  })
}

export async function endReadingSession(libraryPath, sessionId) {
  return withWriteDb(libraryPath, async (db) => {
    const rows = await db.select('SELECT started_at FROM reading_sessions WHERE id = ?', [sessionId])
    const startedAt = rows?.[0]?.started_at
    const endedAt = new Date().toISOString()
    const duration = startedAt ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : null
    await db.execute(
      `UPDATE reading_sessions SET ended_at = ?, duration_sec = ? WHERE id = ?`,
      [endedAt, duration, sessionId]
    )
  })
}

export async function addSnapshotRecord(libraryPath, snapshot) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute(
      `INSERT INTO snapshots (id, created_at, note, snapshot_path, hash)
       VALUES (?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        snapshot.createdAt,
        snapshot.note || null,
        snapshot.path,
        snapshot.hash || null,
      ]
    )
  })
}

export async function listSnapshots(libraryPath) {
  const results = await withDb(libraryPath, async (db) => (
    db.select('SELECT * FROM snapshots ORDER BY created_at DESC')
  ))
  return results || []
}

export async function addIntegrityCheck(libraryPath, check) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute(
      `INSERT INTO integrity_checks (id, type, status, details_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        check.id,
        check.type,
        check.status,
        check.details ? JSON.stringify(check.details) : null,
        check.createdAt,
      ]
    )
  })
}

export async function listIntegrityChecks(libraryPath) {
  const results = await withDb(libraryPath, async (db) => (
    db.select('SELECT * FROM integrity_checks ORDER BY created_at DESC')
  ))
  return results || []
}

export async function runIntegrityCheck(libraryPath) {
  return withDb(libraryPath, async (db) => {
    const rows = await db.select('PRAGMA integrity_check')
    const status = rows?.[0]?.integrity_check === 'ok' ? 'ok' : 'error'
    return {
      status,
      details: rows,
    }
  })
}

export async function rebuildSearchIndex(libraryPath) {
  return withWriteDb(libraryPath, async (db) => {
    const items = await db.select('SELECT id, kind, title, meta_json, author FROM items')
    await db.execute('DELETE FROM search_docs')
    for (const row of items) {
      const meta = parseMetaJson(row.meta_json)
      const body = [row.title, row.author, meta.searchText].filter(Boolean).join('\n')
      await db.execute(
        'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
        [row.id, row.kind, row.title || '', body || '', null]
      )
    }
  })
}
